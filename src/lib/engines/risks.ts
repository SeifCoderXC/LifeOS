import { nid, nowIso } from "../id";
import type { Ledger, LifeEvent, RiskItem } from "../types";

export function detectRisks(ledger: Ledger, fresh: LifeEvent[]): RiskItem[] {
  const out: RiskItem[] = [];
  for (const e of fresh) {
    const l = e.summary.toLowerCase();
    let matched = false;
    if (/visa|residence/.test(l) && /difficult|problem|expir|reject|risk/.test(l)) {
      matched = true;
      out.push({
        risk_id: "risk_legal_status",
        created_at: nowIso(),
        title: "Legal / residence strain",
        domain_ids: ["LEGAL", "MOBILITY", "CAREER"],
        description: e.summary,
        severity: 0.8,
        mitigation: "Capture document facts, then verify against the official immigration source. Do not make irreversible moves on a feeling.",
        event_ids: [e.event_id],
        active: true,
      });
    }
    if (/exhaust|11 hours|burnout/.test(l)) {
      matched = true;
      out.push({
        risk_id: "risk_overwork",
        created_at: nowIso(),
        title: "Overwork / recovery debt",
        domain_ids: ["BODY", "MIND", "OPERATIONS"],
        description: e.summary,
        severity: 0.55,
        mitigation: "Treat hours as a cost. Next action should restore recovery, not add more volume.",
        event_ids: [e.event_id],
        active: true,
      });
    }
    if (e.financial_effect?.category === "trading" && e.financial_effect.direction === "in") {
      matched = true;
      out.push({
        risk_id: "risk_trading_income_quality",
        created_at: nowIso(),
        title: "Income quality: trading",
        domain_ids: ["FINANCE", "RISK"],
        description: "Trading inflow is not equivalent to earned professional income. Do not raise runway confidence.",
        severity: 0.5,
        mitigation: "Keep trading P&L separate from salary/freelance. Size risk. Do not spend assumed future wins.",
        event_ids: [e.event_id],
        active: true,
      });
    }
    // AI extraction (Smart/Deep Mode) tags a risk_effect on events the keyword
    // patterns above don't anticipate (eviction, unpaid rent, health scares, etc.).
    // Surface those too instead of silently discarding a risk the model already found.
    if (!matched && e.risk_effect) {
      out.push({
        risk_id: `risk_ai_${e.event_id}`,
        created_at: nowIso(),
        title: e.risk_effect.length > 70 ? `${e.risk_effect.slice(0, 67)}...` : e.risk_effect,
        domain_ids: e.domain_ids,
        description: e.risk_effect,
        severity: 0.6,
        mitigation: "Flagged from your own words. Verify the facts, then decide if it needs an explicit action.",
        event_ids: [e.event_id],
        active: true,
      });
    }
  }

  const inflows = ledger.events.filter((e) => e.financial_effect?.direction === "in");
  const outflows = ledger.events.filter((e) => e.financial_effect?.direction === "out");
  if (outflows.reduce((a, e) => a + (e.financial_effect?.amount ?? 0), 0) >
      inflows.reduce((a, e) => a + (e.financial_effect?.amount ?? 0), 0) + 1) {
    out.push({
      risk_id: "risk_cash_drain",
      created_at: nowIso(),
      title: "Recorded outflows exceed inflows",
      domain_ids: ["FINANCE", "RISK"],
      description: "Ledger net is negative. This is only as good as recorded events.",
      severity: 0.7,
      mitigation: "Log a true cash snapshot (balance) before making spend decisions.",
      event_ids: fresh.map((e) => e.event_id),
      active: true,
    });
  }
  return out;
}
