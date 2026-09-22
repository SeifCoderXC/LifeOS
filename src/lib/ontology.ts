import type { DomainId, StateDimension } from "./types";

export interface DomainDef {
  id: DomainId;
  name: string;
  subdomains: string[];
  color: string;
  orbit: number;
}

export const DOMAINS: DomainDef[] = [
  {
    id: "BODY",
    name: "Body & Physical State",
    subdomains: [
      "body_composition",
      "strength",
      "endurance",
      "mobility",
      "sleep",
      "nutrition",
      "recovery",
      "appearance",
      "grooming",
      "posture",
      "energy",
    ],
    color: "#e06c75",
    orbit: 0,
  },
  {
    id: "MIND",
    name: "Mind & Cognitive State",
    subdomains: [
      "focus",
      "learning_capacity",
      "stress",
      "emotional_state",
      "resilience",
      "decision_quality",
      "mental_energy",
    ],
    color: "#c084fc",
    orbit: 1,
  },
  {
    id: "LEARNING",
    name: "Learning & Knowledge",
    subdomains: [
      "languages",
      "theory",
      "practical_skill",
      "certifications",
      "reading",
      "deliberate_practice",
    ],
    color: "#60a5fa",
    orbit: 2,
  },
  {
    id: "EDUCATION",
    name: "Formal Education",
    subdomains: [
      "degree",
      "credits",
      "grades",
      "attendance",
      "assignments",
      "projects",
      "Erasmus",
      "internships",
      "academic_network",
    ],
    color: "#818cf8",
    orbit: 3,
  },
  {
    id: "TECH",
    name: "Technology & Engineering",
    subdomains: [
      "programming",
      "software",
      "electronics",
      "embedded_systems",
      "mathematics",
      "systems",
      "AI",
      "portfolio",
      "projects",
      "technical_depth",
    ],
    color: "#22d3ee",
    orbit: 4,
  },
  {
    id: "CAREER",
    name: "Career & Professional Capital",
    subdomains: [
      "employment",
      "internships",
      "applications",
      "interviews",
      "portfolio",
      "reputation",
      "networking",
      "references",
      "market_value",
    ],
    color: "#d4a853",
    orbit: 5,
  },
  {
    id: "FINANCE",
    name: "Money & Economic State",
    subdomains: [
      "income",
      "salary",
      "trading",
      "freelance",
      "savings",
      "cashflow",
      "expenses",
      "assets",
      "liabilities",
      "runway",
      "financial_risk",
    ],
    color: "#4ade80",
    orbit: 6,
  },
  {
    id: "LEGAL",
    name: "Legal / Residence / Administrative State",
    subdomains: [
      "residence_permit",
      "visas",
      "work_rights",
      "university_status",
      "contracts",
      "taxes",
      "deadlines",
      "documents",
      "compliance",
    ],
    color: "#fb923c",
    orbit: 7,
  },
  {
    id: "MOBILITY",
    name: "Mobility & Geography",
    subdomains: [
      "travel",
      "relocation",
      "transport",
      "driving",
      "EU_mobility",
      "cities",
      "countries",
      "physical_access",
    ],
    color: "#2dd4bf",
    orbit: 8,
  },
  {
    id: "SOCIAL",
    name: "Social & Network Capital",
    subdomains: [
      "friends",
      "professional_contacts",
      "mentors",
      "institutions",
      "communities",
      "weak_ties",
      "reputation",
    ],
    color: "#f472b6",
    orbit: 9,
  },
  {
    id: "RELATIONSHIPS",
    name: "Relationships & Interpersonal Environment",
    subdomains: [
      "family",
      "partner",
      "friendship",
      "conflict",
      "trust",
      "support",
      "boundaries",
    ],
    color: "#fb7185",
    orbit: 10,
  },
  {
    id: "OPERATIONS",
    name: "Life Operations",
    subdomains: [
      "housing",
      "transport",
      "paperwork",
      "scheduling",
      "routines",
      "devices",
      "possessions",
      "logistics",
    ],
    color: "#94a3b8",
    orbit: 11,
  },
  {
    id: "ENVIRONMENT",
    name: "Environment",
    subdomains: [
      "city",
      "workplace",
      "university",
      "neighborhood",
      "cost_of_living",
      "local_opportunity_density",
      "safety",
      "ecosystem",
    ],
    color: "#a3e635",
    orbit: 12,
  },
  {
    id: "RISK",
    name: "Risk & Vulnerability",
    subdomains: [
      "financial",
      "legal",
      "career",
      "operational",
      "social",
      "health",
      "information",
      "dependency",
    ],
    color: "#ef4444",
    orbit: 13,
  },
  {
    id: "OPPORTUNITY",
    name: "Opportunity Space",
    subdomains: [
      "jobs",
      "internships",
      "grants",
      "scholarships",
      "markets",
      "projects",
      "clients",
      "relocation",
      "education",
      "entrepreneurship",
    ],
    color: "#fbbf24",
    orbit: 14,
  },
  {
    id: "GOALS",
    name: "Goals / Missions / Achievements",
    subdomains: [
      "goal",
      "milestone",
      "mission",
      "project",
      "campaign",
      "achievement",
      "constraint",
      "deadline",
    ],
    color: "#e8e4d9",
    orbit: 15,
  },
  {
    id: "IDENTITY",
    name: "Identity & Direction",
    subdomains: [
      "values",
      "interests",
      "strengths",
      "weaknesses",
      "preferred_work",
      "strategic_identity",
      "narrative",
    ],
    color: "#c4b5fd",
    orbit: 16,
  },
];

export const DOMAIN_MAP = Object.fromEntries(DOMAINS.map((d) => [d.id, d])) as Record<
  DomainId,
  DomainDef
>;

export const SEEDED_ACHIEVEMENTS = [
  {
    achievement_id: "ach_prime_presence",
    name: "Body & Presence",
    focus: "Physical health, energy, and how you show up",
    phases: ["Foundation", "Building consistency", "Peak condition"],
    tracking: [
      "training",
      "nutrition",
      "physical shape",
      "wardrobe/style",
      "posture/presence",
    ],
  },
  {
    achievement_id: "ach_sovereign_professional",
    name: "Career & Income",
    focus: "Skills, work, and income growth",
    phases: ["Blueprint", "Outreach", "Monetization"],
    tracking: [
      "technical stack",
      "portfolio",
      "language integration",
      "networking",
      "freelance/income generation",
    ],
  },
] as const;

export const DIMENSION_TO_DOMAINS: Record<StateDimension, DomainId[]> = {
  health_condition: ["BODY"],
  physical_capability: ["BODY"],
  knowledge: ["LEARNING", "EDUCATION", "TECH"],
  skill_capability: ["TECH", "LEARNING", "CAREER"],
  credential_strength: ["EDUCATION", "CAREER", "LEGAL"],
  professional_capital: ["CAREER", "TECH", "SOCIAL"],
  network_capital: ["SOCIAL", "CAREER", "RELATIONSHIPS"],
  financial_position: ["FINANCE"],
  financial_runway: ["FINANCE", "RISK"],
  legal_resilience: ["LEGAL", "MOBILITY"],
  mobility: ["MOBILITY", "LEGAL", "ENVIRONMENT"],
  environment_quality: ["ENVIRONMENT", "OPERATIONS"],
  optionality: ["OPPORTUNITY", "GOALS", "MOBILITY"],
  risk_exposure: ["RISK", "LEGAL", "FINANCE"],
  goal_progress: ["GOALS", "IDENTITY"],
  data_quality: ["OPERATIONS"],
  world_alignment: ["OPPORTUNITY", "ENVIRONMENT", "CAREER"],
};

export function isDomainId(value: string): value is DomainId {
  return value in DOMAIN_MAP;
}

export function normalizeDomainIds(ids: string[]): DomainId[] {
  const out: DomainId[] = [];
  for (const id of ids) {
    const up = id.toUpperCase();
    if (isDomainId(up) && !out.includes(up)) out.push(up);
  }
  return out.length ? out : ["IDENTITY"];
}
