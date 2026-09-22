import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import { getDb } from "./firebase";
import { grokConfigured } from "./ai/grok";
import { geminiConfigured } from "./ai/gemini";

export const SESSION_COOKIE = "lifeos_session";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const DEEP_MODE_MONTHLY_LIMIT = Number(process.env.DEEP_MODE_MONTHLY_LIMIT ?? 300);
const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const MIN_PASSWORD_LENGTH = 8;
const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const RESET_MIN_INTERVAL_MS = 60 * 1000;

export type AiTier = "instant" | "smart" | "deep";

export interface AuthUser {
  id: string; // = normalized email; Firestore doc id in `users`
  email: string;
  displayName: string | null;
  deepModeEnabled: boolean;
  onboarded: boolean;
  aiTier: AiTier;
}

interface UserDoc {
  email: string;
  createdAt: string;
  displayName: string | null;
  passwordHash: string | null;
  deepModeEnabled: boolean;
  deepModeCallsThisPeriod: number;
  deepModePeriodStartedAt: string;
  onboardedAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  passwordResetRequestedAt?: string | null;
}

function allowlist(): Set<string> {
  const raw = [process.env.OWNER_EMAIL, ...(process.env.DEEP_MODE_ALLOWLIST ?? "").split(",")]
    .map((e) => e?.trim().toLowerCase())
    .filter((e): e is string => Boolean(e));
  return new Set(raw);
}

function usersCol() {
  return getDb().collection("users");
}

/** Free (Gemini-powered) extraction is on for everyone once configured; Grok is the metered, invite-only tier. */
export function computeAiTier(deepModeEnabled: boolean): AiTier {
  if (deepModeEnabled && grokConfigured()) return "deep";
  if (geminiConfigured()) return "smart";
  return "instant";
}

function rowToUser(id: string, row: UserDoc): AuthUser {
  const deepModeEnabled = Boolean(row.deepModeEnabled);
  return {
    id,
    email: row.email,
    displayName: row.displayName ?? null,
    deepModeEnabled,
    onboarded: Boolean(row.onboardedAt),
    aiTier: computeAiTier(deepModeEnabled),
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function validateEmail(email: string): string | null {
  if (!email || !email.includes("@") || email.length > 254) return "Enter a valid email address.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password || password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

export async function getUserById(id: string): Promise<AuthUser | null> {
  const snap = await usersCol().doc(id).get();
  return snap.exists ? rowToUser(id, snap.data() as UserDoc) : null;
}

export async function signUp(
  email: string,
  password: string,
): Promise<{ user: AuthUser } | { error: string }> {
  const normalized = normalizeEmail(email);
  const emailErr = validateEmail(normalized);
  if (emailErr) return { error: emailErr };
  const passErr = validatePassword(password);
  if (passErr) return { error: passErr };

  const ref = usersCol().doc(normalized);
  const snap = await ref.get();
  const passwordHash = await bcrypt.hash(password, 10);

  if (snap.exists) {
    const existing = snap.data() as UserDoc;
    if (existing.passwordHash) {
      return { error: "An account with this email already exists. Log in instead." };
    }
    // Legacy account with no password (from the old magic-link flow) — let them claim it.
    await ref.set({ passwordHash }, { merge: true });
    return { user: rowToUser(normalized, { ...existing, passwordHash }) };
  }

  const now = new Date().toISOString();
  const doc: UserDoc = {
    email: normalized,
    createdAt: now,
    displayName: null,
    passwordHash,
    deepModeEnabled: allowlist().has(normalized),
    deepModeCallsThisPeriod: 0,
    deepModePeriodStartedAt: now,
    onboardedAt: null,
    failedLoginAttempts: 0,
    lockedUntil: null,
  };
  await ref.set(doc);
  return { user: rowToUser(normalized, doc) };
}

export async function logIn(email: string, password: string): Promise<{ user: AuthUser } | { error: string }> {
  const normalized = normalizeEmail(email);
  const ref = usersCol().doc(normalized);
  const snap = await ref.get();
  if (!snap.exists) return { error: "No account with that email. Sign up instead." };
  const data = snap.data() as UserDoc;

  if (data.lockedUntil && new Date(data.lockedUntil).getTime() > Date.now()) {
    const minutes = Math.ceil((new Date(data.lockedUntil).getTime() - Date.now()) / 60000);
    return { error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.` };
  }

  if (!data.passwordHash) {
    return { error: "This account has no password set yet. Use \"Create account\" to set one." };
  }

  const valid = await bcrypt.compare(password, data.passwordHash);
  if (!valid) {
    const attempts = (data.failedLoginAttempts ?? 0) + 1;
    const locked = attempts >= MAX_FAILED_LOGINS;
    await ref.set(
      {
        failedLoginAttempts: locked ? 0 : attempts,
        lockedUntil: locked ? new Date(Date.now() + LOCKOUT_MS).toISOString() : null,
      },
      { merge: true },
    );
    return locked
      ? { error: `Too many failed attempts. Try again in ${LOCKOUT_MS / 60000} minutes.` }
      : { error: "Wrong password." };
  }

  if (data.failedLoginAttempts || data.lockedUntil) {
    await ref.set({ failedLoginAttempts: 0, lockedUntil: null }, { merge: true });
  }
  return { user: rowToUser(normalized, data) };
}

export async function setDisplayName(userId: string, displayName: string) {
  await usersCol().doc(userId).set({ displayName }, { merge: true });
}

export async function markOnboarded(userId: string) {
  await usersCol().doc(userId).set({ onboardedAt: new Date().toISOString() }, { merge: true });
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await getDb()
    .collection("sessions")
    .doc(token)
    .set({ userId, createdAt: new Date().toISOString(), expiresAt: expiresAt.toISOString() });
  return { token, expiresAt };
}

export async function getUserBySession(token: string | undefined): Promise<AuthUser | null> {
  if (!token) return null;
  const snap = await getDb().collection("sessions").doc(token).get();
  if (!snap.exists) return null;
  const data = snap.data() as { userId: string; expiresAt: string };
  if (new Date(data.expiresAt).getTime() < Date.now()) return null;
  return getUserById(data.userId);
}

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await getDb().collection("sessions").doc(token).delete();
}

export async function deleteAccount(userId: string) {
  const db = getDb();
  const sessions = await db.collection("sessions").where("userId", "==", userId).get();
  const batch = db.batch();
  sessions.docs.forEach((d) => batch.delete(d.ref));
  batch.delete(db.collection("ledgers").doc(userId));
  batch.delete(db.collection("users").doc(userId));
  await batch.commit();
}

/** Free (Gemini/heuristic) extraction is unmetered; only the Grok "Deep Mode" tier is capped. */
export async function canUseDeepMode(user: AuthUser): Promise<boolean> {
  if (!user.deepModeEnabled) return false;
  const ref = usersCol().doc(user.id);
  const snap = await ref.get();
  if (!snap.exists) return false;
  const data = snap.data() as UserDoc;
  const periodStart = new Date(data.deepModePeriodStartedAt);
  const periodAgeDays = (Date.now() - periodStart.getTime()) / 86_400_000;
  if (periodAgeDays > 30) {
    await ref.set(
      { deepModeCallsThisPeriod: 0, deepModePeriodStartedAt: new Date().toISOString() },
      { merge: true },
    );
    return true;
  }
  return data.deepModeCallsThisPeriod < DEEP_MODE_MONTHLY_LIMIT;
}

export async function recordDeepModeCall(userId: string) {
  const db = getDb();
  const ref = usersCol().doc(userId);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = (snap.data() as UserDoc | undefined)?.deepModeCallsThisPeriod ?? 0;
    tx.set(ref, { deepModeCallsThisPeriod: current + 1 }, { merge: true });
  });
}

function passwordResetsCol() {
  return getDb().collection("passwordResets");
}

/** Never reveals whether an email has an account: returns {} (not an error) when it doesn't. */
export async function requestPasswordReset(email: string): Promise<{ token?: string } | { error: string }> {
  const normalized = normalizeEmail(email);
  const emailErr = validateEmail(normalized);
  if (emailErr) return { error: emailErr };

  const ref = usersCol().doc(normalized);
  const snap = await ref.get();
  if (!snap.exists) return {};
  const data = snap.data() as UserDoc;

  if (
    data.passwordResetRequestedAt &&
    Date.now() - new Date(data.passwordResetRequestedAt).getTime() < RESET_MIN_INTERVAL_MS
  ) {
    return { error: "A reset link was just sent. Check your email, or wait a minute to resend." };
  }

  const token = randomUUID();
  const now = new Date();
  await passwordResetsCol()
    .doc(token)
    .set({
      email: normalized,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS).toISOString(),
      used: false,
    });
  await ref.set({ passwordResetRequestedAt: now.toISOString() }, { merge: true });
  return { token };
}

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<{ user: AuthUser } | { error: string }> {
  const passErr = validatePassword(newPassword);
  if (passErr) return { error: passErr };

  const ref = passwordResetsCol().doc(token);
  const snap = await ref.get();
  if (!snap.exists) return { error: "This reset link is invalid or has expired." };
  const data = snap.data() as { email: string; expiresAt: string; used: boolean };
  if (data.used || new Date(data.expiresAt).getTime() < Date.now()) {
    return { error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  const userRef = usersCol().doc(data.email);
  await userRef.set({ passwordHash, failedLoginAttempts: 0, lockedUntil: null }, { merge: true });
  await ref.set({ used: true }, { merge: true });

  const userSnap = await userRef.get();
  return { user: rowToUser(data.email, userSnap.data() as UserDoc) };
}
