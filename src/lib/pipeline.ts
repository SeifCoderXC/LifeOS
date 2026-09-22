import {
  appendContradiction,
  appendEvents,
  appendFeedback,
  appendImpacts,
  appendIntake,
  appendMilestone,
  appendSnapshot,
  appendWorldFact,
  latestSnapshot,
  previousSnapshot,
  readLedger,
  updateAchievement,
  upsertDoor,
  upsertRisk,
  withLedger,
} from "./db";
import { nid, nowIso } from "./id";
import { grokConfigured, grokExtract, grokWorldResearch, modelName } from "./ai/grok";
import { geminiConfigured, geminiExtract, geminiModelName } from "./ai/gemini";
import { canUseDeepMode, recordDeepModeCall, type AuthUser } from "./auth";
import { heuristicExtract, type ExtractedPiece } from "./engines/heuristic";
import { detectContradictions } from "./engines/contradiction";
import { analyzeImpact } from "./engines/impact";
import { detectMilestones } from "./engines/milestones";
import {
  applyEvidenceToSeededDoors,
  doorsFromLegalRisk,
  ensureSeededStrategicDoors,
  ingestDoorCandidates,
  reevaluateDoors,
} from "./engines/doors";
import { detectRisks } from "./engines/risks";
import { calculateState } from "./engines/state";
import { buildFeedback } from "./engines/feedback";
import { computeDataHealth } from "./engines/data-health";
import { rankActions } from "./engines/priority";
import { buildScene } from "./engines/scene";
import { weeklyReport } from "./engines/weekly";
import { buildScenarios } from "./engines/scenarios";
import type {
  FeedbackPacket,
  Intake,
  Ledger,
  LifeEvent,
  SnapshotPayload,
} from "./types";

function pieceToEvent(
  piece: ExtractedPiece,
  raw: string,
  intakeId: string,
  provenance: LifeEvent["provenance"],
): LifeEvent {
  return {
    event_id: nid("evt"),
    intake_id: intakeId,
    recorded_at: nowIso(),
    event_time: nowIso(),
    raw_input: raw,
    summary: piece.summary,
    event_type: piece.event_type,
    epistemic_status: piece.epistemic_status,
    evidence_level: piece.evidence_level,
    confidence: piece.confidence,
    domain_ids: piece.domain_ids,
    tags: piece.tags,
    fact_payload: {
      ...piece.fact_payload,
      fact_key: piece.fact_key,
      fact_value: piece.fact_value,
      fact_unit: piece.fact_unit,
    },
    provenance,
    measurement: piece.measurement,
    location: piece.location,
    entities: piece.entities,
    financial_effect: piece.financial_effect,
    legal_effect: piece.legal_effect,
    health_or_performance_effect: piece.health_or_performance_effect,
    capability_effect: piece.capability_effect,
    social_effect: piece.social_effect,
    opportunity_effect: piece.opportunity_effect,
    risk_effect: piece.risk_effect,
    reversibility: "unknown",
    source_urls: [],
    contradiction_links: [],
    user_confirmation_status: "unconfirmed",
    derived_metrics_affected: [],
    world_research_trigger: piece.world_research_trigger,
  };
}

function contextBlurb(ledger: Ledger) {
  const last = ledger.events.slice(-12);
  if (!last.length) return "Empty ledger. No prior personal facts.";
  return last
    .map(
      (e) =>
        `- ${e.event_time.slice(0, 10)} [${e.domain_ids.join(",")}] ${e.summary} (${e.epistemic_status}/${e.evidence_level})`,
    )
    .join("\n");
}

function touchAchievements(ledger: Ledger, events: LifeEvent[]) {
  const body = ledger.events.some((e) => e.domain_ids.includes("BODY") && e.event_type !== "emotion");
  const income = ledger.events.some((e) => e.financial_effect?.direction === "in");
  const career = ledger.events.some((e) => e.domain_ids.includes("CAREER"));
  const learning = ledger.events.some((e) => e.domain_ids.includes("LEARNING"));

  const prime = ledger.achievements.find((a) => a.achievement_id === "ach_prime_presence");
  if (prime) {
    const ids = events.filter((e) => e.domain_ids.includes("BODY")).map((e) => e.event_id);
    updateAchievement(ledger, prime.achievement_id, {
      evidence_event_ids: [...prime.evidence_event_ids, ...ids],
      status: body ? "in_progress" : "seeded",
      phase_index: body ? 1 : 0,
      notes: body
        ? "Evidence exists. Not complete. Phases are not ceremonial badges."
        : "Seeded. No body evidence yet.",
    });
  }
  const sov = ledger.achievements.find((a) => a.achievement_id === "ach_sovereign_professional");
  if (sov) {
    const ids = events
      .filter((e) => e.domain_ids.includes("CAREER") || e.domain_ids.includes("TECH") || e.financial_effect)
      .map((e) => e.event_id);
    let phase = 0;
    if (career || learning) phase = 1;
    if (income) phase = 2;
    updateAchievement(ledger, sov.achievement_id, {
      evidence_event_ids: [...sov.evidence_event_ids, ...ids],
      status: career || income || learning ? "in_progress" : "seeded",
      phase_index: phase,
      notes: income
        ? "Inflow recorded. Monetization is in progress, not proven durable."
        : "Seeded. Blueprint starts when tech/career evidence appears.",
    });
  }
}

export async function ingestReality(
  user: AuthUser,
  rawInput: string,
  options: { deep?: boolean } = {},
): Promise<{
  intake: Intake;
  events: LifeEvent[];
  feedback: FeedbackPacket;
  snapshot: SnapshotPayload;
  grok_error?: string;
  research_error?: string;
  ai_used: "grok" | "gemini" | "heuristic";
  ai_fallback: boolean;
  ai_fallback_reason?: string;
}> {
  const raw = rawInput.trim();
  if (!raw) throw new Error("Empty input");
  const deepModeEligible = await canUseDeepMode(user);
  const deep = Boolean(options.deep) && deepModeEligible;
  const ledgerPreview = await readLedger(user.id);
  const heuristic = heuristicExtract(raw);

  let grokUsed = false;
  let geminiUsed = false;
  let grokError: string | undefined;
  let geminiError: string | undefined;
  let aiAttempted = false;
  let extraction = heuristic;

  if (heuristic.mode !== "COMMAND") {
    if (grokConfigured() && deepModeEligible) {
      aiAttempted = true;
      const g = await grokExtract(raw, contextBlurb(ledgerPreview));
      if (g.used && g.result.pieces.length) {
        extraction = g.result;
        grokUsed = true;
        await recordDeepModeCall(user.id);
      } else if (g.error) {
        grokError = g.error;
      }
    } else if (geminiConfigured()) {
      aiAttempted = true;
      const g = await geminiExtract(raw, contextBlurb(ledgerPreview));
      if (g.used && g.result.pieces.length) {
        extraction = g.result;
        geminiUsed = true;
      } else if (g.error) {
        geminiError = g.error;
      }
    }
  }

  const aiFallback = aiAttempted && !grokUsed && !geminiUsed;

  const intakeId = nid("in");
  const provenance: LifeEvent["provenance"] = grokUsed
    ? { method: "grok", model: modelName(), retrieved_at: nowIso() }
    : geminiUsed
      ? { method: "gemini", model: geminiModelName(), retrieved_at: nowIso() }
      : {
          method: "heuristic",
          notes: grokError || geminiError || "Heuristic parser used (no AI provider configured).",
        };

  const events = extraction.pieces.map((p) => pieceToEvent(p, raw, intakeId, provenance));

  let researchPerformed = false;
  let researchError: string | undefined;
  const researchClaims: Array<{
    claim: string;
    topic: string;
    source_urls: string[];
    confidence: number;
  }> = [];

  const shouldResearch =
    deep &&
    grokConfigured() &&
    deepModeEligible &&
    (extraction.mode === "RESEARCH_REQUEST" || events.some((e) => e.world_research_trigger));

  if (shouldResearch) {
    await recordDeepModeCall(user.id);
    const q = [
      "LifeOS world research. Verify current external facts relevant to this user input.",
      `Input: ${raw}`,
      events
        .filter((e) => e.world_research_trigger)
        .map((e) => `Trigger event: ${e.summary} location=${e.location ?? ""}`)
        .join("\n"),
      "Prefer official sources for visas, internships, language requirements, salaries.",
    ].join("\n");
    const wr = await grokWorldResearch(q);
    researchPerformed = wr.performed;
    researchError = wr.error;
    researchClaims.push(...wr.claims);
  }

  const committed = await withLedger(user.id, (ledger) => {
    ensureSeededStrategicDoors(ledger);
    const intake: Intake = {
      intake_id: intakeId,
      raw_input: raw,
      recorded_at: nowIso(),
      mode: extraction.mode,
      event_ids: events.map((e) => e.event_id),
      needs_clarification: extraction.needs_clarification,
      clarification_question: extraction.clarification_question,
      grok_used: grokUsed,
    };
    appendIntake(ledger, intake);

    const contradictions = detectContradictions(ledger, events);
    for (const c of contradictions) appendContradiction(ledger, c);

    appendEvents(ledger, events);

    for (const e of events) {
      const piece = extraction.pieces[events.indexOf(e)];
      const door = ingestDoorCandidates(ledger, e, piece);
      if (door) upsertDoor(ledger, door);
      const legalDoor = doorsFromLegalRisk(ledger, e);
      if (legalDoor) upsertDoor(ledger, legalDoor);
      appendImpacts(ledger, analyzeImpact(e, ledger));
    }

    for (const r of detectRisks(ledger, events)) upsertRisk(ledger, r);
    for (const m of detectMilestones(ledger, events)) appendMilestone(ledger, m);

    applyEvidenceToSeededDoors(ledger);
    reevaluateDoors(ledger);
    touchAchievements(ledger, events);

    for (const claim of researchClaims) {
      appendWorldFact(ledger, {
        world_fact_id: nid("wf"),
        recorded_at: nowIso(),
        claim: claim.claim,
        source_urls: claim.source_urls,
        retrieved_at: nowIso(),
        confidence: claim.confidence,
        related_door_ids: ledger.doors.slice(-3).map((d) => d.door_id),
        related_event_ids: events.map((e) => e.event_id),
        topic: claim.topic,
      });
    }

    const before = latestSnapshot(ledger);
    const after = calculateState(ledger, events.at(-1)?.event_id ?? null);
    appendSnapshot(ledger, after);

    const feedback = buildFeedback({
      ledger,
      intakeId,
      mode: deep ? "deep" : "fast",
      inputMode: extraction.mode,
      events,
      before,
      after,
      grokUsed,
      researchPerformed,
      clarification: extraction.clarification_question,
    });
    appendFeedback(ledger, feedback);

    return { intake, events, feedback, after };
  });

  return {
    intake: committed.intake,
    events: committed.events,
    feedback: committed.feedback,
    snapshot: await assembleSnapshot(user.id),
    grok_error: grokError,
    research_error: researchError,
    ai_used: grokUsed ? "grok" : geminiUsed ? "gemini" : "heuristic",
    ai_fallback: aiFallback,
    ai_fallback_reason: aiFallback ? grokError || geminiError : undefined,
  };
}

export async function assembleSnapshot(userId: string): Promise<SnapshotPayload> {
  const ledger = await readLedger(userId);
  ensureSeededStrategicDoors(ledger);
  const state = latestSnapshot(ledger) ?? calculateState(ledger, null);
  const prev = previousSnapshot(ledger);
  const scene = buildScene(ledger, state);
  const data_health = computeDataHealth(ledger);
  const priorities = state ? rankActions(ledger, state) : [];
  return {
    ledger_created_at: ledger.created_at,
    event_count: ledger.events.length,
    last_intake_at: ledger.intakes.at(-1)?.recorded_at ?? null,
    last_feedback: ledger.feedback.at(-1) ?? null,
    state,
    previous_state: prev,
    doors: ledger.doors,
    milestones: ledger.milestones,
    risks: ledger.risks.filter((r) => r.active),
    contradictions: ledger.contradictions,
    events: [...ledger.events].reverse(),
    world_facts: [...ledger.world_facts].reverse(),
    achievements: ledger.achievements,
    scene,
    data_health,
    priorities,
    grok_configured: grokConfigured(),
    impacts: [...ledger.impacts]
      .reverse()
      .filter((i) => i.layer !== "DIRECT")
      .slice(0, 30),
  };
}

export async function getWeekly(userId: string) {
  const ledger = await readLedger(userId);
  return weeklyReport(ledger);
}

export async function getScenarios(userId: string) {
  const ledger = await readLedger(userId);
  return buildScenarios(ledger, latestSnapshot(ledger));
}

export async function markCheckpoint(userId: string) {
  return withLedger(userId, (ledger) => {
    const snap = ledger.snapshots.at(-1);
    if (snap) snap.checkpoint = true;
    return snap;
  });
}
