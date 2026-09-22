"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not reset your password");
      setDone(true);
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="flex h-screen items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-2xl text-paper">Missing reset link</h1>
          <p className="mt-2 text-sm text-mute">
            This page needs a reset token. Use the link from your email, or request a new one from the sign-in
            screen.
          </p>
          <a href="/" className="mt-4 inline-block text-sm text-teal underline">
            Back to sign in
          </a>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex h-screen items-center justify-center px-4 text-center">
        <div className="max-w-sm">
          <h1 className="font-display text-2xl text-paper">Password updated</h1>
          <p className="mt-2 text-sm text-mute">Taking you back to your universe…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-teal">LifeOS</div>
          <h1 className="mt-1 font-display text-3xl text-paper">Set a new password</h1>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input
            autoFocus
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (8+ characters)"
            className="w-full rounded-xl border border-line bg-black/40 px-4 py-3 text-sm text-paper placeholder:text-mute"
          />
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-xl border border-line bg-black/40 px-4 py-3 text-sm text-paper placeholder:text-mute"
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gold px-4 py-3 text-sm font-medium text-void disabled:opacity-40"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
        <p className="mt-3 min-h-[1.25rem] text-center text-sm text-rose">{error}</p>
      </div>
    </div>
  );
}
