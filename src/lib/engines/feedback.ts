import { nid, nowIso } from "../id";
import type {
  DomainId,
  FeedbackPacket,
  InputMode,
  Ledger,
  LifeEvent,
  StateSnapshot,
} from "../types";

export function buildFeedback(opts: {
  ledger: Ledger;
  intakeId: string;
  mode: "fast" | "deep";
  inputMode: InputMode;
  events: LifeEvent[];
  before: StateSnapshot | null;
  after: StateSnapshot;
  grokUsed: boolean;
  researchPerformed: boolean;
  clarification: string | null;
}): FeedbackPacket {
  const { events, before, after } = opts;
  const recorded = events.map((e) => {
    const epi = `${e.epistemic_status}/${e.evidence_level}`;
    return `${e.summary}  [${e.event_type} · ${e.domain_ids.join("+")} · ${epi} · conf ${e.confidence.toFixed(2)}]`;
  });

  const what_changed: FeedbackPacket["what_changed"] = [];
  for (const dim of Object.keys(after.dimensions) as Array<keyof typeof after.dimensions>) {
    const a = after.dimensions[dim];
    const b = before?.dimensions[dim];
    if (!b && a.value == null) continue;
    const beforeText = b?.display ?? "n/a";
    if (beforeText === a.display && (a.delta == null || a.delta === 0)) continue;
    if (b && b.display === a.display) continue;
    what_changed.push({
      dimension: dim,
      before: beforeText,
      after: a.display,
      measured: a.change_type === "measured",
    });
  }

  const domains = Array.from(new Set(events.flatMap((e) => e.domain_ids))) as DomainId[];
  const newDoors = opts.ledger.doors.filter((d) =>
    d.source_event_ids.some((id) => events.some((e) => e.event_id === id)),
  );
  const newRisks = opts.ledger.risks.filter((r) =>
    r.event_ids.some((id) => events.some((e) => e.event_id === id)),
  );
  const newMs = opts.ledger.milestones.filter((m) =>
    m.event_ids.some((id) => events.some((e) => e.event_id === id)),
  );

  const why = explainWhy(events, what_changed, newDoors.map((d) => d.name), newRisks.map((r) => r.title));
  const next =
    opts.ledger.feedback.length >= 0
      ? nextActionHint(events, newDoors, newRisks)
      : "Keep recording.";

  const worldEffects = opts.ledger.world_facts
    .filter((w) => w.related_event_ids.some((id) => events.some((e) => e.event_id === id)))
    .map((w) => `${w.claim} (retrieved ${w.retrieved_at.slice(0, 10)})`);

  if (!opts.researchPerformed && events.some((e) => e.world_research_trigger)) {
    worldEffects.push(
      "External research was not performed for this intake. World effects are unmarked — not invented.",
    );
  }

  return {
    feedback_id: nid("fb"),
    intake_id: opts.intakeId,
    created_at: nowIso(),
    mode: opts.mode,
    recorded,
    what_changed,
    why_it_matters: why,
    domains_affected: domains,
    confidence: events.length ? events.reduce((a, e) => a + e.confidence, 0) / events.length : 0,
    milestones_or_thresholds: newMs.map((m) => `${m.name} — ${m.strategic_effect}`),
    new_risks: newRisks.map((r) => `${r.title}: ${r.description}`),
    new_doors: newDoors.map((d) => `${d.name} [${d.state}] missing=${d.missing_requirements.join(", ") || "none recorded"}`),
    external_world_effects: worldEffects,
    next_best_action: next,
    clarification: opts.clarification,
    grok_used: opts.grokUsed,
    research_performed: opts.researchPerformed,
  };
}

function explainWhy(
  events: LifeEvent[],
  changed: FeedbackPacket["what_changed"],
  doors: string[],
  risks: string[],
) {
  if (!events.length) return "Nothing was committed.";
  const bits: string[] = [];
  const money = events.filter((e) => e.financial_effect);
  if (money.length) {
    bits.push(
      "Cash movements change optionality only as far as they are real, persistent, and legal to earn. A trading print is not a salary.",
    );
  }
  if (events.some((e) => e.event_type === "opportunity_discovery")) {
    bits.push(
      "An opportunity is a Door candidate, not an open Door. Missing requirements are the actual story.",
    );
  }
  if (events.some((e) => e.event_type === "emotion" || e.epistemic_status === "USER_CLAIM" && e.evidence_level === "E0")) {
    bits.push("Inner states were stored as claims/thoughts, not as facts about the world.");
  }
  if (events.some((e) => /hours/.test(e.summary.toLowerCase()))) {
    bits.push("Hours worked measure load, not progress.");
  }
  if (doors.length) bits.push(`Doors touched: ${doors.join("; ")}.`);
  if (risks.length) bits.push(`Risk surface changed: ${risks.join("; ")}.`);
  if (!changed.length) bits.push("Derived scores barely moved — which is correct when evidence is thin.");
  if (!bits.length) bits.push("Recorded. Interpretive weight is limited by evidence level.");
  return bits.join(" ");
}

function nextActionHint(
  events: LifeEvent[],
  doors: { next_action: string | null; name: string }[],
  risks: { mitigation: string | null; title: string }[],
) {
  if (risks[0]?.mitigation) return risks[0].mitigation;
  if (doors[0]?.next_action) return doors[0].next_action!;
  if (events.some((e) => /replied/i.test(e.summary))) {
    return "Reply with a concrete next step while the thread is warm.";
  }
  if (events.some((e) => e.financial_effect && !/balance/.test(e.summary.toLowerCase()))) {
    return "Log a cash/savings stock so this flow can become a position, not a vignette.";
  }
  return "Add the next true fact. Prefer numbers, dates, documents, names — not summaries of vibes.";
}
