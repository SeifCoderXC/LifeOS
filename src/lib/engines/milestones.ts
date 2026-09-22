import { nid, nowIso } from "../id";
import type { Ledger, LifeEvent, Milestone } from "../types";

function already(ledger: Ledger, name: string, pattern: string) {
  return ledger.milestones.some((m) => m.name === name && m.pattern === pattern);
}

export function detectMilestones(ledger: Ledger, fresh: LifeEvent[]): Milestone[] {
  const out: Milestone[] = [];
  const all = ledger.events;

  const incomeIn = all.filter((e) => e.financial_effect?.direction === "in");
  if (incomeIn.length === 1 && fresh.some((f) => f.event_id === incomeIn[0].event_id)) {
    const e = incomeIn[0];
    if (!already(ledger, "First recorded inflow", "first_income")) {
      out.push({
        milestone_id: nid("ms"),
        created_at: nowIso(),
        pattern: "first_income",
        name: "First recorded inflow",
        description: `First cash-in event in the ledger: ${e.financial_effect?.amount} ${e.financial_effect?.currency}. Not assumed recurring.`,
        domain_ids: ["FINANCE"],
        event_ids: [e.event_id],
        confirmed: false,
        strategic_effect: "Establishes a measured income channel. Sustainability is unknown.",
      });
    }
  }

  const lang = fresh.filter(
    (e) =>
      e.measurement?.name === "words_learned" || e.measurement?.name === "sentences_learned",
  );
  for (const e of lang) {
    const total = all
      .filter(
        (x) =>
          x.measurement?.name === e.measurement?.name &&
          JSON.stringify(x.entities) === JSON.stringify(e.entities),
      )
      .reduce((a, x) => a + (x.measurement?.value ?? 0), 0);
    if (total >= 50 && !already(ledger, "Language volume ≥ 50 units", "threshold_reached")) {
      out.push({
        milestone_id: nid("ms"),
        created_at: nowIso(),
        pattern: "threshold_reached",
        name: "Language volume ≥ 50 units",
        description: `${total} units logged. This is volume, not CEFR level.`,
        domain_ids: ["LEARNING"],
        event_ids: [e.event_id],
        confirmed: false,
        strategic_effect: "Consistency signal only. Does not unlock language-gated doors by itself.",
      });
    }
  }

  for (const e of fresh) {
    if (e.event_type === "opportunity_discovery") {
      const name = `Opportunity surfaced: ${e.summary.slice(0, 80)}`;
      if (!already(ledger, name, "new_capability")) {
        out.push({
          milestone_id: nid("ms"),
          created_at: nowIso(),
          pattern: "new_capability",
          name,
          description: "A path was recorded. Access is not confirmed.",
          domain_ids: e.domain_ids,
          event_ids: [e.event_id],
          confirmed: false,
          strategic_effect: "Option created in the map. Eligibility still unknown until requirements are checked.",
        });
      }
    }
    if (/fixed my cv|updated my cv/i.test(e.summary) && !already(ledger, "CV updated", "constraint_removed")) {
      out.push({
        milestone_id: nid("ms"),
        created_at: nowIso(),
        pattern: "constraint_removed",
        name: "CV updated",
        description: "A process blocker (stale CV) may have been reduced. Quality is unverified.",
        domain_ids: ["CAREER"],
        event_ids: [e.event_id],
        confirmed: false,
        strategic_effect: "Unblocks applications. Does not by itself create interviews.",
      });
    }
    if (e.domain_ids.includes("MOBILITY") && e.location) {
      const name = `Location signal: ${e.location}`;
      if (!already(ledger, name, "new_country_or_market_access")) {
        out.push({
          milestone_id: nid("ms"),
          created_at: nowIso(),
          pattern: "new_country_or_market_access",
          name,
          description: `Place mentioned: ${e.location}. Presence, right-to-work, and access are not implied.`,
          domain_ids: ["MOBILITY"],
          event_ids: [e.event_id],
          confirmed: false,
          strategic_effect: "Geographic option entered the map.",
        });
      }
    }
    if (/replied/i.test(e.summary) && e.domain_ids.includes("SOCIAL")) {
      if (!already(ledger, "External professional reply", "network_breakthrough")) {
        out.push({
          milestone_id: nid("ms"),
          created_at: nowIso(),
          pattern: "network_breakthrough",
          name: "External professional reply",
          description: "Someone replied. This is a weak-tie ping, not a relationship or offer.",
          domain_ids: ["SOCIAL", "CAREER"],
          event_ids: [e.event_id],
          confirmed: false,
          strategic_effect: "Conversation option exists. Convert or it decays.",
        });
      }
    }
  }

  const learningDays = new Set(
    all
      .filter((e) => e.domain_ids.includes("LEARNING"))
      .map((e) => e.event_time.slice(0, 10)),
  );
  if (learningDays.size >= 3 && !already(ledger, "Learning logged on 3+ distinct days", "streak_or_consistency")) {
    out.push({
      milestone_id: nid("ms"),
      created_at: nowIso(),
      pattern: "streak_or_consistency",
      name: "Learning logged on 3+ distinct days",
      description: `${learningDays.size} distinct days with learning evidence.`,
      domain_ids: ["LEARNING"],
      event_ids: fresh.map((e) => e.event_id),
      confirmed: false,
      strategic_effect: "Consistency is a real asset. Still not a credential.",
    });
  }

  return out;
}
