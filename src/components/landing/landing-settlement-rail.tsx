"use client";

import { CheckCircle, Circle, Prohibit } from "@phosphor-icons/react";

export const LANDING_SETTLEMENT_STEPS = [
  { id: "intent", label: "Intent" },
  { id: "understanding", label: "Understanding" },
  { id: "policy", label: "Policy" },
  { id: "approval", label: "Approval" },
  { id: "commerce", label: "Commerce" },
  { id: "settlement", label: "Settlement" },
  { id: "ledger", label: "Ledger" },
] as const;

export type LandingSettlementStepId = (typeof LANDING_SETTLEMENT_STEPS)[number]["id"];

type RailMode = "progress" | "blocked";

type LandingSettlementRailProps = {
  activeStepId: LandingSettlementStepId;
  mode?: RailMode;
  /** Step id where the line stops when mode is blocked */
  blockedAt?: LandingSettlementStepId;
  className?: string;
  compact?: boolean;
};

function stepIndex(id: LandingSettlementStepId) {
  return LANDING_SETTLEMENT_STEPS.findIndex((s) => s.id === id);
}

export function LandingSettlementRail({
  activeStepId,
  mode = "progress",
  blockedAt = "policy",
  className = "",
  compact = false,
}: LandingSettlementRailProps) {
  const activeIndex = stepIndex(activeStepId);
  const blockIndex = mode === "blocked" ? stepIndex(blockedAt) : -1;

  return (
    <ol
      className={`rf-settlement-rail ${compact ? "rf-settlement-rail-compact" : ""} ${className}`}
      aria-label="Settlement line"
    >
      {LANDING_SETTLEMENT_STEPS.map((step, index) => {
        const isBlockedNode = mode === "blocked" && index === blockIndex;
        const isPast =
          mode === "blocked" ? index < blockIndex : index < activeIndex;
        const isActive = mode !== "blocked" && index === activeIndex;
        const isFuture =
          mode === "blocked" ? index > blockIndex : index > activeIndex;
        const stopLine = mode === "blocked" && blockIndex > 0 && index === blockIndex - 1;

        return (
          <li
            key={step.id}
            className="rf-settlement-rail-item"
            data-state={
              isBlockedNode ? "blocked" : isActive ? "active" : isPast ? "done" : "idle"
            }
            data-stop-line={stopLine ? "true" : undefined}
            aria-current={isActive ? "step" : undefined}
          >
            <span className="rf-settlement-rail-marker" aria-hidden>
              {isBlockedNode ? (
                <Prohibit className="size-4" weight="regular" />
              ) : isPast || isActive ? (
                <CheckCircle className="size-4" weight="regular" />
              ) : (
                <Circle className="size-4" weight="regular" />
              )}
            </span>
            <span className="rf-settlement-rail-label">{step.label}</span>
            {isFuture && mode === "blocked" && index === blockIndex + 1 ? (
              <span className="sr-only">Not reached. Request stopped at the gate.</span>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/** Map interactive trace tabs to settlement rail position */
export function traceStepToSettlementId(
  traceStep: "intent" | "understanding" | "policy" | "approval" | "settlement",
): LandingSettlementStepId {
  switch (traceStep) {
    case "intent":
      return "intent";
    case "understanding":
      return "understanding";
    case "policy":
      return "policy";
    case "approval":
      return "approval";
    case "settlement":
      return "settlement";
    default:
      return "intent";
  }
}
