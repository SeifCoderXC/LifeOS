"use client";

import { useState } from "react";
import type { SessionUser } from "./AuthGate";
import type { SnapshotPayload } from "@/lib/types";

interface Step {
  key: string;
  question: string;
  hint: string;
  placeholder: string;
}

const STEPS: Step[] = [
  {
    key: "snapshot",
    question: "In one line, what's going on in your life right now?",
    hint: "Whatever's on top of your mind. No wrong answer.",
    placeholder: "e.g. just moved cities and starting a new job next week",
  },
  {
    key: "body",
    question: "How's your body and energy been lately?",
    hint: "Training, sleep, food, how you feel day to day.",
    placeholder: "e.g. sleeping badly, haven't worked out in two weeks",
  },
  {
    key: "money",
    question: "What's happening with money right now?",
    hint: "Income, savings, spending, anything recent.",
    placeholder: "e.g. saved 200 euro this month, freelance income is unpredictable",
  },
  {
    key: "work",
    question: "What are you working on — career, skills, projects?",
    hint: "Whatever you're building toward, even if it's early.",
    placeholder: "e.g. learning Spanish, applying to jobs in Berlin",
  },
  {
    key: "worry",
    question: "Anything worrying you or feeling urgent?",
    hint: "Visa, deadline, health, relationship — anything with a clock on it.",
    placeholder: "e.g. visa renewal due in 3 months and I haven't started",
  },
];

export function Onboarding({
  user,
  onComplete,
}: {
  user: SessionUser;
  onComplete: (snapshot: SnapshotPayload) => void;
}) {
  const [step, setStep] = useState(0); // 0 = name step, 1..STEPS.length = questions
  const [displayName, setDisplayName] = useState("");
  const [answers, setAnswers] = useState<string[]>(STEPS.map(() => ""));
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = STEPS.length + 1;
  const isNameStep = step === 0;
  const currentQuestion = isNameStep ? null : STEPS[step - 1];

  function updateAnswer(value: string) {
    setAnswers((prev) => {
      const next = [...prev];
      next[step - 1] = value;
      return next;
    });
  }

  async function finish() {
    setSubmitting(true);
    setError(null);
    const nonEmpty = answers.map((a) => a.trim()).filter(Boolean);
    try {
      for (let i = 0; i < nonEmpty.length; i++) {
        setProgress({ current: i + 1, total: nonEmpty.length });
        const res = await fetch("/api/ingest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: nonEmpty[i], deep: false }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not process one of your answers");
      }
      setProgress(null);
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not finish setting up your account");
      onComplete(data.snapshot as SnapshotPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSubmitting(false);
      setProgress(null);
    }
  }

  function next() {
    if (step === totalSteps - 1) {
      void finish();
    } else {
      setStep((s) => s + 1);
    }
  }

  function skip() {
    if (!isNameStep) updateAnswer("");
    next();
  }

  return (
    <div className="flex h-screen items-center justify-center overflow-y-auto px-4 py-10">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex justify-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full transition-colors ${
                i <= step ? "bg-gold" : "bg-line"
              }`}
            />
          ))}
        </div>

        <div className="rounded-2xl border border-line bg-panel/60 p-8 text-center shadow-glow">
          {isNameStep ? (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-teal">welcome</p>
              <h2 className="mt-2 font-display text-3xl text-paper">What should we call you?</h2>
              <p className="mt-2 text-sm text-mute">
                Just a first name — we&apos;ll use it to greet you, nothing else.
              </p>
              <input
                autoFocus
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && next()}
                placeholder="e.g. Sam"
                className="mt-6 w-full rounded-xl border border-line bg-black/30 px-4 py-3 text-center text-base text-paper placeholder:text-mute"
              />
            </>
          ) : (
            <>
              <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-teal">
                {step} of {STEPS.length}
              </p>
              <h2 className="mt-2 font-display text-2xl leading-snug text-paper">
                {currentQuestion!.question}
              </h2>
              <p className="mt-2 text-sm text-mute">{currentQuestion!.hint}</p>
              <textarea
                autoFocus
                value={answers[step - 1]}
                onChange={(e) => updateAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) next();
                }}
                rows={3}
                placeholder={currentQuestion!.placeholder}
                className="mt-6 w-full resize-none rounded-xl border border-line bg-black/30 px-4 py-3 text-sm text-paper placeholder:text-mute"
              />
            </>
          )}

          <p className="mt-3 min-h-[1.25rem] text-sm text-rose">{error}</p>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={skip}
              disabled={submitting}
              className="text-sm text-mute underline-offset-2 hover:text-paper hover:underline disabled:opacity-40"
            >
              {isNameStep ? "Skip" : "Skip this one"}
            </button>
            <button
              type="button"
              onClick={next}
              disabled={submitting}
              className="rounded-xl bg-gold px-6 py-2.5 text-sm font-medium text-void disabled:opacity-40"
            >
              {submitting
                ? progress
                  ? `Analyzing ${progress.current} of ${progress.total}…`
                  : "Building your universe…"
                : step === totalSteps - 1
                  ? "Show me my universe"
                  : "Next"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-mute">
          Signed in as {user.email}. You can add, correct, or expand on any of this later.
        </p>
      </div>
    </div>
  );
}
