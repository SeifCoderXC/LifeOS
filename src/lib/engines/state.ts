import { nid, nowIso } from "../id";
import type {
  DerivedMetric,
  FactRecord,
  Ledger,
  LifeEvent,
  StateDimension,
  StateSnapshot,
} from "../types";
import { STATE_DIMENSIONS } from "../types";

function metric(
  dimension: StateDimension,
  partial: Omit<DerivedMetric, "dimension" | "calculated_at">,
): DerivedMetric {
  return {
    dimension,
    calculated_at: nowIso(),
    ...partial,
  };
}

function eventsFor(events: LifeEvent[], pred: (e: LifeEvent) => boolean) {
  return events.filter(pred);
}

function sumMoney(events: LifeEvent[], direction: "in" | "out") {
  return events.reduce((acc, e) => {
    const f = e.financial_effect;
    if (!f || f.direction !== direction) return acc;
    return acc + f.amount;
  }, 0);
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function avg(nums: number[]) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function rebuildFacts(events: LifeEvent[]): Record<string, FactRecord> {
  const facts: Record<string, FactRecord> = {};
  for (const e of events) {
    const key = (e.fact_payload.fact_key as string | undefined) ?? null;
    if (!key) continue;
    const value = (e.fact_payload.fact_value as string | number | boolean | null) ?? null;
    const unit = (e.fact_payload.fact_unit as string | null) ?? e.measurement?.unit ?? null;
    const prev = facts[key];
    facts[key] = {
      fact_key: key,
      value,
      unit,
      event_id: e.event_id,
      recorded_at: e.event_time,
      evidence_level: e.evidence_level,
      epistemic_status: e.epistemic_status,
      confidence: e.confidence,
      superseded: false,
      history_event_ids: prev ? [...prev.history_event_ids, e.event_id] : [e.event_id],
    };
    if (prev) prev.superseded = true;
  }
  return facts;
}

export function calculateState(
  ledger: Ledger,
  triggerEventId: string | null,
): StateSnapshot {
  const events = ledger.events;
  const facts = rebuildFacts(events);
  const previous = ledger.snapshots.at(-1) ?? null;
  const prevVal = (d: StateDimension) => previous?.dimensions[d]?.value ?? null;

  const incomeEvents = eventsFor(events, (e) => e.financial_effect?.direction === "in");
  const expenseEvents = eventsFor(events, (e) => e.financial_effect?.direction === "out");
  const income = sumMoney(events, "in");
  const expenses = sumMoney(events, "out");
  const net = income - expenses;

  const learningEvents = eventsFor(events, (e) => e.domain_ids.includes("LEARNING"));
  const bodyEvents = eventsFor(events, (e) => e.domain_ids.includes("BODY"));
  const careerEvents = eventsFor(events, (e) => e.domain_ids.includes("CAREER"));
  const techEvents = eventsFor(events, (e) => e.domain_ids.includes("TECH"));
  const legalEvents = eventsFor(events, (e) => e.domain_ids.includes("LEGAL"));
  const socialEvents = eventsFor(events, (e) => e.domain_ids.includes("SOCIAL"));
  const goalEvents = eventsFor(events, (e) => e.domain_ids.includes("GOALS") || e.event_type === "goal");
  const riskEvents = eventsFor(events, (e) => e.domain_ids.includes("RISK") || e.event_type === "risk_signal");
  const mobilityEvents = eventsFor(events, (e) => e.domain_ids.includes("MOBILITY"));
  const eduEvents = eventsFor(events, (e) => e.domain_ids.includes("EDUCATION"));
  const mindEvents = eventsFor(events, (e) => e.domain_ids.includes("MIND"));

  const evidenceScore =
    events.length === 0
      ? 0
      : avg(
          events.map((e) => {
            const map = { E0: 0.15, E1: 0.4, E2: 0.65, E3: 0.85, E4: 1 };
            return map[e.evidence_level];
          }),
        );

  const openDoors = ledger.doors.filter((d) =>
    ["OPEN", "HIGH_CONFIDENCE_ACCESS", "PARTIALLY_OPEN"].includes(d.state),
  ).length;
  const blocked = ledger.doors.filter((d) => d.state === "BLOCKED" || d.state === "LOCKED").length;

  const monthlyBurnUnknown = expenses === 0 && income === 0;
  const runwayDays =
    net > 0 && expenses > 0 ? Math.round((net / expenses) * 30) : null;

  const wordUnits = learningEvents
    .filter((e) => e.measurement?.name === "words_learned" || e.measurement?.name === "sentences_learned")
    .reduce((a, e) => a + (e.measurement?.value ?? 0), 0);

  const muscleKg = bodyEvents
    .filter((e) => e.measurement?.name === "lean_muscle")
    .reduce((a, e) => a + (e.measurement?.value ?? 0), 0);

  const dimensions: Record<StateDimension, DerivedMetric> = {
    health_condition: metric("health_condition", {
      value: bodyEvents.length ? clamp01(0.45 + muscleKg * 0.05 - (mindEvents.some((e) => /exhaust/.test(e.summary.toLowerCase())) ? 0.08 : 0)) : null,
      display: bodyEvents.length ? (muscleKg ? `+${muscleKg} kg recorded lean mass (self-reported)` : `${bodyEvents.length} body events`) : "no measurements",
      unit: null,
      formula: "Presence of BODY events; lean-mass sum is recorded quantity, not a health diagnosis. Exhaustion events apply a small modeled penalty.",
      source_event_ids: bodyEvents.map((e) => e.event_id),
      confidence: bodyEvents.length ? avg(bodyEvents.map((e) => e.confidence)) : 0,
      change_type: muscleKg ? "measured" : bodyEvents.length ? "modeled" : "unknown",
      previous_value: prevVal("health_condition"),
      delta: null,
      notes: "Not a medical score. Quantity of evidence only.",
    }),
    physical_capability: metric("physical_capability", {
      value: muscleKg || (bodyEvents.length ? 0.2 : null),
      display: muscleKg ? `${muscleKg} kg lean muscle (cumulative self-report)` : "insufficient capability tests",
      unit: muscleKg ? "kg" : null,
      formula: "SUM(measurement.lean_muscle). Activity without a test does not increase capability.",
      source_event_ids: bodyEvents.filter((e) => e.measurement?.name === "lean_muscle").map((e) => e.event_id),
      confidence: muscleKg ? 0.5 : 0,
      change_type: muscleKg ? "measured" : "unknown",
      previous_value: prevVal("physical_capability"),
      delta: null,
      notes: "Self-reported mass is not independently verified.",
    }),
    knowledge: metric("knowledge", {
      value: wordUnits || (learningEvents.length ? learningEvents.length * 0.1 : null),
      display: wordUnits
        ? `${wordUnits} language units logged (words/sentences) — not a fluency score`
        : learningEvents.length
          ? `${learningEvents.length} learning events, no calibrated skill model`
          : "no learning evidence",
      unit: wordUnits ? "units" : null,
      formula: "SUM(language units). Fluency is not inferred from volume.",
      source_event_ids: learningEvents.map((e) => e.event_id),
      confidence: learningEvents.length ? 0.45 : 0,
      change_type: wordUnits ? "measured" : "unknown",
      previous_value: prevVal("knowledge"),
      delta: null,
      notes: "False precision avoided: 10 words ≠ A1.",
    }),
    skill_capability: metric("skill_capability", {
      value: techEvents.length ? clamp01(0.2 + techEvents.length * 0.05) : null,
      display: techEvents.length
        ? `${techEvents.length} tech/skill evidence items (not a skill rating)`
        : "no skill evidence",
      unit: null,
      formula: "Count of TECH events as evidence density, capped. No invented proficiency.",
      source_event_ids: techEvents.map((e) => e.event_id),
      confidence: techEvents.length ? 0.35 : 0,
      change_type: "modeled",
      previous_value: prevVal("skill_capability"),
      delta: null,
      notes: "Portfolio artifacts would raise evidence level.",
    }),
    credential_strength: metric("credential_strength", {
      value: eduEvents.filter((e) => e.event_type === "credential").length ? 0.5 : null,
      display: eduEvents.length ? `${eduEvents.length} education records; credentials only if typed as credential` : "none recorded",
      unit: null,
      formula: "Count of credential events. Mentions of study are not credentials.",
      source_event_ids: eduEvents.map((e) => e.event_id),
      confidence: 0.4,
      change_type: "measured",
      previous_value: prevVal("credential_strength"),
      delta: null,
      notes: "",
    }),
    professional_capital: metric("professional_capital", {
      value: careerEvents.length ? clamp01(0.15 + careerEvents.length * 0.07) : null,
      display: careerEvents.length ? `${careerEvents.length} career events` : "no career evidence",
      unit: null,
      formula: "Evidence density from CAREER events. A CV edit is process, not market value.",
      source_event_ids: careerEvents.map((e) => e.event_id),
      confidence: careerEvents.length ? avg(careerEvents.map((e) => e.confidence)) : 0,
      change_type: "modeled",
      previous_value: prevVal("professional_capital"),
      delta: null,
      notes: "Reply from a company is a signal, not an offer.",
    }),
    network_capital: metric("network_capital", {
      value: socialEvents.length ? clamp01(socialEvents.length * 0.08) : null,
      display: socialEvents.length ? `${socialEvents.length} network events` : "no network evidence",
      unit: null,
      formula: "Count of SOCIAL events. Weak-tie replies counted as evidence, not as capital stock.",
      source_event_ids: socialEvents.map((e) => e.event_id),
      confidence: 0.35,
      change_type: "modeled",
      previous_value: prevVal("network_capital"),
      delta: null,
      notes: "",
    }),
    financial_position: metric("financial_position", {
      value: incomeEvents.length || expenseEvents.length ? net : null,
      display:
        incomeEvents.length || expenseEvents.length
          ? `net ${net.toFixed(2)} (in ${income.toFixed(2)} / out ${expenses.toFixed(2)})`
          : "no financial events",
      unit: "EUR-equivalent mixed",
      formula: "SUM(inflows) - SUM(outflows) from financial_effect. Mixed currencies are not FX-adjusted.",
      source_event_ids: [...incomeEvents, ...expenseEvents].map((e) => e.event_id),
      confidence: incomeEvents.length || expenseEvents.length ? 0.55 : 0,
      change_type: "measured",
      previous_value: prevVal("financial_position"),
      delta: previous ? net - (prevVal("financial_position") ?? 0) : net,
      notes: "Not a bank balance unless the user stated a balance.",
    }),
    financial_runway: metric("financial_runway", {
      value: runwayDays,
      display: monthlyBurnUnknown
        ? "runway unknown — no burn baseline"
        : runwayDays != null
          ? `~${runwayDays} day-equivalents on recorded net/outflow (fragile)`
          : "insufficient burn data",
      unit: runwayDays != null ? "days" : null,
      formula: "If outflows exist: (net / outflows) * 30. Otherwise unknown.",
      source_event_ids: [...incomeEvents, ...expenseEvents].map((e) => e.event_id),
      confidence: runwayDays != null ? 0.25 : 0,
      change_type: "modeled",
      previous_value: prevVal("financial_runway"),
      delta: null,
      notes: "Low confidence. Trading income is not a salary.",
    }),
    legal_resilience: metric("legal_resilience", {
      value: legalEvents.length
        ? clamp01(
            0.4 -
              (legalEvents.some((e) => /difficult|risk|expir|reject/.test(e.summary.toLowerCase()))
                ? 0.2
                : 0),
          )
        : null,
      display: legalEvents.length
        ? `${legalEvents.length} legal/admin signals`
        : "no legal records",
      unit: null,
      formula: "Presence of LEGAL events; strained language lowers modeled resilience. Not a legal opinion.",
      source_event_ids: legalEvents.map((e) => e.event_id),
      confidence: legalEvents.length ? 0.3 : 0,
      change_type: "modeled",
      previous_value: prevVal("legal_resilience"),
      delta: null,
      notes: "Requires documents and official sources for high confidence.",
    }),
    mobility: metric("mobility", {
      value: mobilityEvents.length ? clamp01(0.3 + mobilityEvents.length * 0.1) : null,
      display: mobilityEvents.length ? `${mobilityEvents.length} mobility events` : "no mobility records",
      unit: null,
      formula: "Count of MOBILITY events. Access rights are not inferred from city names alone.",
      source_event_ids: mobilityEvents.map((e) => e.event_id),
      confidence: 0.3,
      change_type: "modeled",
      previous_value: prevVal("mobility"),
      delta: null,
      notes: "",
    }),
    environment_quality: metric("environment_quality", {
      value: null,
      display: "not measured",
      unit: null,
      formula: "Requires explicit environment evidence.",
      source_event_ids: [],
      confidence: 0,
      change_type: "unknown",
      previous_value: prevVal("environment_quality"),
      delta: null,
      notes: "",
    }),
    optionality: metric("optionality", {
      value: ledger.doors.length ? clamp01(openDoors * 0.15 + ledger.doors.length * 0.05) : null,
      display: `${openDoors} accessible-ish doors / ${ledger.doors.length} tracked`,
      unit: null,
      formula: "f(open_or_partial doors, total doors). Locked doors do not add optionality.",
      source_event_ids: ledger.doors.flatMap((d) => d.source_event_ids),
      confidence: ledger.doors.length ? 0.4 : 0,
      change_type: "modeled",
      previous_value: prevVal("optionality"),
      delta: null,
      notes: "",
    }),
    risk_exposure: metric("risk_exposure", {
      value: riskEvents.length || ledger.risks.filter((r) => r.active).length
        ? clamp01(
            0.2 +
              riskEvents.length * 0.08 +
              ledger.risks.filter((r) => r.active).reduce((a, r) => a + r.severity, 0) * 0.05,
          )
        : null,
      display: `${ledger.risks.filter((r) => r.active).length} active risks, ${riskEvents.length} risk signals`,
      unit: null,
      formula: "Active risks severity + RISK-domain events. Higher is worse.",
      source_event_ids: riskEvents.map((e) => e.event_id),
      confidence: riskEvents.length ? 0.4 : 0,
      change_type: "modeled",
      previous_value: prevVal("risk_exposure"),
      delta: null,
      notes: "Feelings are not objective hazards.",
    }),
    goal_progress: metric("goal_progress", {
      value: goalEvents.length ? clamp01(goalEvents.length * 0.1) : null,
      display: goalEvents.length ? `${goalEvents.length} goal-related events` : "no declared goals in ledger",
      unit: null,
      formula: "Goal-tagged events only. Activity is not progress.",
      source_event_ids: goalEvents.map((e) => e.event_id),
      confidence: 0.3,
      change_type: "modeled",
      previous_value: prevVal("goal_progress"),
      delta: null,
      notes: "",
    }),
    data_quality: metric("data_quality", {
      value: events.length ? clamp01(evidenceScore * 0.7 + (events.length > 5 ? 0.15 : 0) - ledger.contradictions.length * 0.05) : 0,
      display: events.length ? `evidence avg ${evidenceScore.toFixed(2)}, ${ledger.contradictions.length} contradictions` : "empty ledger",
      unit: null,
      formula: "mean(evidence_level_weight) - 0.05*contradictions. Empty ledger = 0.",
      source_event_ids: events.slice(-12).map((e) => e.event_id),
      confidence: 0.8,
      change_type: "measured",
      previous_value: prevVal("data_quality"),
      delta: null,
      notes: "",
    }),
    world_alignment: metric("world_alignment", {
      value: ledger.world_facts.length ? clamp01(0.3 + ledger.world_facts.length * 0.1) : 0,
      display: ledger.world_facts.length
        ? `${ledger.world_facts.length} external facts cached`
        : "no external verification yet",
      unit: null,
      formula: "Count of retrieved world facts. Zero if research was not performed.",
      source_event_ids: [],
      confidence: ledger.world_facts.length ? 0.5 : 0,
      change_type: ledger.world_facts.length ? "measured" : "unknown",
      previous_value: prevVal("world_alignment"),
      delta: null,
      notes: "Never implied if search did not run.",
    }),
  };

  for (const dim of STATE_DIMENSIONS) {
    const m = dimensions[dim];
    const prev = prevVal(dim);
    if (m.value != null && prev != null && m.delta == null) {
      m.delta = Number((m.value - prev).toFixed(4));
    }
  }

  return {
    snapshot_id: nid("snap"),
    created_at: nowIso(),
    trigger_event_id: triggerEventId,
    checkpoint: false,
    dimensions,
    facts,
  };
}
