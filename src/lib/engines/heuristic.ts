import { normalizeDomainIds } from "../ontology";
import type {
  DomainId,
  EpistemicStatus,
  EventType,
  EvidenceLevel,
  FinancialEffect,
  InputMode,
  Measurement,
} from "../types";

export interface ExtractedPiece {
  summary: string;
  event_type: EventType;
  epistemic_status: EpistemicStatus;
  evidence_level: EvidenceLevel;
  confidence: number;
  domain_ids: DomainId[];
  tags: string[];
  fact_payload: Record<string, unknown>;
  measurement: Measurement | null;
  location: string | null;
  entities: { name: string; type: string }[];
  financial_effect: FinancialEffect | null;
  legal_effect: string | null;
  health_or_performance_effect: string | null;
  capability_effect: string | null;
  social_effect: string | null;
  opportunity_effect: string | null;
  risk_effect: string | null;
  world_research_trigger: boolean;
  door_candidate: {
    name: string;
    category: string;
    location: string | null;
    requirements: string[];
    missing_requirements: string[];
  } | null;
  fact_key: string | null;
  fact_value: string | number | boolean | null;
  fact_unit: string | null;
}

export interface HeuristicResult {
  mode: InputMode;
  needs_clarification: boolean;
  clarification_question: string | null;
  pieces: ExtractedPiece[];
}

const MONEY_RE =
  /\b(?:made|earned|saved|spent|paid|lost|received|got)\s+(\d+(?:[.,]\d+)?)\s*(euros?|eur|usd|\$|£|gbp|€)\b|(?:(\d+(?:[.,]\d+)?)\s*(euros?|eur|usd|\$|£|gbp|€))\b/i;
const QTY_RE =
  /(\d+(?:[.,]\d+)?)\s+(?:[A-Za-z]+\s+)?(kg|kilograms?|hours?|hrs?|words?|sentences?|pages?|km|reps?|sets?)/i;
const CITY_RE =
  /\b(Barcelona|Madrid|Valencia|Lisbon|Berlin|Paris|Vilnius|Kaunas|Warsaw|Amsterdam|London|Rome|Milan|Munich|Vienna|Prague|Stockholm|Copenhagen|Dublin|Brussels|Spain|Lithuania|Portugal|Germany|France|Italy|Netherlands|Poland|Estonia|Latvia)\b/i;
const LANG_RE =
  /\b(Lithuanian|Spanish|English|French|German|Portuguese|Italian|Polish|Russian|Catalan)\b/i;
const CEFR_RE = /\b(A1|A2|B1|B2|C1|C2)\b/;

function num(s: string) {
  return Number(s.replace(",", "."));
}

function detectMode(raw: string): InputMode {
  const t = raw.trim();
  const lower = t.toLowerCase();
  if (/^(show|open|list|recalculate|export|clear|checkpoint)\b/.test(lower)) return "COMMAND";
  if (
    /\b(research|look up|what's happening|what is happening|current (rules|law|visa|salary|market))\b/i.test(
      t,
    )
  ) {
    return "RESEARCH_REQUEST";
  }
  if (/^\s*(what|why|how|when|where|who|is|are|should|can|do)\b/i.test(t) || t.endsWith("?")) {
    if (!/\b(made|learned|got|worked|found|saved|fixed)\b/i.test(t)) return "QUESTION";
  }
  if (/\b(my goal is|mission:|i['’]m aiming|i am aiming)\b/i.test(lower)) return "GOAL_DECLARATION";
  const clauses = splitClauses(t);
  if (clauses.length > 1) return "CHAOTIC_DUMP";
  return "SINGLE_EVENT";
}

function splitClauses(raw: string): string[] {
  const lines = raw
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const parts: string[] = [];
  for (const line of lines) {
    const bits = line
      .split(/\s*;\s*|\s+but\s+|\s+and then\s+/i)
      .flatMap((chunk) => {
        const want = chunk.split(/\s+and I want to\s+/i);
        if (want.length === 2) {
          return [want[0], `I want to ${want[1]}`];
        }
        return [chunk];
      })
      .map((s) => s.trim())
      .filter((s) => s.length > 2);
    if (bits.length > 1) parts.push(...bits);
    else parts.push(line);
  }
  return parts.length ? parts : [raw.trim()];
}

function domainsFor(text: string): DomainId[] {
  const l = text.toLowerCase();
  const hits: DomainId[] = [];
  const add = (d: DomainId) => {
    if (!hits.includes(d)) hits.push(d);
  };
  if (/\b(muscle|kg|sleep|train|gym|nutrition|weight|posture|hair|skin|exhaust)/.test(l))
    add("BODY");
  if (/\b(exhaust|stress|anxious|focus|mood|depress|overwhelm|feel|emotion|going wrong)\b/.test(l))
    add("MIND");
  if (/\b(learn|words?|language|spanish|lithuanian|study|read|practice|cefr|b2|a2)/.test(l))
    add("LEARNING");
  if (/\b(university|erasmus|credits?|degree|assignment|gpa|thesis)/.test(l)) add("EDUCATION");
  if (/\b(code|programming|software|python|javascript|ai|electronics|github|portfolio|cv)\b/.test(l))
    add("TECH");
  if (/\b(internship|job|interview|cv|resume|employer|career|freelance|client|application)\b/.test(l))
    add("CAREER");
  if (/\b(euro|usd|\$|€|money|trading|saved|spent|salary|income|cash|runway)\b/.test(l))
    add("FINANCE");
  if (/\b(visa|permit|residence|tax|legal|contract|deadline|passport|work rights)\b/.test(l))
    add("LEGAL");
  if (/\b(barcelona|spain|city|relocat|travel|flight|move to|country)\b/.test(l)) add("MOBILITY");
  if (/\b(replied|contact|network|mentor|friend|someone from)\b/.test(l)) add("SOCIAL");
  if (/\b(family|partner|girlfriend|boyfriend|relationship)\b/.test(l)) add("RELATIONSHIPS");
  if (/\b(worked \d|hours|paperwork|housing|rent|schedule|routine)\b/.test(l)) add("OPERATIONS");
  if (/\b(internship|grant|scholarship|opportunity|opening|offer)\b/.test(l)) add("OPPORTUNITY");
  if (/\b(visa|difficult|risk|afraid|blocked|broke|deadline|exhaust)\b/.test(l)) add("RISK");
  if (/\b(goal|mission|want to|aiming)\b/.test(l)) add("GOALS");
  return hits;
}

function epistemic(text: string): { status: EpistemicStatus; level: EvidenceLevel; conf: number } {
  const l = text.toLowerCase();
  if (/^\s*i think\b|maybe|might|not sure|feels like|getting difficult/.test(l)) {
    return { status: "USER_CLAIM", level: "E0", conf: 0.35 };
  }
  if (/\b(screenshot|receipt|certificate|document|official)\b/.test(l)) {
    return { status: "USER_CLAIM", level: "E2", conf: 0.7 };
  }
  if (/\d/.test(text) && /\b(made|learned|got|saved|worked|spent)\b/i.test(text)) {
    return { status: "USER_CLAIM", level: "E1", conf: 0.62 };
  }
  return { status: "USER_CLAIM", level: "E1", conf: 0.55 };
}

function extractMoney(text: string): FinancialEffect | null {
  const l = text.toLowerCase();
  const m = text.match(MONEY_RE);
  if (!m) return null;
  const amount = num(m[1] || m[3] || "0");
  const curRaw = (m[2] || m[4] || "EUR").toUpperCase();
  const currency = curRaw === "$" ? "USD" : curRaw === "£" ? "GBP" : curRaw.replace(/EUROS?/, "EUR");
  let direction: FinancialEffect["direction"] = "neutral";
  if (/\b(made|earned|received|got)\b/.test(l) && !/\bmuscle|kg\b/.test(l)) direction = "in";
  if (/\b(saved)\b/.test(l)) direction = "in";
  if (/\b(spent|paid|lost)\b/.test(l)) direction = "out";
  let category = "unspecified";
  if (/\btrading\b/.test(l)) category = "trading";
  if (/\bfreelance\b/.test(l)) category = "freelance";
  if (/\bsaved\b/.test(l)) category = "savings";
  if (/\bsalary|wage\b/.test(l)) category = "salary";
  return { amount, currency: currency === "EURO" ? "EUR" : currency, direction, category };
}

function extractMeasurement(text: string): Measurement | null {
  const m = text.match(QTY_RE);
  if (!m) return null;
  const value = num(m[1]);
  const unit = m[2].toLowerCase();
  let quantity_type = "count";
  let name = null;
  if (/kg/.test(unit)) {
    quantity_type = "mass";
    name = /muscle/.test(text.toLowerCase()) ? "lean_muscle" : "mass";
  }
  if (/hour|hr/.test(unit)) {
    quantity_type = "duration";
    name = "work_hours";
  }
  if (/word/.test(unit)) {
    quantity_type = "language_units";
    name = "words_learned";
  }
  if (/sentence/.test(unit)) {
    quantity_type = "language_units";
    name = "sentences_learned";
  }
  return { value, unit, quantity_type, name };
}

function extractLocation(text: string): string | null {
  const m = text.match(CITY_RE);
  return m ? m[1] : null;
}

function extractEntities(text: string) {
  const entities: { name: string; type: string }[] = [];
  const lang = text.match(LANG_RE);
  if (lang) entities.push({ name: lang[1], type: "language" });
  const loc = extractLocation(text);
  if (loc) entities.push({ name: loc, type: "place" });
  const cefr = text.match(CEFR_RE);
  if (cefr) entities.push({ name: cefr[1], type: "language_level" });
  if (/\bcv\b/i.test(text)) entities.push({ name: "CV", type: "document" });
  if (/\binternship\b/i.test(text)) entities.push({ name: "internship", type: "opportunity" });
  return entities;
}

function pieceFromClause(clause: string): ExtractedPiece {
  const ep = epistemic(clause);
  const domains = normalizeDomainIds(domainsFor(clause));
  const money = extractMoney(clause);
  let measurement = extractMeasurement(clause);
  if (money) measurement = null;
  const location = extractLocation(clause);
  const entities = extractEntities(clause);
  const l = clause.toLowerCase();

  let event_type: EventType = "observation";
  if (money) event_type = "transaction";
  else if (measurement) event_type = "measurement";
  else if (/\bmy goal\b|mission:|aiming\b/.test(l)) event_type = "goal";
  else if (/\bwant to|i will\b/.test(l)) event_type = "intention";
  else if (/\bfeel|exhaust|overwhelm|anxious|happy|going wrong\b/.test(l)) event_type = "emotion";
  else if (/\bfound|internship|offer|opening\b/.test(l)) event_type = "opportunity_discovery";
  else if (/\bvisa|difficult|risk|blocked\b/.test(l)) event_type = "risk_signal";
  else if (/\blearn|words|sentences|fixed my cv\b/.test(l)) event_type = "observation";
  else if (/\bthink\b/.test(l)) event_type = "intention";

  let door_candidate: ExtractedPiece["door_candidate"] = null;
  if (/\binternship\b/.test(l)) {
    const req: string[] = [];
    const missing: string[] = [];
    const cefr = clause.match(CEFR_RE);
    const lang = clause.match(LANG_RE);
    if (cefr && lang) {
      req.push(`${cefr[1]} ${lang[1]}`);
      missing.push(`${cefr[1]} ${lang[1]}`);
    }
    door_candidate = {
      name: `Internship${location ? ` in ${location}` : ""}`.trim(),
      category: "internship",
      location,
      requirements: req,
      missing_requirements: missing,
    };
  }

  const tags: string[] = [];
  if (/\btrading\b/.test(l)) tags.push("trading");
  if (/\bcv\b/.test(l)) tags.push("cv");
  entities.forEach((e) => tags.push(e.name.toLowerCase()));

  let fact_key: string | null = null;
  let fact_value: string | number | boolean | null = null;
  let fact_unit: string | null = null;
  if (money) {
    fact_key = `finance.${money.category}.${money.direction}`;
    fact_value = money.amount;
    fact_unit = money.currency;
  } else if (measurement?.name) {
    fact_key = `measure.${measurement.name}`;
    fact_value = measurement.value;
    fact_unit = measurement.unit;
  } else if (/\bvisa\b/.test(l)) {
    fact_key = "legal.visa.status_signal";
    fact_value = /\bdifficult|problem|risk\b/.test(l) ? "strained" : clause;
  }

  const world_research_trigger = Boolean(
    door_candidate ||
      /\b(visa|internship|salary|residence|scholarship|relocat|job in)\b/.test(l),
  );

  return {
    summary: clause.replace(/\s+/g, " ").trim(),
    event_type,
    epistemic_status: ep.status,
    evidence_level: ep.level,
    confidence: ep.conf,
    domain_ids: domains,
    tags,
    fact_payload: {
      clause,
      fact_key,
      fact_value,
      fact_unit,
    },
    measurement,
    location,
    entities,
    financial_effect: money,
    legal_effect: /\bvisa|permit|residence|tax\b/.test(l) ? clause : null,
    health_or_performance_effect: /\bmuscle|exhaust|sleep|train\b/.test(l) ? clause : null,
    capability_effect: /\blearn|language|cv|code|skill\b/.test(l) ? clause : null,
    social_effect: /\breplied|contact|network\b/.test(l) ? clause : null,
    opportunity_effect: door_candidate ? door_candidate.name : null,
    risk_effect: /\bdifficult|exhaust|risk|broke|blocked\b/.test(l) ? clause : null,
    world_research_trigger,
    door_candidate,
    fact_key,
    fact_value,
    fact_unit,
  };
}

export function heuristicExtract(raw: string): HeuristicResult {
  const mode = detectMode(raw);
  const clauses = splitClauses(raw);
  const pieces = clauses.map(pieceFromClause);
  attachDoorRequirements(pieces);

  let needs_clarification = false;
  let clarification_question: string | null = null;
  const legalAmbiguous =
    /\bvisa|residence|permit|tax\b/i.test(raw) &&
    !/\b(expired|approved|applied|valid until|rejected)\b/i.test(raw);
  if (legalAmbiguous && mode !== "QUESTION") {
    needs_clarification = true;
    clarification_question =
      "Legal/residence status can change decisions. What is the current document type, country, and expiry or next deadline if you know it?";
  }

  return { mode, needs_clarification, clarification_question, pieces };
}

function attachDoorRequirements(pieces: ExtractedPiece[]) {
  const door = pieces.find((p) => p.door_candidate);
  if (!door?.door_candidate) return;
  const extras: string[] = [];
  for (const p of pieces) {
    const cefr = p.summary.match(CEFR_RE);
    const lang = p.summary.match(LANG_RE);
    if (cefr && lang) extras.push(`${cefr[1]} ${lang[1]}`);
    else if (/want|require|need/i.test(p.summary) && (cefr || lang)) {
      extras.push(p.summary.replace(/^they\s+/i, "").trim());
    }
  }
  if (!extras.length) return;
  const reqs = Array.from(new Set([...door.door_candidate.requirements, ...extras]));
  door.door_candidate.requirements = reqs;
  door.door_candidate.missing_requirements = reqs;
  door.opportunity_effect = `${door.door_candidate.name} (gated by ${reqs.join(", ")})`;
}
