"use client";

import type { HTMLAttributes, ReactNode } from "react";
import { Prohibit, CheckCircle } from "@phosphor-icons/react";

type SettlementLineProps = HTMLAttributes<HTMLDivElement> & {
  steps: Array<{ id: string; label: string; state?: "idle" | "active" | "done" | "blocked" }>;
};

/** Horizontal settlement progress — accent for active/done, blocked uses gate color + label. */
export function SettlementLine({ steps, className = "", ...props }: SettlementLineProps) {
  return (
    <div
      className={`flex flex-wrap items-center gap-2 ${className}`}
      role="list"
      aria-label="Settlement progress"
      {...props}
    >
      {steps.map((step, index) => {
        const isBlocked = step.state === "blocked";
        const isActive = step.state === "active";
        const isDone = step.state === "done";
        return (
          <div key={step.id} className="flex items-center gap-2" role="listitem">
            {index > 0 ? (
              <span
                className="hidden h-px w-6 bg-line sm:inline-block"
                aria-hidden
              />
            ) : null}
            <span
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-[var(--rf-radius-pill)] px-3 rf-type-ui ${
                isBlocked
                  ? "bg-[color-mix(in_oklab,var(--rf-blocked)_12%,transparent)] text-blocked"
                  : isActive
                    ? "bg-accent text-white"
                    : isDone
                      ? "bg-accent-soft text-accent"
                      : "bg-canvas-2 text-muted"
              }`}
            >
              {isDone ? <CheckCircle className="size-4" weight="regular" aria-hidden /> : null}
              {isBlocked ? <Prohibit className="size-4" weight="regular" aria-hidden /> : null}
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function SettlementGate({
  title,
  reason,
  action,
  elevated = false,
  className = "",
  ...props
}: {
  title: string;
  reason: string;
  action?: ReactNode;
  /** L3 glass when gate is the focal policy boundary */
  elevated?: boolean;
  className?: string;
} & HTMLAttributes<HTMLDivElement>) {
  const base =
    "rounded-[var(--rf-radius-panel)] border border-[color-mix(in_oklab,var(--rf-blocked)_35%,var(--rf-line))] p-4";
  const surface = elevated
    ? "rf-glass-l3"
    : "rf-surface-section bg-[color-mix(in_oklab,var(--rf-blocked)_8%,var(--rf-bg-secondary))]";

  return (
    <div
      className={`${base} ${surface} ${className}`}
      role="status"
      data-testid={elevated ? "glass-gate-focal" : undefined}
      {...(elevated ? { "data-rf-glass-level": "3", "data-rf-glass-purpose": "settlement-gate" } : {})}
      {...props}
    >
      <div className="flex gap-3">
        <Prohibit className="mt-0.5 size-5 shrink-0 text-blocked" weight="regular" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="rf-type-ui font-semibold text-ink">{title}</p>
          <p className="mt-1 rf-type-body text-ink-soft">{reason}</p>
          {action ? <div className="mt-3">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}
