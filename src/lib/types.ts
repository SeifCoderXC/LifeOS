export const EVIDENCE_LEVELS = ["E0", "E1", "E2", "E3", "E4"] as const;
export type EvidenceLevel = (typeof EVIDENCE_LEVELS)[number];

export const EVIDENCE_NAMES: Record<EvidenceLevel, string> = {
  E0: "Thought",
  E1: "SelfReported",
  E2: "UserProvidedEvidence",
  E3: "PrimaryExternal",
  E4: "IndependentVerification",
};

export const EPISTEMIC_LABELS = [
  "FACT",
  "USER_CLAIM",
  "INFERENCE",
  "MODEL_ESTIMATE",
  "SCENARIO",
  "VERIFIED_EXTERNAL_FACT",
  "UNRESOLVED",
] as const;
export type EpistemicStatus = (typeof EPISTEMIC_LABELS)[number];

export const INPUT_MODES = [
  "CHAOTIC_DUMP",
  "SINGLE_EVENT",
  "QUESTION",
  "COMMAND",
  "GOAL_DECLARATION",
  "RESEARCH_REQUEST",
] as const;
export type InputMode = (typeof INPUT_MODES)[number];

export const EVENT_TYPES = [
  "observation",
  "measurement",
  "transaction",
  "status_change",
  "intention",
  "emotion",
  "question",
  "goal",
  "opportunity_discovery",
  "risk_signal",
  "credential",
  "relationship",
  "command",
  "correction",
  "world_fact",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const DOMAIN_IDS = [
  "BODY",
  "MIND",
  "LEARNING",
  "EDUCATION",
  "TECH",
  "CAREER",
  "FINANCE",
  "LEGAL",
  "MOBILITY",
  "SOCIAL",
  "RELATIONSHIPS",
  "OPERATIONS",
  "ENVIRONMENT",
  "RISK",
  "OPPORTUNITY",
  "GOALS",
  "IDENTITY",
] as const;
export type DomainId = (typeof DOMAIN_IDS)[number];

export const STATE_DIMENSIONS = [
  "health_condition",
  "physical_capability",
  "knowledge",
  "skill_capability",
  "credential_strength",
  "professional_capital",
  "network_capital",
  "financial_position",
  "financial_runway",
  "legal_resilience",
  "mobility",
  "environment_quality",
  "optionality",
  "risk_exposure",
  "goal_progress",
  "data_quality",
  "world_alignment",
] as const;
export type StateDimension = (typeof STATE_DIMENSIONS)[number];

export const DOOR_STATES = [
  "LOCKED",
  "PARTIALLY_OPEN",
  "OPEN",
  "HIGH_CONFIDENCE_ACCESS",
  "EXPIRED",
  "BLOCKED",
] as const;
export type DoorState = (typeof DOOR_STATES)[number];

export const IMPACT_LAYERS = ["DIRECT", "SECONDARY", "TERTIARY"] as const;
export type ImpactLayer = (typeof IMPACT_LAYERS)[number];

export const CONFLICT_TYPES = [
  "numeric_conflict",
  "date_conflict",
  "identity_conflict",
  "status_conflict",
  "source_conflict",
  "causal_conflict",
] as const;
export type ConflictType = (typeof CONFLICT_TYPES)[number];

export const SCENARIO_NAMES = [
  "BASELINE",
  "ACCELERATION",
  "PIVOT",
  "DEFENSIVE",
  "OPPORTUNITY_WINDOW",
] as const;
export type ScenarioName = (typeof SCENARIO_NAMES)[number];

export const DASHBOARD_VIEWS = [
  "COMMAND_CENTER",
  "WHAT_CHANGED",
  "TIMELINE",
  "LIFE_UNIVERSE",
  "DOORS",
  "RISKS",
  "MILESTONES",
  "FINANCE",
  "LEGAL",
  "CAREER",
  "BODY",
  "LEARNING",
  "DATA_HEALTH",
] as const;
export type DashboardView = (typeof DASHBOARD_VIEWS)[number];

export interface Measurement {
  value: number | null;
  unit: string | null;
  quantity_type: string | null;
  name?: string | null;
}

export interface EntityRef {
  name: string;
  type: string;
  id?: string;
}

export interface FinancialEffect {
  amount: number;
  currency: string;
  direction: "in" | "out" | "neutral";
  category?: string;
}

export interface Provenance {
  method: "grok" | "gemini" | "heuristic" | "user" | "system" | "world_research";
  model?: string | null;
  retrieved_at?: string | null;
  notes?: string | null;
}

export interface LifeEvent {
  event_id: string;
  intake_id: string;
  recorded_at: string;
  event_time: string;
  raw_input: string;
  summary: string;
  event_type: EventType;
  epistemic_status: EpistemicStatus;
  evidence_level: EvidenceLevel;
  confidence: number;
  domain_ids: DomainId[];
  tags: string[];
  fact_payload: Record<string, unknown>;
  provenance: Provenance;
  measurement?: Measurement | null;
  location?: string | null;
  entities?: EntityRef[];
  financial_effect?: FinancialEffect | null;
  legal_effect?: string | null;
  health_or_performance_effect?: string | null;
  capability_effect?: string | null;
  social_effect?: string | null;
  opportunity_effect?: string | null;
  risk_effect?: string | null;
  reversibility?: "reversible" | "costly" | "irreversible" | "unknown";
  source_urls?: string[];
  contradiction_links?: string[];
  user_confirmation_status?: "unconfirmed" | "confirmed" | "disputed";
  derived_metrics_affected?: StateDimension[];
  corrects_event_id?: string | null;
  world_research_trigger?: boolean;
}

export interface Intake {
  intake_id: string;
  raw_input: string;
  recorded_at: string;
  mode: InputMode;
  event_ids: string[];
  needs_clarification: boolean;
  clarification_question: string | null;
  grok_used: boolean;
}

export interface DerivedMetric {
  dimension: StateDimension;
  value: number | null;
  display: string;
  unit: string | null;
  formula: string;
  source_event_ids: string[];
  calculated_at: string;
  confidence: number;
  change_type: "measured" | "modeled" | "unknown";
  previous_value: number | null;
  delta: number | null;
  notes: string;
}

export interface StateSnapshot {
  snapshot_id: string;
  created_at: string;
  trigger_event_id: string | null;
  checkpoint: boolean;
  dimensions: Record<StateDimension, DerivedMetric>;
  facts: Record<string, FactRecord>;
}

export interface FactRecord {
  fact_key: string;
  value: string | number | boolean | null;
  unit: string | null;
  event_id: string;
  recorded_at: string;
  evidence_level: EvidenceLevel;
  epistemic_status: EpistemicStatus;
  confidence: number;
  superseded: boolean;
  history_event_ids: string[];
}

export interface Contradiction {
  contradiction_id: string;
  created_at: string;
  type: ConflictType;
  fact_key: string;
  older_event_id: string;
  newer_event_id: string;
  older_value: string;
  newer_value: string;
  preferred_event_id: string;
  rationale: string;
  resolved: boolean;
}

export interface Impact {
  event_id: string;
  layer: ImpactLayer;
  domain_id: DomainId;
  description: string;
  attribution: EpistemicStatus;
  confidence: number;
}

export interface Milestone {
  milestone_id: string;
  created_at: string;
  pattern: string;
  name: string;
  description: string;
  domain_ids: DomainId[];
  event_ids: string[];
  confirmed: boolean;
  strategic_effect: string;
}

export interface Door {
  door_id: string;
  created_at: string;
  updated_at: string;
  name: string;
  category: string;
  location: string | null;
  requirements: string[];
  current_eligibility: string;
  missing_requirements: string[];
  legal_constraints: string[];
  cost: string | null;
  time_to_access: string | null;
  deadline: string | null;
  probability_estimate: number | null;
  strategic_value: number | null;
  option_value: number | null;
  reversibility: string;
  evidence: string[];
  next_action: string | null;
  state: DoorState;
  source_event_ids: string[];
  epistemic_status: EpistemicStatus;
}

export interface RiskItem {
  risk_id: string;
  created_at: string;
  title: string;
  domain_ids: DomainId[];
  description: string;
  severity: number;
  mitigation: string | null;
  event_ids: string[];
  active: boolean;
}

export interface WorldFact {
  world_fact_id: string;
  recorded_at: string;
  claim: string;
  source_urls: string[];
  retrieved_at: string;
  confidence: number;
  related_door_ids: string[];
  related_event_ids: string[];
  topic: string;
}

export interface FeedbackPacket {
  feedback_id: string;
  intake_id: string;
  created_at: string;
  mode: "fast" | "deep";
  recorded: string[];
  what_changed: Array<{
    dimension: string;
    before: string;
    after: string;
    measured: boolean;
  }>;
  why_it_matters: string;
  domains_affected: DomainId[];
  confidence: number;
  milestones_or_thresholds: string[];
  new_risks: string[];
  new_doors: string[];
  external_world_effects: string[];
  next_best_action: string;
  clarification: string | null;
  grok_used: boolean;
  research_performed: boolean;
}

export interface Achievement {
  achievement_id: string;
  name: string;
  focus: string;
  phases: string[];
  tracking: string[];
  phase_index: number;
  evidence_event_ids: string[];
  status: "seeded" | "in_progress" | "completed";
  notes: string;
}

export interface PriorityAction {
  rank: number;
  action: string;
  why: string;
  impact: number;
  leverage: number;
  urgency: number;
  effort: number;
  reversibility: string;
  domains: DomainId[];
}

export interface SceneNode {
  id: string;
  kind:
    | "life_core"
    | "domain_planet"
    | "asset_node"
    | "skill_cluster"
    | "goal_beacon"
    | "milestone_structure"
    | "opportunity_portal"
    | "risk_zone"
    | "constraint_barrier"
    | "external_institution"
    | "city_node"
    | "market_signal"
    | "timeline_event"
    | "scenario_branch";
  label: string;
  x: number;
  y: number;
  z: number;
  size: number;
  opacity: number;
  color: string;
  momentum: number;
  domain_id?: DomainId;
  meta?: Record<string, unknown>;
}

export interface SceneEdge {
  id: string;
  from: string;
  to: string;
  strength: number;
  kind: "dependency" | "flow" | "blocked" | "unlock";
  label?: string;
}

export interface SceneGraph {
  generated_at: string;
  nodes: SceneNode[];
  edges: SceneEdge[];
}

export interface WeeklyReport {
  generated_at: string;
  window_start: string;
  window_end: string;
  state_change: string[];
  biggest_gains: string[];
  biggest_losses: string[];
  hidden_bottlenecks: string[];
  new_doors: string[];
  closing_doors: string[];
  world_changes_that_matter: string[];
  high_leverage_actions: string[];
  data_gaps: string[];
  next_strategic_position: string;
}

export interface DataHealth {
  record_completeness: number;
  evidence_strength: number;
  freshness: number;
  contradiction_rate: number;
  stale_state_ratio: number;
  external_verification_coverage: number;
  notes: string[];
}

export interface Ledger {
  version: 1;
  created_at: string;
  intakes: Intake[];
  events: LifeEvent[];
  snapshots: StateSnapshot[];
  contradictions: Contradiction[];
  doors: Door[];
  milestones: Milestone[];
  risks: RiskItem[];
  world_facts: WorldFact[];
  feedback: FeedbackPacket[];
  achievements: Achievement[];
  entities: EntityRef[];
  tags: string[];
  impacts: Impact[];
}

export interface SnapshotPayload {
  ledger_created_at: string;
  event_count: number;
  last_intake_at: string | null;
  last_feedback: FeedbackPacket | null;
  state: StateSnapshot | null;
  previous_state: StateSnapshot | null;
  doors: Door[];
  milestones: Milestone[];
  risks: RiskItem[];
  contradictions: Contradiction[];
  events: LifeEvent[];
  world_facts: WorldFact[];
  achievements: Achievement[];
  scene: SceneGraph;
  data_health: DataHealth;
  priorities: PriorityAction[];
  grok_configured: boolean;
  impacts: Impact[];
}
