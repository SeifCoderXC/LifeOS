import { nid, nowIso } from "../id";
import type { ConflictType, Contradiction, EvidenceLevel, Ledger, LifeEvent } from "../types";

const EVIDENCE_RANK: Record<EvidenceLevel, number> = {
  E0: 0,
  E1: 1,
  E2: 2,
  E3: 3,
  E4: 4,
};

function conflictType(a: unknown, b: unknown, key: string): ConflictType {
  if (typeof a === "number" && typeof b === "number") return "numeric_conflict";
  if (key.includes("date") || key.includes("deadline")) return "date_conflict";
  if (key.includes("status") || key.includes("visa")) return "status_conflict";
  return "identity_conflict";
}

export function detectContradictions(ledger: Ledger, incoming: LifeEvent[]): Contradiction[] {
  const found: Contradiction[] = [];
  for (const neu of incoming) {
    const key = neu.fact_payload.fact_key as string | undefined;
    if (!key) continue;
    const neuVal = neu.fact_payload.fact_value;
    if (neuVal == null || neuVal === "") continue;

    const prior = [...ledger.events].reverse().find((e) => {
      if (incoming.some((i) => i.event_id === e.event_id)) return false;
      return e.fact_payload.fact_key === key && e.fact_payload.fact_value != null;
    });
    if (!prior) continue;
    const oldVal = prior.fact_payload.fact_value;
    if (String(oldVal) === String(neuVal)) continue;

    const preferNewer = EVIDENCE_RANK[neu.evidence_level] >= EVIDENCE_RANK[prior.evidence_level];
    const preferred = preferNewer ? neu.event_id : prior.event_id;
    const c: Contradiction = {
      contradiction_id: nid("ctx"),
      created_at: nowIso(),
      type: conflictType(oldVal, neuVal, key),
      fact_key: key,
      older_event_id: prior.event_id,
      newer_event_id: neu.event_id,
      older_value: String(oldVal),
      newer_value: String(neuVal),
      preferred_event_id: preferred,
      rationale: preferNewer
        ? "Prefer newer record with equal or stronger evidence. Old value retained historically."
        : "Older record has stronger evidence level; new claim kept but not preferred.",
      resolved: false,
    };
    found.push(c);
    neu.contradiction_links = [...(neu.contradiction_links ?? []), c.contradiction_id];
  }
  return found;
}
