import { z } from "zod";
import { DOMAIN_IDS, EPISTEMIC_LABELS, EVIDENCE_LEVELS, EVENT_TYPES, INPUT_MODES } from "../types";
import type { ExtractedPiece } from "../engines/heuristic";
import { normalizeDomainIds } from "../ontology";
import type { EventType, EpistemicStatus, EvidenceLevel } from "../types";

export const PieceSchema = z.object({
  summary: z.string(),
  event_type: z.enum(EVENT_TYPES),
  epistemic_status: z.enum(EPISTEMIC_LABELS),
  evidence_level: z.enum(EVIDENCE_LEVELS),
  confidence: z.number(),
  domain_ids: z.array(z.string()),
  tags: z.array(z.string()),
  event_time: z.string().nullable(),
  measurement_value: z.number().nullable(),
  measurement_unit: z.string().nullable(),
  measurement_name: z.string().nullable(),
  location: z.string().nullable(),
  entities: z.array(z.object({ name: z.string(), type: z.string() })),
  money_amount: z.number().nullable(),
  money_currency: z.string().nullable(),
  money_direction: z.enum(["in", "out", "neutral"]).nullable(),
  money_category: z.string().nullable(),
  legal_effect: z.string().nullable(),
  health_or_performance_effect: z.string().nullable(),
  capability_effect: z.string().nullable(),
  social_effect: z.string().nullable(),
  opportunity_effect: z.string().nullable(),
  risk_effect: z.string().nullable(),
  fact_key: z.string().nullable(),
  fact_value: z.string().nullable(),
  fact_unit: z.string().nullable(),
  world_research_trigger: z.boolean(),
  door_name: z.string().nullable(),
  door_category: z.string().nullable(),
  door_location: z.string().nullable(),
  door_requirements: z.array(z.string()),
  door_missing: z.array(z.string()),
  reversibility: z.enum(["reversible", "costly", "irreversible", "unknown"]),
});

export const ExtractionSchema = z.object({
  mode: z.enum(INPUT_MODES),
  needs_clarification: z.boolean(),
  clarification_question: z.string().nullable(),
  events: z.array(PieceSchema),
});

export const MASTER_DIRECTIVE = `You are the intelligence engine of LifeOS (PRIME_WORLD_ENGINE).
Treat every user message as potentially containing multiple pieces of reality.
Extract carefully. Preserve meaning. Separate facts, claims, intentions, inferences and hypotheses.
Do not fabricate. Do not turn feelings into objective facts.
Do not invent scores. Do not assume completion of goals.
Ask a clarification ONLY if ambiguity can materially change a legal, financial, health/safety conclusion, or important state value.
Otherwise organize intelligently and mark uncertainty.
A single message may split into multiple events and multiple domains.
New tags/entities only from evidence in the input.
Hours worked are load, not progress. Trading income is not salary.
Language unit counts are not CEFR levels.
An internship mention is a Door candidate, not an open Door.
Return structured extraction only.`;

export function jsonSchema(): Record<string, unknown> {
  return {
    type: "object",
    additionalProperties: false,
    required: ["mode", "needs_clarification", "clarification_question", "events"],
    properties: {
      mode: { type: "string", enum: [...INPUT_MODES] },
      needs_clarification: { type: "boolean" },
      clarification_question: { type: ["string", "null"] },
      events: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "summary",
            "event_type",
            "epistemic_status",
            "evidence_level",
            "confidence",
            "domain_ids",
            "tags",
            "event_time",
            "measurement_value",
            "measurement_unit",
            "measurement_name",
            "location",
            "entities",
            "money_amount",
            "money_currency",
            "money_direction",
            "money_category",
            "legal_effect",
            "health_or_performance_effect",
            "capability_effect",
            "social_effect",
            "opportunity_effect",
            "risk_effect",
            "fact_key",
            "fact_value",
            "fact_unit",
            "world_research_trigger",
            "door_name",
            "door_category",
            "door_location",
            "door_requirements",
            "door_missing",
            "reversibility",
          ],
          properties: {
            summary: { type: "string" },
            event_type: { type: "string", enum: [...EVENT_TYPES] },
            epistemic_status: { type: "string", enum: [...EPISTEMIC_LABELS] },
            evidence_level: { type: "string", enum: [...EVIDENCE_LEVELS] },
            confidence: { type: "number" },
            domain_ids: {
              type: "array",
              items: { type: "string", enum: [...DOMAIN_IDS] },
            },
            tags: { type: "array", items: { type: "string" } },
            event_time: { type: ["string", "null"] },
            measurement_value: { type: ["number", "null"] },
            measurement_unit: { type: ["string", "null"] },
            measurement_name: { type: ["string", "null"] },
            location: { type: ["string", "null"] },
            entities: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                required: ["name", "type"],
                properties: {
                  name: { type: "string" },
                  type: { type: "string" },
                },
              },
            },
            money_amount: { type: ["number", "null"] },
            money_currency: { type: ["string", "null"] },
            money_direction: { type: ["string", "null"], enum: ["in", "out", "neutral", null] },
            money_category: { type: ["string", "null"] },
            legal_effect: { type: ["string", "null"] },
            health_or_performance_effect: { type: ["string", "null"] },
            capability_effect: { type: ["string", "null"] },
            social_effect: { type: ["string", "null"] },
            opportunity_effect: { type: ["string", "null"] },
            risk_effect: { type: ["string", "null"] },
            fact_key: { type: ["string", "null"] },
            fact_value: { type: ["string", "null"] },
            fact_unit: { type: ["string", "null"] },
            world_research_trigger: { type: "boolean" },
            door_name: { type: ["string", "null"] },
            door_category: { type: ["string", "null"] },
            door_location: { type: ["string", "null"] },
            door_requirements: { type: "array", items: { type: "string" } },
            door_missing: { type: "array", items: { type: "string" } },
            reversibility: {
              type: "string",
              enum: ["reversible", "costly", "irreversible", "unknown"],
            },
          },
        },
      },
    },
  };
}

export function pieceFromExtraction(p: z.infer<typeof PieceSchema>): ExtractedPiece {
  const domains = normalizeDomainIds(p.domain_ids);
  const factNum =
    p.fact_value != null && p.fact_value !== "" && !Number.isNaN(Number(p.fact_value))
      ? Number(p.fact_value)
      : p.fact_value;
  return {
    summary: p.summary,
    event_type: p.event_type as EventType,
    epistemic_status: p.epistemic_status as EpistemicStatus,
    evidence_level: p.evidence_level as EvidenceLevel,
    confidence: Math.max(0, Math.min(1, p.confidence)),
    domain_ids: domains,
    tags: p.tags,
    fact_payload: {
      fact_key: p.fact_key,
      fact_value: factNum,
      fact_unit: p.fact_unit,
    },
    measurement:
      p.measurement_value != null
        ? {
            value: p.measurement_value,
            unit: p.measurement_unit,
            quantity_type: p.measurement_name,
            name: p.measurement_name,
          }
        : null,
    location: p.location,
    entities: p.entities,
    financial_effect:
      p.money_amount != null && p.money_direction
        ? {
            amount: p.money_amount,
            currency: p.money_currency || "EUR",
            direction: p.money_direction,
            category: p.money_category || "unspecified",
          }
        : null,
    legal_effect: p.legal_effect,
    health_or_performance_effect: p.health_or_performance_effect,
    capability_effect: p.capability_effect,
    social_effect: p.social_effect,
    opportunity_effect: p.opportunity_effect,
    risk_effect: p.risk_effect,
    world_research_trigger: p.world_research_trigger,
    door_candidate: p.door_name
      ? {
          name: p.door_name,
          category: p.door_category || "opportunity",
          location: p.door_location,
          requirements: p.door_requirements,
          missing_requirements: p.door_missing,
        }
      : null,
    fact_key: p.fact_key,
    fact_value: factNum,
    fact_unit: p.fact_unit,
  };
}

export function emptyExtraction(): { mode: "SINGLE_EVENT"; needs_clarification: false; clarification_question: null; pieces: ExtractedPiece[] } {
  return { mode: "SINGLE_EVENT", needs_clarification: false, clarification_question: null, pieces: [] };
}
