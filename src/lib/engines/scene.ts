import { DOMAIN_MAP, DOMAINS } from "../ontology";
import type { Ledger, SceneEdge, SceneGraph, SceneNode, StateSnapshot } from "../types";

function recency(iso: string) {
  const hours = (Date.now() - new Date(iso).getTime()) / 36e5;
  return Math.max(0.25, Math.min(1, 1 - hours / (24 * 10)));
}

export function buildScene(ledger: Ledger, state: StateSnapshot | null): SceneGraph {
  const nodes: SceneNode[] = [];
  const edges: SceneEdge[] = [];
  const now = new Date().toISOString();
  const health = state?.dimensions.data_quality.value ?? 0;

  nodes.push({
    id: "core",
    kind: "life_core",
    label: "SELF",
    x: 0,
    y: 0,
    z: 0,
    size: 1.35 + health * 0.4,
    opacity: 0.55 + health * 0.4,
    color: "#d4a853",
    momentum: Math.min(1, ledger.events.slice(-5).length / 5),
    meta: { event_count: ledger.events.length },
  });

  const domainActivity: Record<string, number> = {};
  const domainRecent: Record<string, number> = {};
  for (const e of ledger.events) {
    for (const d of e.domain_ids) {
      domainActivity[d] = (domainActivity[d] ?? 0) + 1;
      domainRecent[d] = Math.max(domainRecent[d] ?? 0, recency(e.recorded_at));
    }
  }

  const n = DOMAINS.length;
  DOMAINS.forEach((d, i) => {
    const theta = (i / n) * Math.PI * 2 - Math.PI / 2;
    const radius = 7.2;
    const act = domainActivity[d.id] ?? 0;
    const size = 0.42 + Math.min(1.1, act * 0.12);
    const opacity = act ? 0.45 + (domainRecent[d.id] ?? 0.3) * 0.5 : 0.22;
    nodes.push({
      id: `dom_${d.id}`,
      kind: "domain_planet",
      label: d.id,
      x: Math.cos(theta) * radius,
      y: Math.sin(theta) * 0.4,
      z: Math.sin(theta) * radius,
      size,
      opacity,
      color: d.color,
      momentum: Math.min(1, act / 6),
      domain_id: d.id,
      meta: { name: d.name, events: act, subdomains: d.subdomains },
    });
    edges.push({
      id: `e_core_${d.id}`,
      from: "core",
      to: `dom_${d.id}`,
      strength: act ? Math.min(1, 0.25 + act * 0.08) : 0.08,
      kind: "dependency",
    });
  });

  const assets = ledger.events.filter(
    (e) =>
      e.event_type === "measurement" ||
      e.event_type === "credential" ||
      e.financial_effect ||
      /cv|portfolio|project/i.test(e.summary),
  );
  assets.slice(-18).forEach((e, i) => {
    const domain = e.domain_ids[0];
    const parent = nodes.find((n) => n.id === `dom_${domain}`);
    if (!parent) return;
    const a = (i / 18) * Math.PI * 2;
    nodes.push({
      id: `asset_${e.event_id}`,
      kind: "asset_node",
      label: e.summary.slice(0, 42),
      x: parent.x + Math.cos(a) * 1.6,
      y: parent.y + 0.6,
      z: parent.z + Math.sin(a) * 1.6,
      size: 0.18 + (e.financial_effect ? Math.min(0.35, e.financial_effect.amount / 400) : 0.05),
      opacity: 0.35 + e.confidence * 0.5,
      color: parent.color,
      momentum: recency(e.recorded_at),
      domain_id: domain,
      meta: { event_id: e.event_id, type: e.event_type },
    });
    edges.push({
      id: `e_asset_${e.event_id}`,
      from: parent.id,
      to: `asset_${e.event_id}`,
      strength: 0.4,
      kind: "flow",
    });
  });

  ledger.doors.forEach((door, i) => {
    const theta = (i / Math.max(1, ledger.doors.length)) * Math.PI * 2 + 0.4;
    const radius = 11.5;
    const color =
      door.state === "OPEN" || door.state === "HIGH_CONFIDENCE_ACCESS"
        ? "#4ade80"
        : door.state === "PARTIALLY_OPEN"
          ? "#fbbf24"
          : door.state === "BLOCKED" || door.state === "EXPIRED"
            ? "#ef4444"
            : "#64748b";
    nodes.push({
      id: door.door_id,
      kind: "opportunity_portal",
      label: door.name,
      x: Math.cos(theta) * radius,
      y: 1.2 + (door.strategic_value ?? 0.4),
      z: Math.sin(theta) * radius,
      size: 0.55 + (door.option_value ?? 0.3) * 0.5,
      opacity: door.state === "LOCKED" ? 0.28 : 0.7,
      color,
      momentum: door.state === "OPEN" ? 0.8 : 0.2,
      meta: { state: door.state, missing: door.missing_requirements, next: door.next_action },
    });
    const linkDom =
      door.category === "internship" || door.category === "career"
        ? "CAREER"
        : door.category === "legal"
          ? "LEGAL"
          : door.category === "body"
            ? "BODY"
            : "OPPORTUNITY";
    edges.push({
      id: `e_door_${door.door_id}`,
      from: `dom_${linkDom}`,
      to: door.door_id,
      strength: door.state === "LOCKED" ? 0.15 : 0.7,
      kind: door.missing_requirements.length ? "blocked" : "unlock",
      label: door.missing_requirements[0],
    });
    if (door.missing_requirements.length) {
      nodes.push({
        id: `bar_${door.door_id}`,
        kind: "constraint_barrier",
        label: door.missing_requirements[0],
        x: Math.cos(theta) * (radius - 1.4),
        y: 1.2,
        z: Math.sin(theta) * (radius - 1.4),
        size: 0.28,
        opacity: 0.7,
        color: "#fb923c",
        momentum: 0,
        meta: { door: door.door_id },
      });
    }
  });

  ledger.risks
    .filter((r) => r.active)
    .forEach((risk, i) => {
      const theta = (i / 6) * Math.PI * 2 + 1.1;
      nodes.push({
        id: risk.risk_id,
        kind: "risk_zone",
        label: risk.title,
        x: Math.cos(theta) * 4.2,
        y: -1.4,
        z: Math.sin(theta) * 4.2,
        size: 0.7 + risk.severity * 0.8,
        opacity: 0.25 + risk.severity * 0.25,
        color: "#ef4444",
        momentum: risk.severity,
        meta: { mitigation: risk.mitigation, severity: risk.severity },
      });
      edges.push({
        id: `e_risk_${risk.risk_id}`,
        from: "core",
        to: risk.risk_id,
        strength: risk.severity,
        kind: "blocked",
      });
    });

  ledger.milestones.slice(-8).forEach((ms, i) => {
    const parent = nodes.find((n) => n.id === `dom_${ms.domain_ids[0]}`);
    nodes.push({
      id: ms.milestone_id,
      kind: "milestone_structure",
      label: ms.name,
      x: (parent?.x ?? 0) * 0.55,
      y: 2.2 + i * 0.15,
      z: (parent?.z ?? 0) * 0.55,
      size: 0.28,
      opacity: 0.8,
      color: "#e8e4d9",
      momentum: 0.4,
      meta: { pattern: ms.pattern, effect: ms.strategic_effect },
    });
  });

  ledger.world_facts.slice(-6).forEach((wf, i) => {
    const theta = (i / 6) * Math.PI * 2;
    nodes.push({
      id: wf.world_fact_id,
      kind: "market_signal",
      label: wf.topic,
      x: Math.cos(theta) * 14,
      y: -0.6,
      z: Math.sin(theta) * 14,
      size: 0.32,
      opacity: wf.confidence,
      color: "#3dcdc0",
      momentum: recency(wf.retrieved_at),
      meta: { claim: wf.claim, sources: wf.source_urls },
    });
  });

  const goals = ledger.events.filter((e) => e.event_type === "goal").slice(-5);
  goals.forEach((g, i) => {
    nodes.push({
      id: `goal_${g.event_id}`,
      kind: "goal_beacon",
      label: g.summary.slice(0, 40),
      x: 0,
      y: 3.5 + i * 0.4,
      z: 0.4 * i,
      size: 0.3,
      opacity: 0.85,
      color: "#fde68a",
      momentum: 0.6,
      domain_id: "GOALS",
    });
    edges.push({
      id: `e_goal_${g.event_id}`,
      from: "core",
      to: `goal_${g.event_id}`,
      strength: 0.5,
      kind: "flow",
    });
  });

  void DOMAIN_MAP;
  return { generated_at: now, nodes, edges };
}
