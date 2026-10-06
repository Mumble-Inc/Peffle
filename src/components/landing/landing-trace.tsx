"use client";

import { useId, useState, type KeyboardEvent } from "react";
import Image from "next/image";
import { Money } from "@/components/money";
import { LandingProductStage } from "@/components/landing/landing-product-stage";
import { traceStepToSettlementId } from "@/components/landing/landing-settlement-rail";
import type { LandingShowcase } from "@/lib/services/desk-context";

const STEPS = [
  { id: "intent", label: "Intent" },
  { id: "understanding", label: "Understanding" },
  { id: "policy", label: "Policy" },
  { id: "approval", label: "Approval" },
  { id: "settlement", label: "Settlement" },
] as const;

export type LandingTraceStepId = (typeof STEPS)[number]["id"];

type LandingTraceProps = {
  showcase: LandingShowcase;
  /** When true, wraps trace in L3 product stage with settlement rail */
  inProductStage?: boolean;
};

export function LandingTrace({ showcase, inProductStage = true }: LandingTraceProps) {
  const featured = showcase.featured;
  const baseId = useId();
  const [step, setStep] = useState<LandingTraceStepId>("intent");

  if (!featured) {
    const empty = (
      <div className="rf-trace-panel-inner">
        <p className="rf-trace-note">
          Add active catalog products to preview a live recommendation here.
        </p>
      </div>
    );
    if (!inProductStage) return empty;
    return (
      <LandingProductStage settlementStep="intent" id="live-trace">
        {empty}
      </LandingProductStage>
    );
  }

  const budget = Math.ceil(featured.price * 1.1);
  const panelId = `${baseId}-panel`;
  const settlementStep = traceStepToSettlementId(step);

  function select(next: LandingTraceStepId, moveFocus: boolean) {
    setStep(next);
    if (moveFocus) {
      requestAnimationFrame(() => {
        document.getElementById(`${baseId}-tab-${next}`)?.focus();
      });
    }
  }

  function onTabsKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const index = STEPS.findIndex((item) => item.id === step);
    if (index < 0) return;
    let nextIndex = index;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (index + 1) % STEPS.length;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex = (index - 1 + STEPS.length) % STEPS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = STEPS.length - 1;
    } else {
      return;
    }
    event.preventDefault();
    select(STEPS[nextIndex].id, true);
  }

  const traceBody = (
    <div className="rf-trace">
      <div
        className="rf-trace-tabs"
        role="tablist"
        aria-label="Commerce trace"
        aria-orientation="vertical"
        onKeyDown={onTabsKeyDown}
      >
        {STEPS.map((item, index) => {
          const selected = step === item.id;
          return (
            <button
              key={item.id}
              id={`${baseId}-tab-${item.id}`}
              type="button"
              className="rf-trace-tab"
              role="tab"
              aria-selected={selected}
              aria-controls={panelId}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(item.id, false)}
            >
              <span className="rf-trace-tab-index">{String(index + 1).padStart(2, "0")}</span>
              {item.label}
            </button>
          );
        })}
      </div>

      <div id={panelId} role="tabpanel" aria-labelledby={`${baseId}-tab-${step}`} className="rf-trace-panel-inner">
        <div key={step} className="rf-trace-panel-in">
          <TracePanel
            step={step}
            name={featured.name}
            blurb={featured.blurb}
            price={featured.price}
            image={featured.image}
            imageAlt={featured.imageAlt}
            attachName={featured.attachName}
            attachPrice={featured.attachPrice}
            budget={budget}
            discountCeilingPct={showcase.discountCeilingPct}
          />
        </div>
      </div>
    </div>
  );

  if (!inProductStage) return traceBody;

  return (
    <LandingProductStage settlementStep={settlementStep} id="live-trace">
      {traceBody}
    </LandingProductStage>
  );
}

function TracePanel({
  step,
  name,
  blurb,
  price,
  image,
  imageAlt,
  attachName,
  attachPrice,
  budget,
  discountCeilingPct,
}: {
  step: LandingTraceStepId;
  name: string;
  blurb: string;
  price: number;
  image: string;
  imageAlt: string;
  attachName: string | null;
  attachPrice: number | null;
  budget: number;
  discountCeilingPct: number;
}) {
  if (step === "intent") {
    return (
      <>
        <p className="rf-trace-meta">Request</p>
        <p className="rf-trace-statement">
          Over-ear headphones for a long flight. Budget around <Money value={budget} />.
        </p>
        <p className="rf-trace-note">
          An illustration, not a request the agent just received. {blurb}
        </p>
      </>
    );
  }

  if (step === "understanding") {
    return (
      <>
        <p className="rf-trace-meta">Understanding</p>
        <div className="rf-trace-product">
          <Image src={image} alt={imageAlt} width={112} height={112} />
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight" translate="no">
              {name}
            </p>
            <p className="rf-trace-price">
              <Money value={price} />
            </p>
            {attachName && attachPrice != null ? (
              <p className="rf-trace-note">
                Attach in catalog: {attachName} (<Money value={attachPrice} />)
              </p>
            ) : (
              <p className="rf-trace-note">
                Matched from the live catalog. List price, not a generated offer.
              </p>
            )}
          </div>
        </div>
      </>
    );
  }

  if (step === "policy") {
    return (
      <>
        <p className="rf-trace-meta">Policy</p>
        <p className="rf-trace-status" data-tone="accent">
          Allowed
        </p>
        <p className="rf-trace-note">
          This illustration stays inside the published {discountCeilingPct}% discount ceiling. It is
          not a verdict from a live run.
        </p>
      </>
    );
  }

  if (step === "approval") {
    return (
      <>
        <p className="rf-trace-meta">Approval</p>
        <p className="rf-trace-status" data-tone="accent">
          Approved
        </p>
        <p className="rf-trace-note">
          On the desk, checkout still waits for authorization. A spend cap or the kill switch can
          stop it before an order exists.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="rf-trace-meta">Settlement</p>
      <p className="rf-trace-status" data-tone="accent">
        Ready
      </p>
      <p className="rf-trace-note">
        Razorpay can receive this order from the desk. Capture is verified before it counts in the
        ledger. This page does not create a payment.
      </p>
    </>
  );
}
