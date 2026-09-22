import { nid, nowIso } from "../id";
import type { Door, DoorState, EpistemicStatus, Ledger, LifeEvent } from "../types";
import type { ExtractedPiece } from "./heuristic";

function doorState(missing: string[], blocked: boolean, expired: boolean): DoorState {
  if (expired) return "EXPIRED";
  if (blocked) return "BLOCKED";
  if (!missing.length) return "OPEN";
  if (missing.length <= 2) return "PARTIALLY_OPEN";
  return "LOCKED";
}

export function ingestDoorCandidates(
  ledger: Ledger,
  event: LifeEvent,
  piece: ExtractedPiece,
): Door | null {
  if (!piece.door_candidate) return null;
  const cand = piece.door_candidate;
  const existing = ledger.doors.find(
    (d) => d.name.toLowerCase() === cand.name.toLowerCase() || d.door_id === slug(cand.name),
  );
  const missing = [...cand.missing_requirements];
  const state = doorState(missing, false, false);
  const now = nowIso();
  const door: Door = {
    door_id: existing?.door_id ?? slug(cand.name),
    created_at: existing?.created_at ?? now,
    updated_at: now,
    name: cand.name,
    category: cand.category,
    location: cand.location,
    requirements: cand.requirements,
    current_eligibility: missing.length
      ? `Missing: ${missing.join("; ")}`
      : "No missing requirements recorded — still not independently verified",
    missing_requirements: missing,
    legal_constraints: event.domain_ids.includes("LEGAL")
      ? ["Legal/residence constraints may apply"]
      : [],
    cost: null,
    time_to_access: null,
    deadline: null,
    probability_estimate: missing.length ? 0.25 : 0.45,
    strategic_value: 0.7,
    option_value: 0.6,
    reversibility: "mostly reversible until contract signed",
    evidence: [event.summary],
    next_action: missing.length
      ? `Close gap: ${missing[0]}`
      : "Verify actual listing requirements from a primary source",
    state,
    source_event_ids: [...(existing?.source_event_ids ?? []), event.event_id],
    epistemic_status: "USER_CLAIM" as EpistemicStatus,
  };
  return door;
}

function slug(name: string) {
  return `door_${name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 40)}`;
}

export function reevaluateDoors(ledger: Ledger) {
  const langEvidence = ledger.events.filter((e) =>
    e.domain_ids.includes("LEARNING") && /spanish|lithuanian|language|b2|b1|a2/i.test(e.summary),
  );
  for (const door of ledger.doors) {
    const stillMissing = door.missing_requirements.filter((req) => {
      const l = req.toLowerCase();
      if (/b2 spanish/.test(l)) {
        const hasLevel = langEvidence.some((e) => {
          const s = e.summary.toLowerCase();
          if (/want|require|need|they/.test(s)) return false;
          return /b2/.test(s) && /spanish/.test(s) && /(passed|have|certified|i am|i'm)/.test(s);
        });
        return !hasLevel;
      }
      return true;
    });
    door.missing_requirements = stillMissing;
    door.state = doorState(stillMissing, door.state === "BLOCKED", door.state === "EXPIRED");
    door.updated_at = nowIso();
    if (!stillMissing.length && door.state === "OPEN") {
      door.current_eligibility =
        "Recorded requirements appear satisfied in the ledger. Not independently verified against the live listing.";
      door.epistemic_status = "INFERENCE";
    }
  }
}

export function doorsFromLegalRisk(ledger: Ledger, event: LifeEvent): Door | null {
  if (!event.domain_ids.includes("LEGAL") && event.event_type !== "risk_signal") return null;
  if (!/visa|residence|permit/.test(event.summary.toLowerCase())) return null;
  const id = "door_legal_stability";
  const existing = ledger.doors.find((d) => d.door_id === id);
  const now = nowIso();
  return {
    door_id: id,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    name: "Legal / residence stability",
    category: "legal",
    location: event.location ?? null,
    requirements: ["Valid residence or visa status", "Known expiry", "Work rights if earning"],
    current_eligibility: "User signaled difficulty. Status unverified.",
    missing_requirements: ["Current document details", "Expiry date"],
    legal_constraints: [event.summary],
    cost: null,
    time_to_access: null,
    deadline: null,
    probability_estimate: 0.3,
    strategic_value: 0.95,
    option_value: 0.9,
    reversibility: "often irreversible if overstayed",
    evidence: [event.summary],
    next_action: "Record document type, issuing country, and expiry. Then check the official page.",
    state: "PARTIALLY_OPEN",
    source_event_ids: [...(existing?.source_event_ids ?? []), event.event_id],
    epistemic_status: "USER_CLAIM",
  };
}

export function ensureSeededStrategicDoors(ledger: Ledger) {
  const now = nowIso();
  const seeds: Array<Omit<Door, "created_at" | "updated_at">> = [
    {
      door_id: "door_sovereign_income",
      name: "New income stream",
      category: "career",
      location: null,
      requirements: ["Portfolio evidence", "Offer or client", "Legal right to earn"],
      current_eligibility: "Seeded mission path. Not assumed open.",
      missing_requirements: ["Portfolio evidence", "Offer or client", "Legal right to earn"],
      legal_constraints: [],
      cost: null,
      time_to_access: null,
      deadline: null,
      probability_estimate: null,
      strategic_value: 0.9,
      option_value: 0.85,
      reversibility: "reversible experiments preferred",
      evidence: [],
      next_action: "Ship one visible artifact, then one outreach.",
      state: "LOCKED",
      source_event_ids: [],
      epistemic_status: "SCENARIO",
    },
    {
      door_id: "door_prime_presence",
      name: "Body & presence upgrade",
      category: "body",
      location: null,
      requirements: ["Training consistency", "Nutrition baseline", "Presentation system"],
      current_eligibility: "Seeded mission path. Not assumed complete.",
      missing_requirements: ["Training consistency", "Nutrition baseline", "Presentation system"],
      legal_constraints: [],
      cost: null,
      time_to_access: null,
      deadline: null,
      probability_estimate: null,
      strategic_value: 0.7,
      option_value: 0.5,
      reversibility: "reversible",
      evidence: [],
      next_action: "Log a real training or body measurement, not a vibe.",
      state: "LOCKED",
      source_event_ids: [],
      epistemic_status: "SCENARIO",
    },
  ];
  for (const s of seeds) {
    if (!ledger.doors.some((d) => d.door_id === s.door_id)) {
      ledger.doors.push({ ...s, created_at: now, updated_at: now });
    }
  }
}

export function applyEvidenceToSeededDoors(ledger: Ledger) {
  const income = ledger.events.some((e) => e.financial_effect?.direction === "in");
  const portfolio = ledger.events.some((e) => /cv|portfolio|github|project/i.test(e.summary));
  const training = ledger.events.some((e) => e.domain_ids.includes("BODY") && e.event_type !== "emotion");
  const sov = ledger.doors.find((d) => d.door_id === "door_sovereign_income");
  if (sov) {
    const missing = [
      ...(portfolio ? [] : ["Portfolio evidence"]),
      ...(income ? [] : ["Offer or client"]),
      "Legal right to earn",
    ];
    sov.missing_requirements = missing;
    sov.state = doorState(missing, false, false);
    if (income) sov.evidence = ["Recorded inflow exists — channel not yet classified as durable."];
  }
  const prim = ledger.doors.find((d) => d.door_id === "door_prime_presence");
  if (prim) {
    const missing = [
      ...(training ? [] : ["Training consistency"]),
      "Nutrition baseline",
      "Presentation system",
    ];
    prim.missing_requirements = missing;
    prim.state = doorState(missing, false, false);
  }
}

export function createFreshDoorId() {
  return nid("door");
}
