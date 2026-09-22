"use client";

import { useEffect, useState } from "react";
import { AppShell } from "./AppShell";
import { Onboarding } from "./Onboarding";
import { LandingIntro } from "./LandingIntro";
import type { SnapshotPayload } from "@/lib/types";

export interface SessionUser {
  id: string;
  email: string;
  displayName: string | null;
  deepModeEnabled: boolean;
  onboarded: boolean;
  aiTier: "instant" | "smart" | "deep";
}

const PITCH_EXAMPLES = [
  "learned 10 Lithuanian words today",
  "made 120 euro from trading",
  "found an internship in Barcelona but they want B2 Spanish",
  "worked 11 hours, exhausted, but saved 50 euro",
];

type Mode = "signup" | "login";

export function AuthGate() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [initialSnapshot, setInitialSnapshot] = useState<SnapshotPayload | null>(null);

  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);
  const [forgotDevLink, setForgotDevLink] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUser(d.user))
      .finally(() => setLoading(false));
  }, []);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setPassword("");
    setConfirmPassword("");
    setShowForgot(false);
  }

  async function submitForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotBusy(true);
    setForgotMessage(null);
    setForgotDevLink(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not send a reset link");
      setForgotMessage("If an account exists for that email, a reset link is on its way.");
      if (data.devLink) setForgotDevLink(data.devLink);
    } catch (err) {
      setForgotMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setForgotBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(mode === "signup" ? "/api/auth/signup" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setUser(data.user as SessionUser);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-sm text-mute">Loading your universe…</div>
    );
  }

  if (user && !user.onboarded) {
    return (
      <Onboarding
        user={user}
        onComplete={(snapshot) => {
          setInitialSnapshot(snapshot);
          // Re-fetch rather than merge locally: onboarding may have set displayName
          // server-side, and this is the one source of truth for the session.
          fetch("/api/auth/session", { cache: "no-store" })
            .then((r) => r.json())
            .then((d) => setUser(d.user))
            .catch(() => setUser({ ...user, onboarded: true }));
        }}
      />
    );
  }

  if (user) {
    return (
      <AppShell
        user={user}
        initialSnapshot={initialSnapshot}
        onSignedOut={() => {
          setUser(null);
          setInitialSnapshot(null);
          setEmail("");
          setPassword("");
          setConfirmPassword("");
        }}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center overflow-y-auto px-4 py-10">
      <div className="flex w-full max-w-4xl flex-col items-center gap-10 lg:flex-row lg:items-start lg:justify-center lg:gap-16">
        <div className="order-2 pt-2 lg:order-1 lg:pt-6">
          <LandingIntro />
        </div>
        <div className="order-1 w-full max-w-md shrink-0 space-y-6 text-center lg:order-2">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-teal">LifeOS</div>
          <h1 className="mt-1 font-display text-4xl leading-tight gold-text">
            Talk to it like a diary.
          </h1>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-mute">
            It builds you a living map of your life — what&apos;s actually true, what&apos;s changing,
            and what to do next.
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-1.5">
          {PITCH_EXAMPLES.map((ex) => (
            <span key={ex} className="rounded-full border border-line px-2.5 py-1 text-xs text-mute">
              &ldquo;{ex}&rdquo;
            </span>
          ))}
        </div>

        <div className="mx-auto flex max-w-xs rounded-xl border border-line bg-black/40 p-1">
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === "signup" ? "bg-gold text-void" : "text-mute hover:text-paper"
            }`}
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              mode === "login" ? "bg-gold text-void" : "text-mute hover:text-paper"
            }`}
          >
            Log in
          </button>
        </div>

        {showForgot ? (
          <form onSubmit={submitForgot} className="space-y-3 text-left">
            <div className="text-center">
              <p className="text-sm font-medium text-paper">Reset your password</p>
              <p className="text-xs text-mute">We&apos;ll email you a link if that account exists.</p>
            </div>
            <input
              autoFocus
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-line bg-black/40 px-4 py-3 text-sm text-paper placeholder:text-mute"
            />
            <button
              type="submit"
              disabled={forgotBusy}
              className="w-full rounded-xl bg-gold px-4 py-3 text-sm font-medium text-void disabled:opacity-40"
            >
              {forgotBusy ? "Sending…" : "Send reset link"}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForgot(false);
                setForgotMessage(null);
                setForgotDevLink(null);
              }}
              className="w-full text-center text-xs text-mute underline-offset-2 hover:text-paper hover:underline"
            >
              Back to log in
            </button>
            <p className={`min-h-[1.25rem] text-center text-sm ${forgotMessage?.startsWith("If") ? "text-teal" : "text-rose"}`}>
              {forgotMessage}
            </p>
            {forgotDevLink && (
              <p className="text-center text-xs text-mute">
                No email provider configured yet — dev shortcut:{" "}
                <a className="underline hover:text-paper" href={forgotDevLink}>
                  open reset link
                </a>
              </p>
            )}
          </form>
        ) : (
          <>
            <form onSubmit={submit} className="space-y-3 text-left">
              <input
                autoFocus
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-line bg-black/40 px-4 py-3 text-sm text-paper placeholder:text-mute"
              />
              <input
                type="password"
                required
                minLength={mode === "signup" ? 8 : undefined}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "signup" ? "Create a password (8+ characters)" : "Password"}
                className="w-full rounded-xl border border-line bg-black/40 px-4 py-3 text-sm text-paper placeholder:text-mute"
              />
              {mode === "signup" && (
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  className="w-full rounded-xl border border-line bg-black/40 px-4 py-3 text-sm text-paper placeholder:text-mute"
                />
              )}
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-gold px-4 py-3 text-sm font-medium text-void disabled:opacity-40"
              >
                {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Log in"}
              </button>
            </form>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => {
                  setShowForgot(true);
                  setForgotEmail(email);
                  setError(null);
                }}
                className="text-center text-xs text-mute underline-offset-2 hover:text-paper hover:underline"
              >
                Forgot password?
              </button>
            )}

            <p className="min-h-[1.25rem] text-sm text-rose">{error}</p>
          </>
        )}

        <p className="text-xs text-mute">
          Your entries stay private to your account. We never share your data.
        </p>
        </div>
      </div>
    </div>
  );
}
