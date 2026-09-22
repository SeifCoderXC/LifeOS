import type { Ledger, PriorityAction, StateSnapshot } from "../types";

export function rankActions(ledger: Ledger, state: StateSnapshot): PriorityAction[] {
  const actions: PriorityAction[] = [];

  const legalRisk = ledger.risks.find((r) => r.active && r.risk_id === "risk_legal_status");
  if (legalRisk) {
    actions.push({
      rank: 0,
      action: "Write down visa/residence document type, country, and expiry — then check the official page.",
      why: "Legal status gates work, study and mobility. Feelings are not a filing date.",
      impact: 0.95,
      leverage: 0.9,
      urgency: 0.9,
      effort: 0.3,
      reversibility: "reversible",
      domains: ["LEGAL"],
    });
  }

  const cashUnknown = state.dimensions.financial_position.value == null;
  if (cashUnknown) {
    actions.push({
      rank: 0,
      action: "Log a current cash/savings number with currency. Runway is otherwise fiction.",
      why: "Without a stock, flow events cannot produce a trustworthy financial position.",
      impact: 0.8,
      leverage: 0.85,
      urgency: 0.6,
      effort: 0.2,
      reversibility: "reversible",
      domains: ["FINANCE"],
    });
  }

  const intern = ledger.doors.find((d) => /internship/i.test(d.name) && d.state !== "EXPIRED");
  if (intern && intern.missing_requirements.length) {
    actions.push({
      rank: 0,
      action: intern.next_action || `Close: ${intern.missing_requirements[0]}`,
      why: `${intern.name} is a real option only after requirements are true, not hoped.`,
      impact: 0.75,
      leverage: 0.8,
      urgency: intern.deadline ? 0.8 : 0.5,
      effort: 0.6,
      reversibility: intern.reversibility,
      domains: ["CAREER", "LEARNING"],
    });
  }

  const overwork = ledger.risks.find((r) => r.risk_id === "risk_overwork" && r.active);
  if (overwork) {
    actions.push({
      rank: 0,
      action: "Protect recovery this cycle. Do not add a new grind layer on 11-hour days.",
      why: "Hours are a cost. Exhaustion degrades decision quality and training.",
      impact: 0.6,
      leverage: 0.55,
      urgency: 0.7,
      effort: 0.4,
      reversibility: "reversible",
      domains: ["BODY", "MIND"],
    });
  }

  const cv = ledger.events.some((e) => /cv/i.test(e.summary));
  const reply = ledger.events.some((e) => /replied/i.test(e.summary));
  if (reply) {
    actions.push({
      rank: 0,
      action: "Answer the person who replied within 24 hours with a concrete next step.",
      why: "A weak-tie ping decays fast. Conversion is the only thing that turns it into capital.",
      impact: 0.7,
      leverage: 0.85,
      urgency: 0.85,
      effort: 0.25,
      reversibility: "reversible",
      domains: ["SOCIAL", "CAREER"],
    });
  } else if (cv) {
    actions.push({
      rank: 0,
      action: "Send the updated CV to one specific opportunity, not into the void.",
      why: "Editing a CV is operations. An application is the career event.",
      impact: 0.65,
      leverage: 0.7,
      urgency: 0.5,
      effort: 0.35,
      reversibility: "reversible",
      domains: ["CAREER"],
    });
  }

  const body = ledger.events.filter((e) => e.domain_ids.includes("BODY"));
  if (!body.length) {
    actions.push({
      rank: 0,
      action: "Log one real training or body measurement this week.",
      why: "Body & Presence is seeded, not started. An empty BODY domain means the goal is still just a slogan.",
      impact: 0.45,
      leverage: 0.5,
      urgency: 0.3,
      effort: 0.3,
      reversibility: "reversible",
      domains: ["BODY"],
    });
  }

  if (!actions.length) {
    actions.push({
      rank: 0,
      action: "Dump the last 48 hours of reality — money, work, body, legal, people — in one message.",
      why: "The model is starved. Better decisions need more true events, not more plans.",
      impact: 0.5,
      leverage: 0.9,
      urgency: 0.4,
      effort: 0.2,
      reversibility: "reversible",
      domains: ["OPERATIONS"],
    });
  }

  actions.sort(
    (a, b) =>
      b.impact * 0.35 +
      b.leverage * 0.3 +
      b.urgency * 0.25 -
      b.effort * 0.15 -
      (a.impact * 0.35 + a.leverage * 0.3 + a.urgency * 0.25 - a.effort * 0.15),
  );
  return actions.slice(0, 5).map((a, i) => ({ ...a, rank: i + 1 }));
}
