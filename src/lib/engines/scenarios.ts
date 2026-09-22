import type { Ledger, ScenarioName, StateSnapshot } from "../types";

export interface ScenarioCard {
  name: ScenarioName;
  assumptions: string[];
  dependencies: string[];
  likely_benefits: string[];
  risks: string[];
  opportunity_cost: string;
  required_actions: string[];
  reversible_checkpoints: string[];
}

export function buildScenarios(ledger: Ledger, state: StateSnapshot | null): ScenarioCard[] {
  const intern = ledger.doors.find((d) => /internship/i.test(d.name));
  const legal = ledger.risks.find((r) => r.risk_id === "risk_legal_status" && r.active);
  const trading = ledger.events.some((e) => e.financial_effect?.category === "trading");
  const learning = ledger.events.filter((e) => e.domain_ids.includes("LEARNING")).length;

  return [
    {
      name: "BASELINE",
      assumptions: [
        "Current recording rate continues.",
        "No new credentials or legal changes.",
        state ? `Data quality ${state.dimensions.data_quality.display}` : "Empty model",
      ],
      dependencies: ["Honest weekly logging", "No silent legal expiry"],
      likely_benefits: ["Compounding of whatever is already working", "Fewer surprises inside the ledger"],
      risks: ["Slow doors expire", legal ? "Legal strain unaddressed" : "Blind spots remain blind"],
      opportunity_cost: "High-leverage windows (internships, language gates, outreach) decay.",
      required_actions: ["Keep dumping reality", "One bottleneck action per week"],
      reversible_checkpoints: ["Weekly intelligence review"],
    },
    {
      name: "ACCELERATION",
      assumptions: [
        "Concentrate on the highest-leverage Door and the binding constraint behind it.",
        intern
          ? `${intern.name} is the focus; missing: ${intern.missing_requirements.join(", ") || "verify live requirements"}`
          : "No named Door yet — first create one from a real listing.",
      ],
      dependencies: intern?.missing_requirements.length
        ? intern.missing_requirements
        : ["A real external target"],
      likely_benefits: ["Faster optionality if the constraint is real", "Clearer identity signal in career domain"],
      risks: ["Tunnel vision", "Burnout if stacked on long work hours", "Optimizing a Door that is not actually open"],
      opportunity_cost: "Slower progress on Body & Presence and other goals.",
      required_actions: [
        intern?.next_action || "Pick one live opportunity and list its true requirements",
        "Time-box outreach",
      ],
      reversible_checkpoints: ["14-day experiment", "Drop if no evidence of movement"],
    },
    {
      name: "PIVOT",
      assumptions: [
        "Current path is not the highest-value use of the next 90 days.",
        "Preserve assets: language units, CV, any inflow channel.",
      ],
      dependencies: ["A written alternative mission", "Assets that transfer"],
      likely_benefits: ["Escape a local maximum", "Reuse skills in a denser market"],
      risks: ["Reset costs", "Narrative whiplash", "Abandoning a Door that was about to open"],
      opportunity_cost: "Sunk-cost on the current track.",
      required_actions: ["Name the pivot in one sentence", "List what is kept vs dropped"],
      reversible_checkpoints: ["30-day dual-track before full cutover"],
    },
    {
      name: "DEFENSIVE",
      assumptions: [
        legal
          ? "Legal/residence is the binding constraint."
          : "Protect cash, health, and admin before offense.",
        trading ? "Trading income is treated as risky, not as salary." : "Income quality remains whatever was recorded.",
      ],
      dependencies: ["Document facts", "Cash stock", "Recovery"],
      likely_benefits: ["Avoid irreversible legal/financial mistakes", "Stabilize decision quality"],
      risks: ["Over-caution misses a real window", "Defensive identity becomes the strategy"],
      opportunity_cost: "Delayed offense on career/income.",
      required_actions: [
        legal?.mitigation || "Record legal facts",
        "Log cash balance",
        "Cap work hours that produce exhaustion",
      ],
      reversible_checkpoints: ["Once legal + cash are E2+, switch back to acceleration"],
    },
    {
      name: "OPPORTUNITY_WINDOW",
      assumptions: [
        intern
          ? `${intern.name} may be time-limited.`
          : "No verified time-limited window is in the ledger.",
        "External rules must be checked, not remembered.",
      ],
      dependencies: intern?.requirements ?? ["A dated external opening"],
      likely_benefits: ["Disproportionate outcome if the window is real"],
      risks: ["Acting on an expired listing", "Language/legal mismatch"],
      opportunity_cost: "Everything that is not the window.",
      required_actions: [
        "Verify the listing/official page today",
        learning ? "Map remaining language gap to the actual requirement" : "Do not invent eligibility",
      ],
      reversible_checkpoints: ["Application submitted vs not", "Deadline date recorded"],
    },
  ];
}
