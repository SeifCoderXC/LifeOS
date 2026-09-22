"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DASHBOARD_VIEWS,
  type DashboardView,
  type FeedbackPacket,
  type SceneNode,
  type SnapshotPayload,
} from "@/lib/types";
import type { WeeklyReport } from "@/lib/types";
import type { ScenarioCard } from "@/lib/engines/scenarios";
import { IntelligencePanel } from "./IntelligencePanel";
import { DashboardViews } from "./Views";
import type { SessionUser } from "./AuthGate";

const LifeUniverse = dynamic(() => import("./LifeUniverse").then((m) => m.LifeUniverse), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-[0.3em] text-mute">
      assembling universe
    </div>
  ),
});

const VIEW_LABEL: Record<DashboardView, string> = {
  COMMAND_CENTER: "Command",
  WHAT_CHANGED: "Changed",
  TIMELINE: "Timeline",
  LIFE_UNIVERSE: "Universe",
  DOORS: "Doors",
  RISKS: "Risks",
  MILESTONES: "Milestones",
  FINANCE: "Finance",
  LEGAL: "Legal",
  CAREER: "Career",
  BODY: "Body",
  LEARNING: "Learning",
  DATA_HEALTH: "Data health",
};

const EXAMPLES = [
  "learned 10 Lithuanian words today",
  "got 0.5 kg lean muscle",
  "made 120 euro from trading",
  "found an internship in Barcelona but they want B2 Spanish",
  "worked 11 hours, exhausted, but saved 50 euro",
  "I finally fixed my CV and someone from a tech company replied",
  "I think my visa situation is getting difficult",
];

const AI_TIER_LABEL: Record<SessionUser["aiTier"], string> = {
  instant: "Instant Mode",
  smart: "Smart Mode (free AI)",
  deep: "Deep Mode",
};

export function AppShell({
  user,
  initialSnapshot,
  onSignedOut,
}: {
  user: SessionUser;
  initialSnapshot?: SnapshotPayload | null;
  onSignedOut: () => void;
}) {
  const [snapshot, setSnapshot] = useState<SnapshotPayload | null>(initialSnapshot ?? null);
  const [view, setView] = useState<DashboardView>("LIFE_UNIVERSE");
  const [text, setText] = useState("");
  const [deep, setDeep] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackPacket | null>(null);
  const [selected, setSelected] = useState<SceneNode | null>(null);
  const [weekly, setWeekly] = useState<WeeklyReport | null>(null);
  const [scenarios, setScenarios] = useState<ScenarioCard[] | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [aiFallbackNotice, setAiFallbackNotice] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/snapshot", { cache: "no-store" });
    if (!res.ok) throw new Error("snapshot failed");
    const data = (await res.json()) as SnapshotPayload;
    setSnapshot(data);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(String(e)));
  }, [load]);

  useEffect(() => {
    if (view === "DATA_HEALTH") {
      fetch("/api/weekly")
        .then((r) => r.json())
        .then(setWeekly)
        .catch(() => undefined);
      fetch("/api/scenarios")
        .then((r) => r.json())
        .then(setScenarios)
        .catch(() => undefined);
    }
  }, [view]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function submit(override?: string) {
    const payload = (override ?? text).trim();
    if (!payload || busy) return;
    setBusy(true);
    setError(null);
    setAiFallbackNotice(null);
    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: payload, deep: deep && user.deepModeEnabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "ingest failed");
      setFeedback(data.feedback as FeedbackPacket);
      setSnapshot(data.snapshot as SnapshotPayload);
      setText("");
      if (data.ai_fallback) {
        setAiFallbackNotice(
          user.aiTier === "deep"
            ? "Deep Mode (Grok) was temporarily unavailable for this entry — used the basic parser instead. Nothing was lost; try again later for the richer read."
            : "Smart Mode (AI) was temporarily unavailable for this entry — used the basic parser instead. Nothing was lost; try again later for the richer read.",
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    onSignedOut();
  }

  async function deleteAccount() {
    await fetch("/api/account/delete", { method: "POST" });
    onSignedOut();
  }

  const health = snapshot?.data_health;
  const healthScore = useMemo(() => {
    if (!health) return 0;
    return Math.round(
      ((health.record_completeness + health.evidence_strength + health.freshness) / 3) * 100,
    );
  }, [health]);

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-end gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.34em] text-teal">
              {user.displayName ? `hi, ${user.displayName}` : "your life universe"}
            </div>
            <h1 className="font-display text-3xl leading-none gold-text">LifeOS</h1>
          </div>
          <p className="hidden pb-1 text-xs text-mute md:block">
            reality → state → world → options → decision → action
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-mute">data health</div>
            <div className="font-display text-xl text-paper">{healthScore}%</div>
          </div>
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em]">
            <span className="live-dot h-2 w-2 rounded-full bg-teal" />
            {AI_TIER_LABEL[user.aiTier]}
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setAccountOpen((v) => !v)}
              className="rounded-full border border-line px-3 py-1.5 text-xs text-mute hover:border-gold-dim hover:text-paper"
            >
              {user.displayName || user.email}
            </button>
            {accountOpen && (
              <div className="absolute right-0 z-10 mt-2 w-56 rounded-lg border border-line bg-void p-2 shadow-lg">
                <a
                  href="/api/account/export"
                  className="block rounded-lg px-3 py-2 text-sm text-mute hover:bg-black/40 hover:text-paper"
                >
                  Export my data
                </a>
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="block w-full rounded-lg px-3 py-2 text-left text-sm text-mute hover:bg-black/40 hover:text-paper"
                >
                  Sign out
                </button>
                {confirmingDelete ? (
                  <button
                    type="button"
                    onClick={() => void deleteAccount()}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose hover:bg-rose/10"
                  >
                    Confirm delete — this cannot be undone
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(true)}
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-mute hover:bg-black/40 hover:text-rose"
                  >
                    Delete account
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <nav className="hidden w-44 shrink-0 flex-col border-r border-line py-3 md:flex">
          {DASHBOARD_VIEWS.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-4 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.16em] ${
                view === v ? "text-gold" : "text-mute hover:text-paper"
              }`}
            >
              {VIEW_LABEL[v]}
            </button>
          ))}
        </nav>

        <main className="flex min-w-0 flex-1 flex-col">
          {snapshot && snapshot.priorities.length > 0 && !nudgeDismissed && (
            <div className="flex items-start gap-3 border-b border-gold-dim/40 bg-gold-dim/10 px-4 py-2.5">
              <span className="mt-0.5 shrink-0 rounded-full bg-gold px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-void">
                Do this next
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-paper">{snapshot.priorities[0].action}</p>
                <p className="text-xs text-mute">{snapshot.priorities[0].why}</p>
              </div>
              <button
                type="button"
                onClick={() => setView("COMMAND_CENTER")}
                className="shrink-0 whitespace-nowrap text-xs text-teal hover:underline"
              >
                See all priorities
              </button>
              <button
                type="button"
                onClick={() => setNudgeDismissed(true)}
                aria-label="Dismiss"
                className="shrink-0 text-mute hover:text-paper"
              >
                ×
              </button>
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-hidden">
            {view === "LIFE_UNIVERSE" && snapshot ? (
              <LifeUniverse
                scene={snapshot.scene}
                selectedId={selected?.id}
                onSelect={(n) => {
                  setSelected(n);
                }}
              />
            ) : snapshot ? (
              <div className="h-full overflow-y-auto">
                <DashboardViews view={view} snapshot={snapshot} weekly={weekly} scenarios={scenarios} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center font-mono text-xs uppercase tracking-[0.3em] text-mute">
                loading ledger
              </div>
            )}
          </div>

          <div className="border-t border-line p-3">
            <div className="mb-2 flex flex-wrap gap-1">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setText(ex)}
                  className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] text-mute hover:border-gold-dim hover:text-paper"
                >
                  {ex}
                </button>
              ))}
            </div>
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    void submit();
                  }
                }}
                rows={2}
                placeholder="Speak reality. Chaotic dumps are welcome. Ctrl+Enter to commit."
                className="min-h-[64px] flex-1 resize-none rounded-lg border border-line bg-black/40 px-3 py-2 text-sm text-paper placeholder:text-mute"
              />
              <div className="flex flex-col gap-2">
                {user.deepModeEnabled ? (
                  <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                    <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} />
                    deep + world
                  </label>
                ) : (
                  <span
                    title="Deep Mode (Grok extraction + live web research) is invite-only during launch."
                    className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-mute opacity-60"
                  >
                    deep + world (invite-only)
                  </span>
                )}
                <button
                  type="button"
                  disabled={busy || !text.trim()}
                  onClick={() => void submit()}
                  className="rounded-lg bg-gold px-4 py-2 font-mono text-[11px] uppercase tracking-[0.2em] text-void disabled:opacity-40"
                >
                  {busy ? "recording…" : "commit"}
                </button>
              </div>
            </div>
            {error && <p className="mt-2 font-mono text-xs text-rose">{error}</p>}
            {aiFallbackNotice && (
              <p className="mt-2 font-mono text-[10px] text-gold-dim">{aiFallbackNotice}</p>
            )}
            {user.aiTier === "instant" && (
              <p className="mt-2 font-mono text-[10px] text-mute">
                You&apos;re on Instant Mode (free, local parsing, no AI). Deep Mode adds Grok-powered extraction
                and live web research for a limited group during launch.
              </p>
            )}
            {user.aiTier === "smart" && (
              <p className="mt-2 font-mono text-[10px] text-mute">
                You&apos;re on Smart Mode — free AI-powered extraction, no cost to you. Deep Mode adds live web
                research on top of that, for a limited group during launch.
              </p>
            )}
          </div>
        </main>

        <div className="hidden w-[380px] shrink-0 xl:block">
          {snapshot && (
            <IntelligencePanel
              snapshot={snapshot}
              feedback={feedback}
              selected={selected}
              onClose={() => setSelected(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
