import { getDb } from "./firebase";
import type {
  Achievement,
  Contradiction,
  Door,
  FeedbackPacket,
  Impact,
  Intake,
  Ledger,
  LifeEvent,
  Milestone,
  RiskItem,
  StateSnapshot,
  WorldFact,
} from "./types";
import { SEEDED_ACHIEVEMENTS } from "./ontology";

function emptyLedger(): Ledger {
  const now = new Date().toISOString();
  return {
    version: 1,
    created_at: now,
    intakes: [],
    events: [],
    snapshots: [],
    contradictions: [],
    milestones: [],
    risks: [],
    world_facts: [],
    feedback: [],
    achievements: SEEDED_ACHIEVEMENTS.map((a) => ({
      ...a,
      phases: [...a.phases],
      tracking: [...a.tracking],
      phase_index: 0,
      evidence_event_ids: [],
      status: "seeded" as const,
      notes: "Seeded from strategic framework. Not assumed complete. Evaluate against evidence.",
    })),
    entities: [],
    tags: [],
    impacts: [],
    doors: [
      {
        door_id: "door_sovereign_income",
        created_at: now,
        updated_at: now,
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
        created_at: now,
        updated_at: now,
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
    ],
  };
}

function parseLedger(json: string | undefined): Ledger {
  if (!json) return emptyLedger();
  try {
    const parsed = JSON.parse(json) as Ledger;
    if (!parsed.version || !Array.isArray(parsed.events)) return emptyLedger();
    // Backfill fields added after some ledgers were already created.
    if (!Array.isArray(parsed.impacts)) parsed.impacts = [];
    return parsed;
  } catch {
    return emptyLedger();
  }
}

function ledgerDoc(userId: string) {
  return getDb().collection("ledgers").doc(userId);
}

export async function readLedger(userId: string): Promise<Ledger> {
  const snap = await ledgerDoc(userId).get();
  if (!snap.exists) {
    const fresh = emptyLedger();
    await ledgerDoc(userId).set({ data: JSON.stringify(fresh), updatedAt: new Date().toISOString() });
    return fresh;
  }
  return parseLedger(snap.data()?.data as string | undefined);
}

// Firestore transactions make this safe across concurrent requests and
// concurrent server instances (unlike the old single-file SQLite version).
export async function withLedger<T>(userId: string, mutator: (ledger: Ledger) => T): Promise<T> {
  const doc = ledgerDoc(userId);
  return getDb().runTransaction(async (tx) => {
    const snap = await tx.get(doc);
    const ledger = snap.exists ? parseLedger(snap.data()?.data as string | undefined) : emptyLedger();
    const result = mutator(ledger);
    tx.set(doc, { data: JSON.stringify(ledger), updatedAt: new Date().toISOString() });
    return result;
  });
}

export function appendIntake(ledger: Ledger, intake: Intake) {
  ledger.intakes.push(intake);
}

export function appendEvents(ledger: Ledger, events: LifeEvent[]) {
  ledger.events.push(...events);
}

export function appendSnapshot(ledger: Ledger, snapshot: StateSnapshot) {
  ledger.snapshots.push(snapshot);
  if (ledger.snapshots.length > 400) {
    ledger.snapshots = ledger.snapshots.slice(-400);
  }
}

export function appendFeedback(ledger: Ledger, packet: FeedbackPacket) {
  ledger.feedback.push(packet);
  if (ledger.feedback.length > 200) {
    ledger.feedback = ledger.feedback.slice(-200);
  }
}

export function upsertDoor(ledger: Ledger, door: Door) {
  const idx = ledger.doors.findIndex((d) => d.door_id === door.door_id);
  if (idx >= 0) ledger.doors[idx] = door;
  else ledger.doors.push(door);
}

export function appendMilestone(ledger: Ledger, milestone: Milestone) {
  if (ledger.milestones.some((m) => m.name === milestone.name && m.pattern === milestone.pattern)) {
    return;
  }
  ledger.milestones.push(milestone);
}

export function upsertRisk(ledger: Ledger, risk: RiskItem) {
  const idx = ledger.risks.findIndex((r) => r.risk_id === risk.risk_id || r.title === risk.title);
  if (idx >= 0) ledger.risks[idx] = { ...ledger.risks[idx], ...risk };
  else ledger.risks.push(risk);
}

export function appendContradiction(ledger: Ledger, c: Contradiction) {
  ledger.contradictions.push(c);
}

export function appendImpacts(ledger: Ledger, impacts: Impact[]) {
  ledger.impacts.push(...impacts);
  if (ledger.impacts.length > 300) {
    ledger.impacts = ledger.impacts.slice(-300);
  }
}

export function appendWorldFact(ledger: Ledger, fact: WorldFact) {
  ledger.world_facts.push(fact);
}

export function updateAchievement(ledger: Ledger, id: string, patch: Partial<Achievement>) {
  const a = ledger.achievements.find((x) => x.achievement_id === id);
  if (a) Object.assign(a, patch);
}

export function latestSnapshot(ledger: Ledger): StateSnapshot | null {
  return ledger.snapshots.at(-1) ?? null;
}

export function previousSnapshot(ledger: Ledger): StateSnapshot | null {
  return ledger.snapshots.at(-2) ?? null;
}
