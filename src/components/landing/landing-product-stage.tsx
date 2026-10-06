"use client";

import type { ReactNode } from "react";
import {
  LandingSettlementRail,
  type LandingSettlementStepId,
} from "@/components/landing/landing-settlement-rail";

type LandingProductStageProps = {
  settlementStep: LandingSettlementStepId;
  children: ReactNode;
  id?: string;
};

/** L3 hero product shell — glass over env wash, settlement rail + trace */
export function LandingProductStage({ settlementStep, children, id }: LandingProductStageProps) {
  return (
    <div id={id} className="rf-product-stage" data-testid="landing-product-stage">
      <div
        className="rf-product-stage-shell rf-glass-l3 rf-glass-hero"
        data-rf-glass-level="3"
        data-rf-glass-purpose="hero-product-stage"
      >
        <div className="rf-product-stage-rail">
          <p className="rf-product-stage-rail-title">Settlement line</p>
          <LandingSettlementRail activeStepId={settlementStep} compact />
        </div>
        <div className="rf-product-stage-main">{children}</div>
      </div>
    </div>
  );
}
