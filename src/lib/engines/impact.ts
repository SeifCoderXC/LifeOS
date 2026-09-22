import type { DomainId, Impact, Ledger, LifeEvent } from "../types";

export function analyzeImpact(event: LifeEvent, _ledger: Ledger): Impact[] {
  const impacts: Impact[] = [];
  for (const domain of event.domain_ids) {
    impacts.push({
      event_id: event.event_id,
      layer: "DIRECT",
      domain_id: domain,
      description: event.summary,
      attribution: event.epistemic_status,
      confidence: event.confidence,
    });
  }

  const secondary: Array<{ domain: DomainId; why: string }> = [];
  if (event.financial_effect?.direction === "in") {
    secondary.push({ domain: "RISK", why: "Inflow may slightly reduce short-term cash pressure (modeled, not observed runway)." });
    secondary.push({ domain: "OPPORTUNITY", why: "Cash in hand can fund applications, tools or relocation — only if not already committed." });
  }
  if (event.financial_effect?.direction === "out") {
    secondary.push({ domain: "RISK", why: "Outflow increases cash-pressure if burn baseline is unknown." });
  }
  if (event.domain_ids.includes("LEARNING") && /spanish|lithuanian|language/i.test(event.summary)) {
    secondary.push({
      domain: "MOBILITY",
      why: "Language practice can later change eligibility for local work/study. Not yet a right.",
    });
    secondary.push({
      domain: "CAREER",
      why: "Language units are activity. Market value changes only if a requirement is actually met.",
    });
  }
  if (event.event_type === "opportunity_discovery") {
    secondary.push({ domain: "GOALS", why: "A discovered path can re-rank missions if the user chooses it." });
    secondary.push({ domain: "LEARNING", why: "Missing requirements often imply a skill or language gap." });
  }
  if (event.domain_ids.includes("LEGAL")) {
    secondary.push({ domain: "MOBILITY", why: "Legal status constrains relocation and work rights." });
    secondary.push({ domain: "CAREER", why: "Work authorization can block or open employment doors." });
    secondary.push({ domain: "RISK", why: "Unresolved legal status is a first-order vulnerability." });
  }
  if (/exhaust|11 hours|worked 11/i.test(event.summary)) {
    secondary.push({
      domain: "BODY",
      why: "Long work blocks recovery. Hours worked are not progress.",
    });
  }
  if (/cv|replied/i.test(event.summary)) {
    secondary.push({
      domain: "OPPORTUNITY",
      why: "A reply is a weak-tie signal, not an open door.",
    });
  }

  // AI extraction (Smart/Deep Mode) tags these narrative effects on events the
  // keyword patterns above don't anticipate. Surface them instead of letting
  // them sit unused on the event (same gap already fixed for risk_effect).
  if (event.legal_effect && !event.domain_ids.includes("LEGAL")) {
    secondary.push({ domain: "LEGAL", why: event.legal_effect });
  }
  if (event.health_or_performance_effect && !event.domain_ids.includes("BODY")) {
    secondary.push({ domain: "BODY", why: event.health_or_performance_effect });
  }
  if (event.social_effect && !event.domain_ids.includes("SOCIAL")) {
    secondary.push({ domain: "SOCIAL", why: event.social_effect });
  }
  if (
    event.capability_effect &&
    !event.domain_ids.includes("LEARNING") &&
    !event.domain_ids.includes("TECH")
  ) {
    secondary.push({ domain: "LEARNING", why: event.capability_effect });
  }

  for (const s of secondary) {
    if (event.domain_ids.includes(s.domain)) continue;
    impacts.push({
      event_id: event.event_id,
      layer: "SECONDARY",
      domain_id: s.domain,
      description: s.why,
      attribution: "INFERENCE",
      confidence: Math.max(0.2, event.confidence - 0.25),
    });
  }

  if (event.world_research_trigger || event.event_type === "opportunity_discovery") {
    impacts.push({
      event_id: event.event_id,
      layer: "TERTIARY",
      domain_id: "OPPORTUNITY",
      description:
        "External conditions may change the value of this event — only after research, not before.",
      attribution: "SCENARIO",
      confidence: 0.25,
    });
  }

  return impacts;
}
