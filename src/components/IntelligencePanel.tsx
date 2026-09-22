"use client";

import type { ReactNode } from "react";
import type { FeedbackPacket, SceneNode, SnapshotPayload } from "@/lib/types";
import { DOMAIN_MAP } from "@/lib/ontology";

function Section({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div className="receipt-row py-2">
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-dim">{k}</div>
      <div className="text-sm leading-relaxed text-paper/90">{children}</div>
    </div>
  );
}

export function IntelligencePanel({
  snapshot,
  feedback,
  selected,
  onClose,
}: {
  snapshot: SnapshotPayload;
  feedback: FeedbackPacket | null;
  selected: SceneNode | null;
  onClose: () => void;
}) {
  const packet = feedback ?? snapshot.last_feedback;
  return (
    <aside className="panel flex h-full flex-col overflow-hidden rounded-none border-y-0 border-r-0">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.28em] text-teal">Intelligence</div>
          <div className="font-display text-xl text-paper">Why it is so</div>
        </div>
        {selected && (
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-[10px] uppercase tracking-[0.2em] text-mute hover:text-paper"
          >
            clear
          </button>
        )}
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {selected && (
          <div className="rounded-lg border border-line bg-black/30 p-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold">{selected.kind}</div>
            <div className="mt-1 font-display text-2xl">{selected.label}</div>
            <p className="mt-2 font-mono text-[11px] text-mute">
              size encodes weight · opacity encodes confidence · motion encodes recency
            </p>
            {selected.meta && (
              <pre className="mt-3 overflow-x-auto font-mono text-[11px] text-paper/70">
                {JSON.stringify(selected.meta, null, 2)}
              </pre>
            )}
            {selected.domain_id && DOMAIN_MAP[selected.domain_id] && (
              <p className="mt-2 text-sm text-mute">{DOMAIN_MAP[selected.domain_id].name}</p>
            )}
          </div>
        )}

        {packet ? (
          <div>
            <div className="hairline mb-3" />
            <Section k="Recorded">
              <ul className="space-y-1">
                {packet.recorded.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </Section>
            <Section k="What changed">
              {packet.what_changed.length ? (
                <ul className="space-y-1">
                  {packet.what_changed.map((w) => (
                    <li key={w.dimension}>
                      <span className="text-mute">{w.dimension}</span> {w.before} → {w.after}
                      {w.measured ? "" : " (modeled)"}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-mute">No derived metric moved enough to report.</span>
              )}
            </Section>
            <Section k="Why it matters">{packet.why_it_matters}</Section>
            <Section k="Domains">{packet.domains_affected.join(" · ") || "—"}</Section>
            <Section k="Confidence">{packet.confidence.toFixed(2)}</Section>
            <Section k="Milestones">
              {packet.milestones_or_thresholds.length
                ? packet.milestones_or_thresholds.join(" / ")
                : "none detected"}
            </Section>
            <Section k="New risks">
              {packet.new_risks.length ? packet.new_risks.join(" / ") : "none"}
            </Section>
            <Section k="New doors">
              {packet.new_doors.length ? packet.new_doors.join(" / ") : "none"}
            </Section>
            <Section k="World">
              {packet.external_world_effects.length
                ? packet.external_world_effects.join(" / ")
                : packet.research_performed
                  ? "research ran; no claims cached"
                  : "research not performed"}
            </Section>
            <Section k="Next">{packet.next_best_action}</Section>
            {packet.clarification && (
              <Section k="Clarify">{packet.clarification}</Section>
            )}
            <div className="pt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-mute">
              {packet.grok_used ? "Grok extraction" : "Heuristic extraction"} · {packet.mode} mode
            </div>
          </div>
        ) : (
          <p className="text-sm text-mute">
            Speak reality below. Every dump is preserved verbatim, then structured without fiction.
          </p>
        )}

        <div className="rounded-lg border border-line p-3">
          <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-gold-dim">Priorities</div>
          <ol className="mt-2 space-y-2">
            {snapshot.priorities.map((p) => (
              <li key={p.rank} className="text-sm">
                <span className="font-mono text-gold">{String(p.rank).padStart(2, "0")}</span> {p.action}
                <div className="text-xs text-mute">{p.why}</div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </aside>
  );
}
