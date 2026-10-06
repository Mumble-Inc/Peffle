"use client";

import { BusinessDisclosure } from "@/components/marketing/business/business-page-chrome";
import {
  governedActionsRevenueInr,
  PEFFLE_CREDIT_INR_PER_1000_ACTIONS,
} from "@/lib/peffle/pricing-constants";
import { LABEL_ILLUSTRATIVE_MODEL } from "@/lib/peffle/deployment-feasibility";

/** Illustrative curves — not measured production data. */
const ACTION_POINTS = [0, 250_000, 500_000, 1_000_000, 5_000_000, 10_000_000, 50_000_000];

function revenueInr(actions: number) {
  return governedActionsRevenueInr(actions);
}

function modelInfraInr(actions: number) {
  const base = 8_000;
  const variable = (actions / 1_000_000) * 1_200;
  return base + variable;
}

const WIDTH = 640;
const HEIGHT = 220;
const PAD = { top: 12, right: 16, bottom: 32, left: 48 };

export function UnitEconomicsChart() {
  const maxActions = ACTION_POINTS[ACTION_POINTS.length - 1]!;
  const maxValue = Math.max(
    ...ACTION_POINTS.map((a) => Math.max(revenueInr(a), modelInfraInr(a))),
  );

  const x = (actions: number) =>
    PAD.left + (actions / maxActions) * (WIDTH - PAD.left - PAD.right);
  const y = (inr: number) =>
    HEIGHT - PAD.bottom - (inr / maxValue) * (HEIGHT - PAD.top - PAD.bottom);

  const revenuePath = ACTION_POINTS.map((a, i) => `${i === 0 ? "M" : "L"} ${x(a)} ${y(revenueInr(a))}`).join(" ");
  const infraPath = ACTION_POINTS.map((a, i) => `${i === 0 ? "M" : "L"} ${x(a)} ${y(modelInfraInr(a))}`).join(" ");

  return (
    <figure className="rf-biz-chart">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="rf-biz-chart-svg"
        role="img"
        aria-label="Illustrative chart: Peffle revenue rises faster than modelled infrastructure cost as governed actions increase"
      >
        <line
          x1={PAD.left}
          y1={HEIGHT - PAD.bottom}
          x2={WIDTH - PAD.right}
          y2={HEIGHT - PAD.bottom}
          className="rf-biz-chart-axis"
        />
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={HEIGHT - PAD.bottom}
          className="rf-biz-chart-axis"
        />
        <path d={infraPath} className="rf-biz-chart-line rf-biz-chart-line--infra" fill="none" />
        <path d={revenuePath} className="rf-biz-chart-line rf-biz-chart-line--revenue" fill="none" />
        <text x={PAD.left} y={HEIGHT - 8} className="rf-biz-chart-label">0</text>
        <text x={WIDTH - PAD.right - 40} y={HEIGHT - 8} className="rf-biz-chart-label">
          Governed actions →
        </text>
      </svg>
      <figcaption className="rf-biz-chart-legend">
        <span>
          <i className="rf-biz-swatch rf-biz-swatch--revenue" /> {LABEL_ILLUSTRATIVE_MODEL}: revenue at
          ₹{PEFFLE_CREDIT_INR_PER_1000_ACTIONS} / 1k actions
        </span>
        <span><i className="rf-biz-swatch rf-biz-swatch--infra" /> Modelled infrastructure (planning curve)</span>
      </figcaption>
      <BusinessDisclosure>
        Illustrative unit economics — not measured production data. Infrastructure curve is a simple
        planning model (fixed base + per-million-actions variable), not vendor invoices.
      </BusinessDisclosure>
    </figure>
  );
}
