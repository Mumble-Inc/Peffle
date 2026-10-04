"use client";

import { type ReactNode } from "react";
import Image from "next/image";
import { CaretRight, ShieldCheck } from "@phosphor-icons/react";
import { AgentChatPanel } from "@/components/desk/agent-chat-panel";
import { CompletedTransaction, PaymentNotCompleted } from "@/components/desk/completed-transaction";
import { PeffleBlockedPanel } from "@/components/desk/peffle-blocked";
import { PeffleGuardTrace } from "@/components/desk/peffle-guard-trace";
import { TransactionCart } from "@/components/desk/transaction-cart";
import { Money } from "@/components/money";
import { buildPolicyCopy } from "@/lib/policy/copy";
import type { AgentResult, MerchantPolicies, Product } from "@/lib/agent/types";
import type { CartState } from "@/hooks/use-cart";
import type { CapturedPaymentView } from "@/lib/desk/payment-display";
import type { PeffleCheckoutBlock } from "@/lib/peffle/types";
import type { Phase } from "@/components/desk/desk-types";

export type DeskRailTab = "chat" | "cart" | "policy" | "trace";

function shortName(name: string) {
  return name.replace(/^Northline\s+/i, "");
}

function MiniRecs({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <div className="rf-peffle-mini-recs">
      {products.slice(0, 3).map((product) => (
        <div key={product.sku} className="rf-peffle-mini-rec">
          <Image src={product.image} alt={product.imageAlt} width={120} height={72} />
          <p className="truncate text-[0.75rem] font-medium" translate="no">
            {shortName(product.name)}
          </p>
          <p className="text-[0.75rem] text-muted">
            <Money value={product.price} />
          </p>
        </div>
      ))}
    </div>
  );
}

export function DeskContextRail({
  tab,
  onTabChange,
  intent,
  result,
  cart,
  cartLoading,
  sessionId,
  phase,
  policies,
  demoModeAvailable,
  demoModeOn,
  demoRefreshNonce,
  lastPlanner,
  capturedPayment,
  peffleBlock,
  error,
  busy,
  transactionLocked,
  onUpdateQuantity,
  onRemoveLine,
  onAuthorize,
  onSimulateDecline,
  onStartNewSale,
  onTryAgain,
  onDismissBlock,
  onChatTurn,
  children,
}: {
  tab: DeskRailTab;
  onTabChange: (tab: DeskRailTab) => void;
  intent: string;
  result: AgentResult | null;
  cart: CartState;
  cartLoading: boolean;
  sessionId: string | null;
  phase: Phase;
  policies: MerchantPolicies | null;
  demoModeAvailable: boolean;
  demoModeOn: boolean;
  demoRefreshNonce: number;
  lastPlanner: "gemini" | "deterministic" | null;
  capturedPayment: CapturedPaymentView | null;
  peffleBlock: PeffleCheckoutBlock | null;
  error: string | null;
  busy: boolean;
  transactionLocked: boolean;
  onUpdateQuantity: (lineId: string, quantity: number) => void | Promise<boolean>;
  onRemoveLine: (lineId: string) => void | Promise<boolean>;
  onAuthorize: () => void;
  onSimulateDecline: () => void;
  onStartNewSale: () => void;
  onTryAgain: () => void;
  onDismissBlock: () => void;
  onChatTurn: (turn: { planner: "gemini" | "deterministic" }) => void;
  children?: ReactNode;
}) {
  const recs = result?.results?.length
    ? result.results
    : result?.primary
      ? [result.primary, result.attach].filter((item): item is Product => item != null)
      : [];
  const policyCopy = policies ? buildPolicyCopy(policies) : [];

  return (
    <aside className="rf-peffle-desk-rail" data-testid="transaction-rail">
      <div className="rf-peffle-rail-tabs" role="tablist" aria-label="Context">
        {(
          [
            ["chat", "Chat"],
            ["cart", `Cart${cart.itemCount ? ` (${cart.itemCount})` : ""}`],
            ["policy", "Policy"],
            ["trace", "Trace"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            data-active={tab === id ? "true" : "false"}
            onClick={() => onTabChange(id)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="rf-peffle-rail-body">
        {tab === "chat" ? (
          <div className="rf-peffle-chat-thread" data-testid="recommendation">
            {result ? (
              <>
                <div className="rf-peffle-bubble" data-from="user">
                  {intent}
                </div>
                <div className="rf-peffle-bubble" data-from="agent">
                  <div className="rf-peffle-agent-head">
                    <ShieldCheck className="size-3.5 text-success" aria-hidden />
                    <span className="font-medium text-ink">Peffle</span>
                  </div>
                  <p>
                    {result.explanations[0]?.reason ??
                      (result.status === "empty"
                        ? "No catalog match for that request."
                        : "Here are the best options from the live catalog, checked against merchant policy.")}
                  </p>
                  <MiniRecs products={recs} />
                </div>
                <details className="rf-peffle-disclosure">
                  <summary>
                    Why these?
                    <CaretRight className="size-3.5" />
                  </summary>
                  <p className="pb-3 text-[0.8125rem] text-ink-soft">
                    {result.explanations.map((item) => item.reason).join(" ")}
                  </p>
                </details>
                <details className="rf-peffle-disclosure">
                  <summary>
                    Compare key differences
                    <CaretRight className="size-3.5" />
                  </summary>
                  <ul className="space-y-1 pb-3 text-[0.8125rem] text-ink-soft">
                    {recs.map((product) => (
                      <li key={product.sku}>
                        {shortName(product.name)} · <Money value={product.price} /> · {product.blurb}
                      </li>
                    ))}
                  </ul>
                </details>
                <details className="rf-peffle-disclosure">
                  <summary>
                    Check availability
                    <CaretRight className="size-3.5" />
                  </summary>
                  <ul className="space-y-1 pb-3 text-[0.8125rem] text-ink-soft">
                    {recs.map((product) => (
                      <li key={product.sku}>
                        {shortName(product.name)} · {product.inventory} in stock
                      </li>
                    ))}
                  </ul>
                </details>
                <details className="rf-peffle-disclosure">
                  <summary>
                    View policy impact
                    <CaretRight className="size-3.5" />
                  </summary>
                  <ul className="space-y-1 pb-3 text-[0.8125rem] text-ink-soft">
                    {(result.policies.length ? result.policies : []).map((item) => (
                      <li key={item.id}>
                        {item.label}: {item.result === "blocked" ? "Blocked" : item.detail}
                      </li>
                    ))}
                  </ul>
                </details>
              </>
            ) : (
              <p className="text-[0.8125rem] leading-relaxed text-muted">
                Ask Peffle to search the catalog, compare options, or check an offer against merchant
                policy.
              </p>
            )}
            <AgentChatPanel sessionId={sessionId} onTurn={onChatTurn} />
          </div>
        ) : null}

        <div className={tab === "cart" ? "flex flex-1 flex-col" : undefined} hidden={tab === "policy" || tab === "trace"}>
          <TransactionCart
            cart={cart}
            loading={cartLoading}
            readOnly={phase === "captured"}
            onUpdateQuantity={onUpdateQuantity}
            onRemoveLine={onRemoveLine}
          />
          {cart.lines.length > 0 ? (
            <div className="mt-4 border-t border-line/60 pt-4">
              {result && result.discountPct > 0 ? (
                <p className="text-sm text-success">Discount −{result.discountPct}%</p>
              ) : null}
              <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted">Total</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight tabular" data-testid="checkout-total">
                <Money value={cart.subtotal} />
              </p>
            </div>
          ) : null}
        </div>

        {tab === "policy" ? (
          <ul className="space-y-3 text-sm">
            {policyCopy.map((item) => (
              <li key={item.id} className="border-b border-line/40 pb-3 last:border-0">
                <p className="font-medium">{item.title}</p>
                <p className="mt-1 text-ink-soft">{item.rule}</p>
                <p className="mt-1 text-xs text-muted">{item.why}</p>
              </li>
            ))}
            {(result?.policies.length ? result.policies : []).map((item) => (
              <li key={`verdict-${item.id}`} className="rf-kv-row border-b border-line/40">
                <span className="text-ink-soft">{item.label}</span>
                <span className={item.result === "blocked" ? "text-danger" : "text-success"}>
                  {item.result === "blocked" ? "Blocked" : item.detail}
                </span>
              </li>
            ))}
          </ul>
        ) : null}

        {tab === "trace" && !(demoModeAvailable && demoModeOn) ? (
            <p className="text-[0.8125rem] text-muted">
              Trace is available in Demo Mode for staff. It reads live Peffle Guard events for this
              session.
            </p>
        ) : null}

        {demoModeAvailable && demoModeOn ? (
            <PeffleGuardTrace
              sessionId={sessionId}
              on={demoModeOn}
              refreshNonce={demoRefreshNonce}
              planner={lastPlanner}
            />
        ) : null}

        <div className="rf-desk-transact-actions mt-auto pt-4">
          {phase === "captured" && capturedPayment ? (
            <CompletedTransaction payment={capturedPayment} onStartNewSale={onStartNewSale} />
          ) : phase === "failed" && peffleBlock ? (
            <PeffleBlockedPanel block={peffleBlock} onDismiss={onDismissBlock} />
          ) : phase === "failed" ? (
            <PaymentNotCompleted message={error ?? "Payment not completed."} onTryAgain={onTryAgain} />
          ) : (
            <>
              <button
                type="button"
                data-testid="authorize"
                disabled={result?.status !== "ready" || cart.itemCount === 0 || busy || transactionLocked}
                onClick={onAuthorize}
                className="rf-btn rf-motion-colors flex min-h-11 w-full items-center justify-center rounded-[8px] bg-accent text-sm font-medium text-white hover:bg-accent-hover enabled:active:scale-[0.98] disabled:opacity-50"
              >
                {phase === "processing" ? (
                  "Guarding with Peffle…"
                ) : result?.status === "ready" && cart.itemCount > 0 ? (
                  <>
                    Authorize <Money value={cart.subtotal} />
                  </>
                ) : (
                  "Authorize"
                )}
              </button>
              <button
                type="button"
                data-testid="simulate-decline"
                disabled={result?.status !== "ready" || cart.itemCount === 0 || busy || transactionLocked}
                onClick={onSimulateDecline}
                className="mt-2 flex min-h-11 w-full items-center justify-center rounded-[8px] border border-line text-sm text-ink-soft hover:text-ink disabled:opacity-50"
              >
                Simulate decline
              </button>
            </>
          )}
        </div>
      </div>
      {children}
    </aside>
  );
}
