"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Prohibit, ShieldCheck } from "@phosphor-icons/react";
import { Money } from "@/components/money";
import { AdminPageLoading, Button, Input } from "@/components/admin/admin-ui";
import { formatInr } from "@/lib/format";
import type { PeffleControlEvent, PeffleControlState } from "@/lib/peffle/types";

function paiseToInr(paise: number) {
  return paise / 100;
}

function formatWhen(iso: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatEventTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AdminPeffleControl({
  compact = false,
}: {
  compact?: boolean;
}) {
  const [state, setState] = useState<PeffleControlState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmKill, setConfirmKill] = useState(false);
  const [confirmKillAll, setConfirmKillAll] = useState(false);
  const [capRupees, setCapRupees] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const applyState = useCallback((next: PeffleControlState) => {
    setState(next);
    setCapRupees(String(Math.round(next.spend.limitPaise / 100)));
  }, []);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/peffle", { credentials: "include" });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      throw new Error(payload.error ?? "Could not load Peffle status.");
    }
    applyState((await response.json()) as PeffleControlState);
  }, [applyState]);

  useEffect(() => {
    async function boot() {
      try {
        await load();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not load Peffle status.");
      } finally {
        setLoading(false);
      }
    }
    void boot();
  }, [load]);

  useEffect(() => {
    const handler = () => void load();
    window.addEventListener("razorflow:admin-guardrails-updated", handler);
    return () => window.removeEventListener("razorflow:admin-guardrails-updated", handler);
  }, [load]);

  async function postJson(url: string, body: unknown) {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(url, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = (await response.json()) as (PeffleControlState & { error?: string; state?: PeffleControlState });
      if (!response.ok) {
        throw new Error(payload.error ?? "Request failed.");
      }
      applyState(payload.state ?? payload);
      return payload.state ?? payload;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function onKill() {
    const next = await postJson("/api/admin/peffle/kill", { action: "kill" });
    if (next) {
      setConfirmKill(false);
      setNotice("Agent disabled. Checkout.create is blocked.");
    }
  }

  async function onRevive() {
    const next = await postJson("/api/admin/peffle/kill", { action: "revive" });
    if (next) {
      setNotice("Agent enabled.");
    }
  }

  async function onKillAll() {
    const next = await postJson("/api/admin/peffle/kill", { action: "kill-all" });
    if (next) {
      setConfirmKillAll(false);
      setNotice("All known agents disabled, including checkout.create.");
    }
  }

  async function onReviveAll() {
    const next = await postJson("/api/admin/peffle/kill", { action: "revive-all" });
    if (next) {
      setNotice("All known agents enabled.");
    }
  }

  async function onSaveCap(event: FormEvent) {
    event.preventDefault();
    const rupees = Number(capRupees);
    if (!Number.isFinite(rupees) || rupees < 0) {
      setError("Enter a non-negative rupee amount.");
      return;
    }
    const capPaise = Math.round(rupees * 100);
    const next = await postJson("/api/admin/peffle/cap", { capPaise });
    if (next) {
      setNotice(`Daily cap ${formatInr(capPaise / 100)}.`);
    }
  }

  if (loading) return <AdminPageLoading label="Loading Peffle protection…" />;
  if (!state) {
    return (
      <div className="rf-admin-block">
        <p className="text-sm text-danger">{error ?? "Peffle status unavailable."}</p>
      </div>
    );
  }

  const protectedNow = !state.killed;
  const spentInr = paiseToInr(state.spend.spentPaise);
  const limitInr = paiseToInr(state.spend.limitPaise);
  const remainingInr = paiseToInr(state.spend.remainingPaise);
  const fill = state.spend.limitPaise > 0 ? Math.min(100, (state.spend.spentPaise / state.spend.limitPaise) * 100) : 0;

  return (
    <div className="rf-peffle-control">
      {error ? (
        <p className="mb-3 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-3 text-sm text-ink-soft" role="status">
          {notice}
        </p>
      ) : null}

      <div className="rf-peffle-control-grid">
        <section
          className="rf-peffle-card rf-peffle-card-status"
          data-state={protectedNow ? "protected" : "disabled"}
          aria-labelledby="peffle-protection"
        >
          <p className="rf-peffle-kicker" id="peffle-protection">
            Peffle protection
          </p>
          <div className="mt-3 flex items-center gap-2.5">
            <span className="rf-peffle-dot" data-on={protectedNow ? "true" : "false"} aria-hidden />
            <p className="text-[1.35rem] font-semibold tracking-tight" data-testid="peffle-protection-status">
              {protectedNow ? "Agent Protected" : "Agent Disabled"}
            </p>
          </div>
          <dl className="rf-peffle-meta">
            <div>
              <dt>Agent</dt>
              <dd className="font-mono" data-testid="peffle-agent-id">
                {state.agentId}
              </dd>
            </div>
            <div>
              <dt>Guard</dt>
              <dd data-testid="peffle-guard-state">
                {state.executionGuard === "active" ? "ACTIVE" : "DISABLED"}
              </dd>
            </div>
            <div>
              <dt>Last activity</dt>
              <dd>{formatWhen(state.lastActivityAt)}</dd>
            </div>
          </dl>
        </section>

        <section className="rf-peffle-card" aria-labelledby="peffle-spend">
          <p className="rf-peffle-kicker" id="peffle-spend">
            Agent spend
          </p>
          <p className="mt-3 text-[1.65rem] font-semibold tracking-tight tabular" data-testid="peffle-spend">
            <Money value={spentInr} />
            <span className="text-muted"> / </span>
            <Money value={limitInr} />
          </p>
          <p className="mt-1 text-sm text-muted">
            <span data-testid="peffle-remaining">
              <Money value={remainingInr} />
            </span>{" "}
            remaining
          </p>
          <div className="rf-peffle-meter mt-4" aria-hidden>
            <span style={{ width: `${fill}%` }} />
          </div>
          {!compact ? (
            <form className="rf-peffle-cap" onSubmit={(event) => void onSaveCap(event)}>
              <label className="sr-only" htmlFor="peffle-cap-input">
                Daily cap in rupees
              </label>
              <Input
                id="peffle-cap-input"
                className="w-28 font-mono"
                type="number"
                min={0}
                step={1}
                value={capRupees}
                onChange={(event) => setCapRupees(event.target.value)}
                data-testid="peffle-cap-input"
              />
              <Button type="submit" variant="ghost" disabled={busy} data-testid="peffle-cap-save">
                Set cap
              </Button>
            </form>
          ) : null}
        </section>
      </div>

      <section
        className="rf-peffle-card rf-peffle-kill"
        data-state={protectedNow ? "armed" : "tripped"}
        aria-labelledby="peffle-kill"
      >
        <div>
          <p className="rf-peffle-kicker" id="peffle-kill">
            Kill switch
          </p>
          <p className="mt-2 text-sm text-ink">
            {protectedNow ? "Armed. Disabling stops checkout before Razorpay." : "Tripped. Checkout.create is blocked."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {protectedNow ? (
            confirmKill ? (
              <>
                <Button
                  type="button"
                  variant="danger"
                  data-testid="peffle-kill-confirm"
                  disabled={busy}
                  onClick={() => void onKill()}
                >
                  <Prohibit className="size-4" aria-hidden />
                  Confirm disable
                </Button>
                <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmKill(false)}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                type="button"
                variant="danger"
                data-testid="peffle-kill"
                disabled={busy}
                onClick={() => setConfirmKill(true)}
              >
                <Prohibit className="size-4" aria-hidden />
                Disable agent
              </Button>
            )
          ) : (
            <Button
              type="button"
              variant="primary"
              data-testid="peffle-revive"
              disabled={busy}
              onClick={() => void onRevive()}
            >
              <ShieldCheck className="size-4" aria-hidden />
              Enable agent
            </Button>
          )}
          {state.allAgentsKilled ? (
            <Button
              type="button"
              variant="primary"
              data-testid="peffle-revive-all"
              disabled={busy}
              onClick={() => void onReviveAll()}
            >
              Revive all agents
            </Button>
          ) : confirmKillAll ? (
            <>
              <Button
                type="button"
                variant="danger"
                data-testid="peffle-kill-all-confirm"
                disabled={busy}
                onClick={() => void onKillAll()}
              >
                Confirm kill all
              </Button>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => setConfirmKillAll(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button
              type="button"
              variant="danger"
              data-testid="peffle-kill-all"
              disabled={busy}
              onClick={() => setConfirmKillAll(true)}
            >
              Kill all agents
            </Button>
          )}
        </div>
      </section>

      {!compact && state.discountSpend ? (
        <section className="rf-peffle-card" data-testid="peffle-discount-budget" aria-label="Daily discount budget">
          <p className="rf-peffle-kicker">Daily discount budget</p>
          <p className="mt-3 text-lg font-semibold tabular" data-testid="peffle-discount-spent">
            <Money value={state.discountSpend.spentPaise / 100} />
            <span className="text-muted"> / </span>
            <Money value={state.discountSpend.limitPaise / 100} />
          </p>
          <p className="mt-1 text-sm text-muted" data-testid="peffle-discount-remaining">
            <Money value={state.discountSpend.remainingPaise / 100} /> remaining
          </p>
        </section>
      ) : null}

      {!compact && state.pendingApprovals.length > 0 ? (
        <section className="rf-peffle-card" data-testid="peffle-pending-approvals">
          <p className="rf-peffle-kicker">Pending approvals</p>
          <ul className="mt-3 space-y-3">
            {state.pendingApprovals.map((row) => (
              <li key={row.eventId} className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-xs">{row.action}</p>
                  <p className="text-sm text-muted">{row.eventId}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    data-testid="peffle-approve"
                    disabled={busy}
                    onClick={() => void postJson("/api/admin/peffle/approvals", { eventId: row.eventId, decision: "approve" })}
                  >
                    Approve
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    data-testid="peffle-deny"
                    disabled={busy}
                    onClick={() => void postJson("/api/admin/peffle/approvals", { eventId: row.eventId, decision: "deny" })}
                  >
                    Deny
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!compact && state.agents.length > 0 ? (
        <section className="rf-peffle-card" data-testid="peffle-agents">
          <p className="rf-peffle-kicker">Agents</p>
          <ul className="mt-3 space-y-2">
            {state.agents.map((agent) => (
              <li key={agent.agentId} className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs" data-testid="peffle-listed-agent">
                  {agent.agentId} · {agent.killed ? "disabled" : "live"}
                </p>
                <Button
                  type="button"
                  variant={agent.killed ? "primary" : "danger"}
                  data-testid={agent.killed ? "peffle-agent-revive" : "peffle-agent-kill"}
                  disabled={busy}
                  onClick={() =>
                    void postJson("/api/admin/peffle/kill", {
                      action: agent.killed ? "revive" : "kill",
                      agentId: agent.agentId,
                    })
                  }
                >
                  {agent.killed ? "Revive" : "Kill"}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!compact ? (
        <>
          <section className="rf-peffle-activity" aria-labelledby="peffle-activity">
            <div className="rf-peffle-activity-head">
              <h2 id="peffle-activity" className="rf-peffle-kicker">
                Execution activity
              </h2>
            </div>
            {state.events.length === 0 ? (
              <p className="text-sm text-muted">No guarded checkouts yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="rf-peffle-table" data-testid="peffle-activity">
                  <thead>
                    <tr>
                      <th>Time</th>
                      <th>Action</th>
                      <th>Amount</th>
                      <th>Result</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.events.map((event) => (
                      <ExecutionRow key={event.id} event={event} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="rf-peffle-layers" aria-label="Policy layers">
            <article className="rf-peffle-layer" data-layer="merchant">
              <p className="rf-peffle-kicker">Merchant policy</p>
              <p className="rf-peffle-layer-status">Active</p>
              <p>Catalog, price, discount, margin.</p>
            </article>
            <article className="rf-peffle-layer" data-layer="peffle">
              <p className="rf-peffle-kicker">Peffle execution policy</p>
              <p className="rf-peffle-layer-status">Active</p>
              <p>Spend cap, kill switch, execution.</p>
            </article>
          </section>
        </>
      ) : null}
    </div>
  );
}

function ExecutionRow({ event }: { event: PeffleControlEvent }) {
  return (
    <tr data-result={event.result}>
      <td className="whitespace-nowrap text-muted">{formatEventTime(event.createdAt)}</td>
      <td className="font-mono text-xs">{event.action}</td>
      <td className="tabular">
        {event.amountPaise == null ? "—" : <Money value={paiseToInr(event.amountPaise)} />}
      </td>
      <td>
        <span className="rf-peffle-result" data-result={event.result}>
          {event.result}
        </span>
      </td>
      <td>{event.reason ?? "—"}</td>
    </tr>
  );
}
