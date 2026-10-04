"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle, PauseCircle, Prohibit, Skull, WarningCircle } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Money } from "@/components/money";
import type { DemoTracePayload, DemoTraceRow } from "@/lib/peffle/demo-trace";

const STORAGE_KEY = "razorflow-demo-mode";

export function readDemoModeOn() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function DemoModeToggle({
  available,
  on: enabled,
  onChange,
}: {
  available: boolean;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  if (!available) return null;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      data-testid="demo-mode-toggle"
      className="inline-flex min-h-11 items-center gap-2 rounded-[8px] border border-line/70 bg-surface px-3 text-sm text-ink-soft hover:text-ink"
      onClick={() => {
        const next = !enabled;
        try {
          sessionStorage.setItem(STORAGE_KEY, next ? "1" : "0");
        } catch {
          // session-only; ignore quota
        }
        onChange(next);
      }}
    >
      <span className="size-2 rounded-full" aria-hidden style={{ background: enabled ? "var(--rf-accent)" : "var(--rf-muted)" }} />
      Demo Mode
    </button>
  );
}

function DecisionMark({ decision }: { decision: DemoTraceRow["decision"] }) {
  if (decision === "ALLOW") return <CheckCircle className="size-7" aria-hidden />;
  if (decision === "APPROVE") return <PauseCircle className="size-7" aria-hidden />;
  if (decision === "KILL") return <Skull className="size-7" aria-hidden />;
  if (decision === "FAIL") return <WarningCircle className="size-7" aria-hidden />;
  return <Prohibit className="size-7" aria-hidden />;
}

function StageRow({ label, outcome }: { label: string; outcome: string }) {
  const pass = outcome === "PASS" || outcome === "ALLOW";
  const warn = outcome === "REQUIRED";
  return (
    <div className="rf-peffle-trace-stage">
      <span>{label}</span>
      <span className="inline-flex items-center gap-1.5 font-medium">
        {pass ? <CheckCircle className="size-4" aria-hidden /> : warn ? <PauseCircle className="size-4" aria-hidden /> : <Prohibit className="size-4" aria-hidden />}
        {outcome}
      </span>
    </div>
  );
}

export function useDemoTrace(enabled: boolean, sessionId: string | null, refreshNonce: number) {
  const [payload, setPayload] = useState<DemoTracePayload | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    const response = await fetch("/api/admin/peffle/trace", { credentials: "include" });
    if (!response.ok) {
      setPayload(null);
      return;
    }
    setPayload((await response.json()) as DemoTracePayload);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setPayload(null);
      return;
    }
    void refresh();
    function tick() {
      if (document.visibilityState === "hidden") return;
      void refresh();
    }
    const id = window.setInterval(tick, 1500);
    function onVis() {
      if (document.visibilityState === "visible") void refresh();
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [enabled, refresh, refreshNonce, sessionId]);

  return payload;
}

export function PeffleGuardTrace({
  sessionId,
  on: enabled,
  refreshNonce,
  planner,
}: {
  sessionId: string | null;
  on: boolean;
  refreshNonce: number;
  planner: "gemini" | "deterministic" | null;
}) {
  const reduce = useReducedMotion();
  const payload = useDemoTrace(enabled, sessionId, refreshNonce);

  if (!enabled) return null;

  const latest = payload?.latest ?? null;
  const spent = payload?.discountSpend.spentPaise ?? 0;
  const limit = payload?.discountSpend.limitPaise ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;

  return (
    <section className="rf-peffle-trace" data-testid="peffle-trace" aria-label="Peffle Guard live trace">
      <header className="rf-peffle-trace-head">
        <div>
          <p className="rf-peffle-trace-kicker">Peffle Guard</p>
          <p className="text-xs text-muted">Agent action → merchant policy → execution authority</p>
        </div>
        <p className="rf-peffle-trace-live" data-live="true">
          <span className="rf-peffle-trace-pulse" data-reduce={reduce ? "true" : "false"} aria-hidden />
          LIVE
        </p>
      </header>

      <p className="mt-4 text-[0.6875rem] uppercase tracking-[0.12em] text-muted">Agent requested</p>
      <p className="mt-1 font-mono text-sm font-medium" data-testid="peffle-trace-action">
        {latest?.action ?? "—"}
      </p>
      {planner ? (
        <p className="rf-peffle-trace-planner" data-testid="peffle-trace-planner">
          {planner}
        </p>
      ) : null}

      {latest?.merchant ? <StageRow label={latest.merchant.label} outcome={latest.merchant.outcome} /> : null}
      {latest?.peffle ? <StageRow label={latest.peffle.label} outcome={latest.peffle.outcome} /> : null}

      <AnimatePresence mode="wait">
        <motion.div
          key={latest?.id ?? "idle"}
          initial={reduce ? false : { opacity: 0.4 }}
          animate={{ opacity: 1 }}
          className="rf-peffle-trace-decision"
          data-decision={latest?.decision ?? "IDLE"}
          data-testid="peffle-trace-decision"
        >
          <DecisionMark decision={latest?.decision ?? "IDLE"} />
          <span>{latest?.headline ?? "Waiting for a guarded action"}</span>
        </motion.div>
      </AnimatePresence>
      <p className="rf-peffle-trace-reason" data-testid="peffle-trace-reason">
        {latest?.reasonCode ?? ""}
      </p>
      <p className="mt-2 text-sm text-ink-soft">{latest?.execution ?? ""}</p>

      <div className="rf-peffle-trace-budget" data-testid="peffle-trace-budget">
        <div className="flex justify-between text-xs text-muted">
          <span>Discount budget</span>
          <span className="tabular">
            <Money value={spent / 100} /> / <Money value={limit / 100} />
          </span>
        </div>
        <div className="rf-peffle-meter mt-1.5" aria-hidden>
          <span style={{ width: `${pct}%` }} />
        </div>
      </div>

      {payload?.history.length ? (
        <ul className="rf-peffle-trace-history" data-testid="peffle-trace-history">
          {payload.history.map((row) => (
            <li key={row.id}>
              <span aria-hidden>{row.decision === "ALLOW" ? "✓" : row.decision === "APPROVE" ? "!" : "✕"}</span>
              <span className="font-mono">{row.action}</span>
              <span>{row.reasonCode}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
