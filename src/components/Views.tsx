"use client";

import type { ReactNode } from "react";
import { DOMAIN_MAP } from "@/lib/ontology";
import type { DashboardView, SnapshotPayload, WeeklyReport } from "@/lib/types";
import type { ScenarioCard } from "@/lib/engines/scenarios";

function Card({
  title,
  kicker,
  children,
}: {
  title: string;
  kicker?: string;
  children: ReactNode;
}) {
  return (
    <section className="panel rounded-xl p-4">
      {kicker && (
        <div className="font-mono text-[10px] uppercase tracking-[0.24em] text-teal">{kicker}</div>
      )}
      <h3 className="font-display text-2xl text-paper">{title}</h3>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Meter({ label, value }: { label: string; value: number }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div className="mb-1 flex justify-between font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="h-[3px] bg-line">
        <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function DashboardViews({
  view,
  snapshot,
  weekly,
  scenarios,
}: {
  view: DashboardView;
  snapshot: SnapshotPayload;
  weekly: WeeklyReport | null;
  scenarios: ScenarioCard[] | null;
}) {
  if (view === "COMMAND_CENTER") {
    const dims = snapshot.state ? Object.values(snapshot.state.dimensions) : [];
    return (
      <div className="grid gap-3 p-4 lg:grid-cols-2">
        <Card title="Strategic state" kicker="Derived, not asserted">
          <div className="space-y-3">
            {dims
              .filter((d) => d.value != null)
              .slice(0, 8)
              .map((d) => (
                <div key={d.dimension}>
                  <div className="flex justify-between text-sm">
                    <span className="text-paper">{d.dimension.replaceAll("_", " ")}</span>
                    <span className="font-mono text-xs text-mute">{d.change_type}</span>
                  </div>
                  <div className="text-sm text-mute">{d.display}</div>
                </div>
              ))}
            {!dims.filter((d) => d.value != null).length && (
              <p className="text-sm text-mute">No derived values yet. The universe is dormant.</p>
            )}
          </div>
        </Card>
        <Card title="Highest leverage" kicker="Priority engine">
          <ol className="space-y-3">
            {snapshot.priorities.map((p) => (
              <li key={p.rank}>
                <div className="text-paper">
                  <span className="font-mono text-gold">{String(p.rank).padStart(2, "0")} </span>
                  {p.action}
                </div>
                <div className="text-xs text-mute">{p.why}</div>
              </li>
            ))}
          </ol>
        </Card>
        <Card title="Active risks" kicker="Vulnerability">
          {snapshot.risks.length ? (
            snapshot.risks.map((r) => (
              <div key={r.risk_id} className="mb-3">
                <div className="text-rose">{r.title}</div>
                <div className="text-sm text-mute">{r.description}</div>
                <div className="text-xs text-gold-dim">{r.mitigation}</div>
              </div>
            ))
          ) : (
            <p className="text-sm text-mute">No active risks in the ledger. That is not the same as safety.</p>
          )}
        </Card>
        <Card title="Missions" kicker="Seeded, not completed">
          {snapshot.achievements.map((a) => (
            <div key={a.achievement_id} className="mb-3">
              <div className="text-paper">{a.name}</div>
              <div className="text-xs text-mute">
                {a.focus} · {a.status} · phase {a.phases[a.phase_index] ?? a.phases[0]}
              </div>
              <div className="text-xs text-mute">{a.notes}</div>
            </div>
          ))}
        </Card>
      </div>
    );
  }

  if (view === "WHAT_CHANGED") {
    const packet = snapshot.last_feedback;
    const dims = snapshot.state ? Object.values(snapshot.state.dimensions) : [];
    return (
      <div className="grid gap-3 p-4">
        <Card title="Since last intake" kicker="Before / after">
          {packet?.what_changed.length ? (
            <table className="w-full text-left text-sm">
              <thead className="font-mono text-[10px] uppercase tracking-[0.16em] text-mute">
                <tr>
                  <th className="pb-2">Dimension</th>
                  <th>Before</th>
                  <th>After</th>
                  <th>Kind</th>
                </tr>
              </thead>
              <tbody>
                {packet.what_changed.map((w) => (
                  <tr key={w.dimension} className="border-t border-line">
                    <td className="py-2">{w.dimension}</td>
                    <td className="text-mute">{w.before}</td>
                    <td>{w.after}</td>
                    <td className="font-mono text-xs">{w.measured ? "measured" : "modeled"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-mute">No checkpoint delta yet.</p>
          )}
        </Card>
        <Card title="Ripple effects" kicker="Beyond the obvious domain">
          {snapshot.impacts.length ? (
            <div className="space-y-3 text-sm">
              {snapshot.impacts.map((i, idx) => (
                <div key={`${i.event_id}_${idx}`} className="border-t border-line pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em]" style={{ color: DOMAIN_MAP[i.domain_id]?.color }}>
                      {DOMAIN_MAP[i.domain_id]?.name ?? i.domain_id}
                    </span>
                    <span className="font-mono text-[10px] text-mute">{i.layer.toLowerCase()}</span>
                  </div>
                  <p className="text-paper">{i.description}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-mute">
              No second-order effects yet. As you log more, connections beyond the obvious domain show up here.
            </p>
          )}
        </Card>
        <Card title="Formulas currently in force" kicker="Explainable metrics">
          <div className="space-y-2 text-sm">
            {dims.map((d) => (
              <div key={d.dimension} className="border-t border-line pt-2">
                <div className="text-paper">{d.dimension}</div>
                <div className="font-mono text-xs text-mute">{d.formula}</div>
                <div className="text-xs text-mute">{d.notes}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  if (view === "TIMELINE") {
    return (
      <div className="p-4">
        <Card title="Event ledger" kicker="Append-only">
          <div className="space-y-3">
            {snapshot.events.map((e) => (
              <article key={e.event_id} className="border-t border-line pt-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-gold">
                    {e.event_time.replace("T", " ").slice(0, 19)}
                  </div>
                  <div className="font-mono text-[10px] text-mute">
                    {e.epistemic_status} · {e.evidence_level} · {e.provenance.method}
                  </div>
                </div>
                <p className="mt-1 text-paper">{e.summary}</p>
                <p className="mt-1 font-mono text-[11px] text-mute">RAW: {e.raw_input}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {e.domain_ids.map((d) => (
                    <span
                      key={d}
                      className="rounded-full border border-line px-2 py-0.5 font-mono text-[10px] tracking-[0.14em]"
                      style={{ color: DOMAIN_MAP[d]?.color }}
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </article>
            ))}
            {!snapshot.events.length && <p className="text-sm text-mute">Ledger empty.</p>}
          </div>
        </Card>
      </div>
    );
  }

  if (view === "DOORS") {
    return (
      <div className="grid gap-3 p-4 md:grid-cols-2">
        {snapshot.doors.map((d) => (
          <Card key={d.door_id} title={d.name} kicker={`${d.state} · ${d.category}`}>
            <p className="text-sm text-mute">{d.current_eligibility}</p>
            <div className="mt-2 text-sm">
              <div>Missing: {d.missing_requirements.join(", ") || "none recorded"}</div>
              <div className="text-gold-dim">Next: {d.next_action}</div>
              <div className="font-mono text-[10px] text-mute">
                {d.epistemic_status} · option {d.option_value ?? "—"} · {d.location ?? "no location"}
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (view === "RISKS") {
    return (
      <div className="grid gap-3 p-4 md:grid-cols-2">
        {snapshot.risks.length ? (
          snapshot.risks.map((r) => (
            <Card key={r.risk_id} title={r.title} kicker={`severity ${r.severity.toFixed(2)}`}>
              <p className="text-sm">{r.description}</p>
              <p className="mt-2 text-sm text-gold-dim">{r.mitigation}</p>
              <div className="mt-2 font-mono text-[10px] text-mute">{r.domain_ids.join(" · ")}</div>
            </Card>
          ))
        ) : (
          <Card title="No active risks" kicker="Absence of evidence">
            <p className="text-sm text-mute">Empty risk board ≠ low risk. It usually means under-reporting.</p>
          </Card>
        )}
        {snapshot.contradictions.map((c) => (
          <Card key={c.contradiction_id} title={c.fact_key} kicker={c.type}>
            <p className="text-sm">
              {c.older_value} → {c.newer_value}
            </p>
            <p className="text-xs text-mute">{c.rationale}</p>
          </Card>
        ))}
      </div>
    );
  }

  if (view === "MILESTONES") {
    return (
      <div className="grid gap-3 p-4 md:grid-cols-2">
        {snapshot.milestones.map((m) => (
          <Card key={m.milestone_id} title={m.name} kicker={m.pattern}>
            <p className="text-sm">{m.description}</p>
            <p className="mt-2 text-xs text-mute">{m.strategic_effect}</p>
            <p className="font-mono text-[10px] text-gold-dim">
              {m.confirmed ? "confirmed" : "candidate — not ceremonial"}
            </p>
          </Card>
        ))}
        {!snapshot.milestones.length && (
          <Card title="None yet" kicker="Discovered, not typed">
            <p className="text-sm text-mute">Milestones appear from state transitions, not from applause.</p>
          </Card>
        )}
      </div>
    );
  }

  if (view === "FINANCE" || view === "LEGAL" || view === "CAREER" || view === "BODY" || view === "LEARNING") {
    const domain =
      view === "FINANCE"
        ? "FINANCE"
        : view === "LEGAL"
          ? "LEGAL"
          : view === "CAREER"
            ? "CAREER"
            : view === "BODY"
              ? "BODY"
              : "LEARNING";
    const events = snapshot.events.filter((e) => e.domain_ids.includes(domain));
    const dimKeys =
      view === "FINANCE"
        ? (["financial_position", "financial_runway"] as const)
        : view === "LEGAL"
          ? (["legal_resilience"] as const)
          : view === "CAREER"
            ? (["professional_capital", "network_capital", "credential_strength"] as const)
            : view === "BODY"
              ? (["health_condition", "physical_capability"] as const)
              : (["knowledge", "skill_capability"] as const);
    return (
      <div className="grid gap-3 p-4">
        <Card title={DOMAIN_MAP[domain].name} kicker="Domain lens">
          {dimKeys.map((k) => {
            const d = snapshot.state?.dimensions[k];
            if (!d) return null;
            return (
              <div key={k} className="mb-3">
                <div className="text-paper">{k.replaceAll("_", " ")}</div>
                <div className="text-sm">{d.display}</div>
                <div className="font-mono text-[11px] text-mute">{d.formula}</div>
              </div>
            );
          })}
        </Card>
        <Card title="Evidence in this domain" kicker={`${events.length} events`}>
          {events.slice(0, 30).map((e) => (
            <div key={e.event_id} className="border-t border-line py-2 text-sm">
              <span className="font-mono text-[10px] text-mute">{e.event_time.slice(0, 10)} </span>
              {e.summary}
              {e.financial_effect && (
                <span className="ml-2 font-mono text-xs text-teal">
                  {e.financial_effect.direction} {e.financial_effect.amount} {e.financial_effect.currency}
                </span>
              )}
            </div>
          ))}
          {!events.length && <p className="text-sm text-mute">No events tagged {domain}.</p>}
        </Card>
      </div>
    );
  }

  if (view === "DATA_HEALTH") {
    const h = snapshot.data_health;
    return (
      <div className="grid gap-3 p-4 lg:grid-cols-2">
        <Card title="Model honesty" kicker="Polished graphics are not certainty">
          <div className="space-y-4">
            <Meter label="completeness" value={h.record_completeness} />
            <Meter label="evidence strength" value={h.evidence_strength} />
            <Meter label="freshness" value={h.freshness} />
            <Meter label="contradiction rate" value={h.contradiction_rate} />
            <Meter label="stale state ratio" value={h.stale_state_ratio} />
            <Meter label="external verification" value={h.external_verification_coverage} />
          </div>
        </Card>
        <Card title="Gaps" kicker="Show the weakness">
          <ul className="list-disc space-y-2 pl-4 text-sm">
            {h.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
          <p className="mt-4 font-mono text-[11px] text-mute">
            {snapshot.event_count} events · {snapshot.contradictions.length} contradictions ·{" "}
            {snapshot.world_facts.length} world facts
          </p>
        </Card>
        {weekly && (
          <div className="lg:col-span-2">
            <Card title="Weekly intelligence" kicker={`${weekly.window_start.slice(0, 10)} → ${weekly.window_end.slice(0, 10)}`}>
              <div className="grid gap-3 md:grid-cols-2 text-sm">
                <div>
                  <div className="font-mono text-[10px] uppercase text-gold">State change</div>
                  {weekly.state_change.map((x) => (
                    <div key={x}>{x}</div>
                  ))}
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase text-gold">Bottlenecks</div>
                  {weekly.hidden_bottlenecks.map((x) => (
                    <div key={x}>{x}</div>
                  ))}
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase text-gold">Data gaps</div>
                  {weekly.data_gaps.map((x) => (
                    <div key={x}>{x}</div>
                  ))}
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase text-gold">Next position</div>
                  <p>{weekly.next_strategic_position}</p>
                </div>
              </div>
            </Card>
          </div>
        )}
        {scenarios && (
          <div className="lg:col-span-2 grid gap-3 md:grid-cols-2">
            {scenarios.map((s) => (
              <Card key={s.name} title={s.name} kicker="Scenario — not a prediction">
                <p className="text-xs text-mute">Assumptions: {s.assumptions.join(" · ")}</p>
                <p className="mt-2 text-sm">Actions: {s.required_actions.join(" · ")}</p>
                <p className="mt-1 text-xs text-rose">Risks: {s.risks.join(" · ")}</p>
                <p className="mt-1 text-xs text-gold-dim">Checkpoint: {s.reversible_checkpoints.join(" · ")}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    );
  }

  return null;
}
