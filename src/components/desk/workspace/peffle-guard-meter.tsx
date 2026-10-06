"use client";

import { ShieldCheck, ShieldWarning } from "@phosphor-icons/react";
import { Money } from "@/components/money";
import type { AgentResult, MerchantPolicies } from "@/lib/agent/types";
import type { DemoTracePayload } from "@/lib/peffle/demo-trace";
import type { CartState } from "@/hooks/use-cart";
import { cartDiscountPct } from "@/lib/cart-discount";

export function PeffleGuardMeter({
  policies,
  result,
  cart,
  trace,
  blocked,
  blockedReason,
  showStaffPolicyLink = false,
}: {
  policies: MerchantPolicies | null;
  result: AgentResult | null;
  cart: CartState;
  trace: DemoTracePayload | null;
  blocked: boolean;
  blockedReason: string | null;
  showStaffPolicyLink?: boolean;
}) {
  const maxOrder = policies?.maxOrderInr ?? 0;
  const orderValue = cart.itemCount > 0 ? cart.subtotal : (result?.subtotal ?? 0);
  const orderPct = maxOrder > 0 ? Math.min(100, Math.round((orderValue / maxOrder) * 100)) : 0;
  const cartDiscount = cart.itemCount > 0 ? cartDiscountPct(cart.lines) : 0;
  const discountUsed = cartDiscount > 0 ? cartDiscount : (result?.discountPct ?? 0);
  const discountMax = policies?.maxDiscountPct ?? 0;
  const margin = result?.marginPct ?? null;
  const marginFloor = policies?.minMarginPct ?? 0;
  const withinPolicy = !blocked && (result == null || result.status === "ready" || result.status === "empty");
  const killActive = trace?.allAgentsKilled === true;

  return (
    <section className="rf-peffle-guard" data-blocked={blocked ? "true" : "false"} data-testid="policy-result">
      {blocked ? (
        <div className="rf-peffle-stop">
          <p className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-danger">
            <ShieldWarning className="size-4" aria-hidden />
            Peffle stopped this action
          </p>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-ink-soft">
            {blockedReason ?? "Merchant policy or execution control blocked this offer."}
          </p>
        </div>
      ) : null}

      <div className="rf-peffle-guard-head">
        <p className="flex items-center gap-2 text-sm font-medium">
          {withinPolicy && !killActive ? (
            <ShieldCheck className="size-4 text-success" aria-hidden />
          ) : (
            <ShieldWarning className="size-4 text-danger" aria-hidden />
          )}
          {killActive ? "Kill switch on" : withinPolicy ? "Within policy" : "Outside policy"}
        </p>
        {showStaffPolicyLink ? (
          <a href="/admin/policies" className="text-[0.75rem] text-muted hover:text-ink">
            View policy
          </a>
        ) : null}
      </div>

      <div className="rf-peffle-guard-meter-row">
        <div className="rf-peffle-guard-meter" aria-hidden>
          <span style={{ width: `${orderPct}%` }} />
        </div>
        <p className="rf-peffle-guard-cap tabular">
          {cart.itemCount > 0 || result ? <Money value={orderValue} /> : "—"}
          {maxOrder > 0 ? (
            <>
              {" "}
              / <Money value={maxOrder} />
            </>
          ) : null}
        </p>
      </div>

      <dl className="rf-peffle-guard-stats">
        <div>
          <dt>Discount limit</dt>
          <dd className="tabular">
            {result ? `${discountUsed.toFixed(1)}%` : "—"} / {discountMax}%
          </dd>
        </div>
        <div>
          <dt>Margin floor</dt>
          <dd className="tabular">
            {margin != null ? `${margin.toFixed(1)}%` : "—"} / {marginFloor}%
          </dd>
        </div>
        <div>
          <dt>Order value</dt>
          <dd className="tabular">{cart.itemCount > 0 || result ? <Money value={orderValue} /> : "—"}</dd>
        </div>
      </dl>
    </section>
  );
}
