import type { Ledger, WeeklyReport } from "../types";
import { rankActions } from "./priority";

export function weeklyReport(ledger: Ledger): WeeklyReport {
  const end = new Date();
  const start = new Date(end.getTime() - 7 * 24 * 3600 * 1000);
  const window_start = start.toISOString();
  const window_end = end.toISOString();
  const recent = ledger.events.filter((e) => new Date(e.recorded_at) >= start);
  const state = ledger.snapshots.at(-1) ?? null;

  const gains: string[] = [];
  const losses: string[] = [];
  if (state) {
    for (const dim of Object.values(state.dimensions)) {
      if (dim.delta != null && dim.delta > 0) gains.push(`${dim.dimension}: ${dim.display}`);
      if (dim.delta != null && dim.delta < 0) losses.push(`${dim.dimension}: ${dim.display}`);
    }
  }

  const moneyIn = recent
    .filter((e) => e.financial_effect?.direction === "in")
    .reduce((a, e) => a + (e.financial_effect?.amount ?? 0), 0);
  const moneyOut = recent
    .filter((e) => e.financial_effect?.direction === "out")
    .reduce((a, e) => a + (e.financial_effect?.amount ?? 0), 0);
  if (moneyIn) gains.push(`Recorded inflows ${moneyIn}`);
  if (moneyOut) losses.push(`Recorded outflows ${moneyOut}`);

  const bottlenecks = ledger.doors
    .filter((d) => d.missing_requirements.length && d.state !== "EXPIRED")
    .map((d) => `${d.name}: ${d.missing_requirements.join(", ")}`);

  const newDoors = ledger.doors
    .filter((d) => new Date(d.created_at) >= start)
    .map((d) => `${d.name} [${d.state}]`);
  const closing = ledger.doors
    .filter((d) => d.state === "BLOCKED" || d.state === "EXPIRED")
    .map((d) => `${d.name} [${d.state}]`);

  const world = ledger.world_facts
    .filter((w) => new Date(w.retrieved_at) >= start)
    .map((w) => w.claim);

  const actions = state ? rankActions(ledger, state).map((a) => a.action) : [];

  const gaps: string[] = [];
  if (!ledger.events.some((e) => /balance|savings/.test(e.summary.toLowerCase()))) {
    gaps.push("No cash stock (balance/savings) recorded.");
  }
  if (!ledger.events.some((e) => e.domain_ids.includes("LEGAL") && e.evidence_level !== "E0")) {
    gaps.push("No hard legal/residence facts.");
  }
  if (!ledger.world_facts.length) gaps.push("No external verification in cache.");

  const nextPos =
    actions[0] ??
    "Increase evidence density in the bottleneck domain rather than adding new goals.";

  return {
    generated_at: end.toISOString(),
    window_start,
    window_end,
    state_change: recent.length
      ? [`${recent.length} events in 7 days`, ...gains.slice(0, 4)]
      : ["No events this week. The model did not move."],
    biggest_gains: gains.slice(0, 6),
    biggest_losses: losses.slice(0, 6),
    hidden_bottlenecks: bottlenecks.slice(0, 6),
    new_doors: newDoors,
    closing_doors: closing,
    world_changes_that_matter: world.length ? world : ["No world research this window."],
    high_leverage_actions: actions,
    data_gaps: gaps,
    next_strategic_position: nextPos,
  };
}
