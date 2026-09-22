import type { DataHealth, Ledger } from "../types";

export function computeDataHealth(ledger: Ledger): DataHealth {
  const events = ledger.events;
  const notes: string[] = [];
  if (!events.length) {
    return {
      record_completeness: 0,
      evidence_strength: 0,
      freshness: 0,
      contradiction_rate: 0,
      stale_state_ratio: 1,
      external_verification_coverage: 0,
      notes: ["Empty ledger. The visualization is a map of ignorance, not a life."],
    };
  }

  const requiredHints = [
    "cash_balance",
    "legal_status",
    "location",
    "primary_skill",
    "income_channel",
  ];
  const hasCash = events.some((e) => e.financial_effect || /balance|savings|cash/.test(e.summary.toLowerCase()));
  const hasLegal = events.some((e) => e.domain_ids.includes("LEGAL"));
  const hasLoc = events.some((e) => !!e.location);
  const hasSkill = events.some((e) => e.domain_ids.includes("TECH") || e.domain_ids.includes("LEARNING"));
  const hasIncome = events.some((e) => e.financial_effect?.direction === "in");
  const present = [hasCash, hasLegal, hasLoc, hasSkill, hasIncome].filter(Boolean).length;
  const record_completeness = present / requiredHints.length;

  const eRank = { E0: 0.15, E1: 0.4, E2: 0.65, E3: 0.85, E4: 1 };
  const evidence_strength =
    events.reduce((a, e) => a + eRank[e.evidence_level], 0) / events.length;

  const last = new Date(events.at(-1)!.recorded_at).getTime();
  const ageHours = (Date.now() - last) / 36e5;
  const freshness = Math.max(0, 1 - ageHours / (24 * 14));

  const contradiction_rate = Math.min(1, ledger.contradictions.length / Math.max(3, events.length));

  const snap = ledger.snapshots.at(-1);
  const dims = snap ? Object.values(snap.dimensions) : [];
  const unknown = dims.filter((d) => d.value == null || d.change_type === "unknown").length;
  const stale_state_ratio = dims.length ? unknown / dims.length : 1;

  const needsWorld = events.filter((e) => e.world_research_trigger).length;
  const external_verification_coverage = needsWorld
    ? Math.min(1, ledger.world_facts.length / needsWorld)
    : ledger.world_facts.length
      ? 1
      : 0;

  if (record_completeness < 0.5) notes.push("Core life stocks (cash, legal, location) are incomplete.");
  if (evidence_strength < 0.5) notes.push("Most records are self-report (E1) or thoughts (E0).");
  if (freshness < 0.4) notes.push("Ledger is going stale.");
  if (contradiction_rate > 0.1) notes.push("Contradictions exist — both versions kept.");
  if (external_verification_coverage < 0.3 && needsWorld)
    notes.push("World-facing claims have not been verified with current sources.");
  if (!notes.length) notes.push("Usable, still not a complete model.");

  return {
    record_completeness,
    evidence_strength,
    freshness,
    contradiction_rate,
    stale_state_ratio,
    external_verification_coverage,
    notes,
  };
}
