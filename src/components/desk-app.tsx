"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { CaretDown, GearSix, Headphones, MagnifyingGlass, Warning, XCircle } from "@phosphor-icons/react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { AccountAuthModal, type AccountAuthMode } from "@/components/auth/account-auth-modal";
import { AccountTopBarActions } from "@/components/auth/account-top-bar-actions";
import { useAuthSession } from "@/components/auth/use-auth-session";
import { AddToCartButton } from "@/components/cart/add-to-cart-button";
import {
  isSequentialBrowseMode,
  ProductRecommendationBrowser,
} from "@/components/desk/product-recommendation-browser";
import { AgentProcessingView } from "@/components/desk/agent-processing-view";
import { readDemoModeOn, useDemoTrace } from "@/components/desk/peffle-guard-trace";
import { useAgentProcessingPresentation } from "@/components/desk/use-agent-processing";
import type { Phase } from "@/components/desk/desk-types";
import { DeskCatalogGrid } from "@/components/desk/workspace/desk-catalog-grid";
import { DeskContextRail, type DeskRailTab } from "@/components/desk/workspace/desk-context-rail";
import { DeskHero, pickHeroProduct } from "@/components/desk/workspace/desk-hero";
import { DeskModeCard, DeskSidebar } from "@/components/desk/workspace/desk-sidebar";
import { PeffleGuardMeter } from "@/components/desk/workspace/peffle-guard-meter";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/design-system";
import {
  type AgentResult,
  type DiscoverySummary,
  type MerchantPolicies,
  type Product,
  type PublicProduct,
  type StructuredIntent,
} from "@/lib/agent";
import type { DemoPrompt } from "@/lib/agent/demo-prompts";
import { useCart } from "@/hooks/use-cart";
import { openRazorpayCheckout } from "@/lib/razorpay/checkout";
import type { CapturedPaymentView } from "@/lib/desk/payment-display";
import type { PeffleCheckoutBlock } from "@/lib/peffle/types";

type AgentApiResponse = {
  sessionId: string;
  decisionId: string;
  status: AgentResult["status"];
  intent: StructuredIntent;
  primary: Product | null;
  attach: Product | null;
  results: Product[];
  discoverySummary: DiscoverySummary | null;
  discountPct: number;
  subtotal: number;
  marginPct: number;
  aovLift: number;
  explanations: AgentResult["explanations"];
  policies: AgentResult["policies"];
  blockedReason: string | null;
};

type RecoveryEvaluation = {
  status: "retryable" | "re_evaluate" | "blocked";
  reason: string;
  changes: string[];
  policyBlocked: boolean;
};

const phaseCopy: Record<Phase, string> = {
  idle: "Waiting for intent",
  reading: "Understanding intent…",
  matching: "Ranking catalog…",
  checking: "Checking merchant policy…",
  ready: "Awaiting authorization",
  blocked: "Offer blocked",
  empty: "No catalog match",
  processing: "Collecting payment…",
  captured: "Payment captured",
  failed: "Blocked",
};

export function DeskApp() {
  const reduce = useReducedMotion();
  const [intent, setIntent] = useState("");
  const [merchantName, setMerchantName] = useState("Merchant");
  const [demoPrompts, setDemoPrompts] = useState<DemoPrompt[]>([]);
  const [contextReady, setContextReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [decisionId, setDecisionId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<RecoveryEvaluation | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalMode, setAccountModalMode] = useState<AccountAuthMode>("login");
  const [resumeAuthorizeAfterAuth, setResumeAuthorizeAfterAuth] = useState(false);
  const [pendingForceFail, setPendingForceFail] = useState(false);
  const [capturedPayment, setCapturedPayment] = useState<CapturedPaymentView | null>(null);
  const [failureOverlayOpen, setFailureOverlayOpen] = useState(false);
  const [peffleBlock, setPeffleBlock] = useState<PeffleCheckoutBlock | null>(null);
  const [demoModeAvailable, setDemoModeAvailable] = useState(false);
  const [demoModeOn, setDemoModeOn] = useState(false);
  const [demoRefreshNonce, setDemoRefreshNonce] = useState(0);
  const [lastPlanner, setLastPlanner] = useState<"gemini" | "deterministic" | null>(null);
  const [catalog, setCatalog] = useState<PublicProduct[]>([]);
  const [policies, setPolicies] = useState<MerchantPolicies | null>(null);
  const [railTab, setRailTab] = useState<DeskRailTab>("chat");
  const intentRef = useRef<HTMLInputElement>(null);
  const auth = useAuthSession();

  const { cart, loading: cartLoading, refresh: refreshCart, updateQuantity, removeLine } = useCart(sessionId);
  const demoTrace = useDemoTrace(demoModeAvailable && demoModeOn, sessionId, demoRefreshNonce);

  const refreshAuthState = useCallback(() => {
    window.dispatchEvent(new Event("razorflow:auth-changed"));
  }, []);

  const handleAgentReveal = useCallback((agentResult: AgentResult) => {
    setResult(agentResult);
    setPhase(
      agentResult.status === "blocked"
        ? "blocked"
        : agentResult.status === "empty"
          ? "empty"
          : "ready",
    );
  }, []);

  const agentProcessing = useAgentProcessingPresentation({
    reducedMotion: reduce,
    onReveal: handleAgentReveal,
  });

  const agentBusy = agentProcessing.isPresenting;
  const busy = agentBusy || phase === "processing";

  useEffect(() => {
    async function loadContext() {
      try {
        const response = await fetch("/api/desk/context");
        if (!response.ok) return;
        const payload = (await response.json()) as {
          merchant: { name: string };
          demoPrompts: DemoPrompt[];
          intentPlaceholder: string;
          catalog?: PublicProduct[];
          policies?: MerchantPolicies;
          demoModeAvailable?: boolean;
          activeSession?: {
            sessionId: string;
            decisionId: string;
            orderId: string;
            intentQuery: string;
            agent: AgentApiResponse;
            capturedPayment: CapturedPaymentView;
          } | null;
        };
        setMerchantName(payload.merchant.name);
        setDemoPrompts(payload.demoPrompts);
        setCatalog(payload.catalog ?? []);
        setPolicies(payload.policies ?? null);
        setDemoModeAvailable(payload.demoModeAvailable === true);
        setDemoModeOn(payload.demoModeAvailable === true && readDemoModeOn());
        if (payload.activeSession) {
          const active = payload.activeSession;
          setSessionId(active.sessionId);
          setDecisionId(active.decisionId);
          setOrderId(active.orderId);
          setIntent(active.intentQuery);
          setResult(mapApiResponseToAgentResult(active.agent));
          setCapturedPayment(active.capturedPayment);
          setPhase("captured");
        } else if (payload.demoPrompts[0]?.text) {
          setIntent(payload.demoPrompts[0].text);
        }
      } finally {
        setContextReady(true);
      }
    }
    void loadContext();
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        intentRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setCapturedPayment(null);
    setFailureOverlayOpen(false);
    setSessionId(null);
    setDecisionId(null);
    setOrderId(null);
    setRecovery(null);
    setRailTab("chat");
    agentProcessing.start();
    setPhase("reading");
    try {
      const sessionRes = await fetch("/api/sessions", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawRequest: intent }),
      });
      if (!sessionRes.ok) {
        const payload = (await sessionRes.json()) as { error?: string };
        throw new Error(payload.error ?? "Session could not be created.");
      }
      const { sessionId: createdSessionId } = (await sessionRes.json()) as { sessionId: string };

      const agentRes = await fetch("/api/agent/run", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: createdSessionId }),
      });
      if (!agentRes.ok) {
        const payload = (await agentRes.json()) as { error?: string };
        throw new Error(payload.error ?? "Agent could not run.");
      }
      const payload = (await agentRes.json()) as AgentApiResponse;
      setSessionId(createdSessionId);
      setDecisionId(payload.decisionId);
      setOrderId(null);
      agentProcessing.complete(mapApiResponseToAgentResult(payload));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Agent run failed.");
      agentProcessing.cancel();
      setPhase("idle");
    }
  }

  async function startCheckout() {
    if (!sessionId) {
      throw new Error("Session is missing. Run the agent again.");
    }
    if (cart.itemCount === 0) {
      throw new Error("Add items to your cart before checkout.");
    }

    const response = await fetch("/api/checkout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, source: "cart" }),
    });

    const payload = (await response.json()) as {
      error?: string;
      code?: string;
      peffle?: PeffleCheckoutBlock;
      keyId?: string;
      orderId?: string;
      decisionId?: string;
      razorpayOrderId?: string;
      amountPaise?: number;
      currency?: string;
    };

    if (!response.ok) {
      setDemoRefreshNonce((n) => n + 1);
      if (response.status === 403 && payload.code === "VERIFICATION_REQUIRED") {
        const err = new Error(payload.error ?? "Email verification required");
        (err as Error & { code?: string }).code = "VERIFICATION_REQUIRED";
        throw err;
      }
      const err = new Error(payload.error ?? "Checkout could not start.") as Error & {
        code?: string;
        peffle?: PeffleCheckoutBlock;
      };
      err.code = payload.code;
      err.peffle = payload.peffle;
      throw err;
    }

    if (!payload.keyId || !payload.orderId || !payload.razorpayOrderId || !payload.amountPaise) {
      throw new Error("Checkout response was incomplete.");
    }

    setOrderId(payload.orderId);
    setDemoRefreshNonce((n) => n + 1);
    if (payload.decisionId) {
      setDecisionId(payload.decisionId);
    }
    return payload as {
      keyId: string;
      orderId: string;
      decisionId?: string;
      razorpayOrderId: string;
      amountPaise: number;
      currency: string;
    };
  }

  async function loadRecoveryEvaluation(activeDecisionId = decisionId): Promise<RecoveryEvaluation | null> {
    if (!sessionId || !activeDecisionId) return null;
    try {
      const response = await fetch("/api/recovery/evaluate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, decisionId: activeDecisionId }),
      });
      if (!response.ok) return null;
      const payload = (await response.json()) as { evaluation: RecoveryEvaluation };
      return payload.evaluation;
    } catch {
      return null;
    }
  }

  async function promptForCheckoutAuth(forceFail: boolean) {
    setPhase("ready");
    setResumeAuthorizeAfterAuth(true);
    setPendingForceFail(forceFail);

    try {
      const authRes = await fetch("/api/auth/session", { credentials: "include" });
      if (authRes.ok) {
        const auth = (await authRes.json()) as {
          authenticated?: boolean;
          emailVerified?: boolean;
          account?: { emailVerified?: boolean };
        };
        const verified = auth.emailVerified || auth.account?.emailVerified;
        if (auth.authenticated && verified) {
          await authorize(forceFail, true);
          return;
        }
        if (auth.authenticated && !verified) {
          setAccountModalMode("verify-code");
          setAccountModalOpen(true);
          return;
        }
      }
    } catch {
      // Fall through to login prompt.
    }

    setAccountModalMode("login");
    setAccountModalOpen(true);
  }

  async function authorize(forceFail = false, skipVerificationPrompt = false) {
    if (!result || result.status !== "ready" || cart.itemCount === 0 || phase === "captured") return;
    setPhase("processing");
    setError(null);
    setPeffleBlock(null);

    try {
      const checkout = await startCheckout();

      if (forceFail) {
        const failRes = await fetch("/api/payments/fail", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: checkout.orderId,
            reason: "Razorpay declined the payment. The basket is unchanged. Retry or pick another method.",
          }),
        });
        if (!failRes.ok) {
          const payload = (await failRes.json()) as { error?: string };
          throw new Error(payload.error ?? "Could not record payment failure.");
        }
        setPhase("failed");
        setError("Razorpay declined the payment. The basket is unchanged. Retry or pick another method.");
        setFailureOverlayOpen(true);
        const evaluation = await loadRecoveryEvaluation(checkout.decisionId);
        setRecovery(evaluation);
        return;
      }

      const razorpay = await openRazorpayCheckout({
        key: checkout.keyId,
        amount: checkout.amountPaise,
        currency: checkout.currency,
        name: merchantName,
        description: cart.lines.map((line) => line.name).join(", ") || "Peffle checkout",
        order_id: checkout.razorpayOrderId,
        theme: { color: "#0f766e" },
        handler: async (paymentResponse) => {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              credentials: "include",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: checkout.orderId,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_signature: paymentResponse.razorpay_signature,
              }),
            });
            const payload = (await verifyRes.json()) as {
              error?: string;
              capturedPayment?: CapturedPaymentView;
            };
            if (!verifyRes.ok) {
              throw new Error(payload.error ?? "Payment verification failed.");
            }
            if (payload.capturedPayment) {
              setCapturedPayment(payload.capturedPayment);
            }
            setPhase("captured");
            setRecovery(null);
            setError(null);
          } catch (cause) {
            setPhase("failed");
            setError(cause instanceof Error ? cause.message : "Payment verification failed.");
            setFailureOverlayOpen(true);
            const evaluation = await loadRecoveryEvaluation(checkout.decisionId);
            setRecovery(evaluation);
          }
        },
        modal: {
          ondismiss: () => {
            void (async () => {
              try {
                await fetch("/api/payments/abandon", {
                  method: "POST",
                  credentials: "include",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ orderId: checkout.orderId }),
                });
              } finally {
                setPhase("failed");
                setRecovery(null);
                setFailureOverlayOpen(false);
                setError("Checkout closed before payment completed.");
              }
            })();
          },
        },
      });

      razorpay.on("payment.failed", (response) => {
        void (async () => {
          const reason =
            response.error?.description ??
            "Razorpay declined the payment. The basket is unchanged. Retry or pick another method.";
          const failRes = await fetch("/api/payments/fail", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId: checkout.orderId, reason }),
          });
          if (!failRes.ok) {
            const payload = (await failRes.json()) as { error?: string };
            setError(payload.error ?? "Could not record payment failure.");
          } else {
            setError(reason);
          }
          setPhase("failed");
          setFailureOverlayOpen(true);
          const evaluation = await loadRecoveryEvaluation(checkout.decisionId);
          setRecovery(evaluation);
        })();
      });
    } catch (cause) {
      if (
        !skipVerificationPrompt &&
        cause instanceof Error &&
        (cause as Error & { code?: string }).code === "VERIFICATION_REQUIRED"
      ) {
        await promptForCheckoutAuth(forceFail);
        return;
      }
      const peffle = (cause as Error & { peffle?: PeffleCheckoutBlock }).peffle;
      if (peffle?.blocked) {
        setPeffleBlock(peffle);
        setPhase("failed");
        setFailureOverlayOpen(true);
        setError(cause instanceof Error ? cause.message : "Checkout blocked.");
        setRecovery(null);
        return;
      }
      setPhase("failed");
      setFailureOverlayOpen(true);
      setError(cause instanceof Error ? cause.message : "Payment failed. Retry the capture.");
      const evaluation = await loadRecoveryEvaluation();
      setRecovery(evaluation);
    }
  }

  async function continueAfterAccountAuth() {
    const shouldResume = resumeAuthorizeAfterAuth;
    const forceFail = pendingForceFail;
    setResumeAuthorizeAfterAuth(false);
    setPendingForceFail(false);
    refreshAuthState();
    if (shouldResume) {
      await authorize(forceFail);
    }
  }

  async function startNewSale() {
    await fetch("/api/desk/reset", {
      method: "POST",
      credentials: "include",
    });
    setSessionId(null);
    setDecisionId(null);
    setOrderId(null);
    setResult(null);
    setCapturedPayment(null);
    setFailureOverlayOpen(false);
    setRecovery(null);
    setError(null);
    setPhase("idle");
    agentProcessing.cancel();
    setIntent(demoPrompts[0]?.text ?? "");
  }

  function tryPaymentAgain() {
    setRecovery(null);
    setError(null);
    setFailureOverlayOpen(false);
    setPhase("ready");
  }

  const transactionLocked = phase === "captured" || phase === "processing";
  const cartSkus = new Set(cart.lines.map((line) => line.sku));
  const hero = pickHeroProduct(catalog);
  const sequential = result != null && isSequentialBrowseMode(result);
  const highlightedSku = sequential ? null : (result?.primary?.sku ?? hero?.sku ?? null);

  function handleCartChange() {
    void refreshCart();
  }

  return (
    <div className="rf-peffle-desk">
      <DeskSidebar
        merchantName={merchantName}
        email={auth.email}
        capability={auth.capability}
      />
      <div className="rf-peffle-desk-frame">
        <header className="rf-peffle-desk-topbar">
          <form id="desk-intent-form" className="rf-peffle-command" onSubmit={onSubmit}>
            <MagnifyingGlass className="size-4 shrink-0 text-muted" aria-hidden />
            <label htmlFor="intent" className="sr-only">
              Search products, compare, or ask Peffle
            </label>
            <input
              ref={intentRef}
              id="intent"
              name="intent"
              data-testid="intent-input"
              value={intent}
              onChange={(event) => setIntent(event.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder="Search products, compare, or ask Peffle..."
              disabled={!contextReady}
            />
            <kbd>⌘ K</kbd>
            <button
              type="submit"
              data-testid="run-agent"
              disabled={busy || intent.trim().length < 4}
              className="rf-peffle-run"
            >
              {agentBusy ? "Running agent…" : "Run agent"}
            </button>
          </form>
          <div className="rf-peffle-top-actions">
            <button type="button" className="rf-peffle-merchant-chip" translate="no">
              <Headphones className="size-4 shrink-0 text-muted" aria-hidden />
              <span className="rf-peffle-merchant-name">{merchantName}</span>
              <CaretDown className="size-3.5 shrink-0 text-muted" aria-hidden />
            </button>
            <Link href="/admin/policies" className="rf-peffle-icon-btn" aria-label="Settings">
              <GearSix className="size-4" />
            </Link>
            <AccountTopBarActions sessionId={sessionId} />
            <DeskModeCard
              merchantName={merchantName}
              demoAvailable={demoModeAvailable}
              demoOn={demoModeOn}
              onDemoChange={setDemoModeOn}
            />
          </div>
        </header>

        <div className="rf-peffle-desk-body">
          <div className="rf-peffle-desk-canvas">
            <DeskHero
              heroImage={hero?.image ?? null}
              heroAlt={hero?.imageAlt ?? "Northline Audio catalog"}
              merchantName={merchantName}
              demoPrompts={demoPrompts}
              onChip={(text) => setIntent(text)}
            />

            <div aria-live="polite" className="sr-only">
              {agentBusy ? "Agent processing" : phaseCopy[phase]}
            </div>

            {agentBusy ? (
              <div className="mt-4 rounded-[12px] border border-line bg-surface p-4">
                <AgentProcessingView completedCount={agentProcessing.completedCount} />
              </div>
            ) : null}

            {error && phase !== "failed" ? (
              <p className="mt-4 text-sm text-danger" role="alert">
                {error}
              </p>
            ) : null}

            {result && (result.status === "empty" || phase === "empty") ? (
              <div className="rf-desk-empty-state mt-4" data-testid="discovery-empty">
                <div className="rf-desk-empty-state-icon">
                  <Warning className="size-5" aria-hidden />
                </div>
                <p className="text-base font-medium text-ink">No catalog match</p>
                <p className="max-w-[36ch] text-sm text-muted">
                  {result.explanations[0]?.reason ??
                    "No product fits this request. Widen the budget or adjust the category."}
                </p>
              </div>
            ) : null}

            {result && sequential ? (
              <div className="mt-4 rounded-[12px] border border-line bg-surface p-4">
                <ProductRecommendationBrowser
                  result={result}
                  sessionId={sessionId}
                  cartSkus={cartSkus}
                  onCartChange={handleCartChange}
                />
              </div>
            ) : null}

            {result?.attach && !sequential ? (
              <div
                className="mt-4 flex flex-col gap-3 rounded-[12px] border border-line bg-surface p-4 sm:flex-row sm:items-center"
                data-testid="suggested-accessory"
              >
                <Image
                  src={result.attach.image}
                  alt={result.attach.imageAlt}
                  width={56}
                  height={56}
                  className="size-14 rounded-[8px] bg-canvas-2 object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">Suggested accessory</p>
                  <p className="font-medium" translate="no">
                    {result.attach.name}
                  </p>
                  <p className="text-sm text-muted">
                    <Money value={result.attach.price} />
                  </p>
                </div>
                <AddToCartButton
                  sessionId={sessionId}
                  sku={result.attach.sku}
                  inCart={cartSkus.has(result.attach.sku)}
                  onAdded={handleCartChange}
                />
              </div>
            ) : null}

            <DeskCatalogGrid
              catalog={catalog}
              sessionId={sessionId}
              cartSkus={cartSkus}
              highlightedSku={highlightedSku}
              onCartChange={handleCartChange}
            />
          </div>

          <div className="rf-peffle-desk-context">
            <DeskContextRail
              tab={railTab}
              onTabChange={setRailTab}
              intent={intent}
              result={result}
              cart={cart}
              cartLoading={cartLoading}
              sessionId={sessionId}
              phase={phase}
              policies={policies}
              demoModeAvailable={demoModeAvailable}
              demoModeOn={demoModeOn}
              demoRefreshNonce={demoRefreshNonce}
              lastPlanner={lastPlanner}
              capturedPayment={capturedPayment}
              peffleBlock={peffleBlock}
              error={error}
              busy={busy}
              transactionLocked={transactionLocked}
              onUpdateQuantity={updateQuantity}
              onRemoveLine={removeLine}
              onAuthorize={() => authorize(false)}
              onSimulateDecline={() => authorize(true)}
              onStartNewSale={() => void startNewSale()}
              onTryAgain={tryPaymentAgain}
              onDismissBlock={() => {
                setFailureOverlayOpen(false);
                setPhase("ready");
                setPeffleBlock(null);
                setError(null);
              }}
              onChatTurn={(turn) => {
                setLastPlanner(turn.planner);
                setDemoRefreshNonce((n) => n + 1);
              }}
            />
            <PeffleGuardMeter
              policies={policies}
              result={result}
              cart={cart}
              trace={demoTrace}
              blocked={result?.status === "blocked" || Boolean(peffleBlock)}
              blockedReason={result?.blockedReason ?? error}
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {phase === "failed" && failureOverlayOpen && result ? (
          <PaymentOverlay
            phase={phase}
            checkoutTotal={cart.subtotal}
            result={result}
            error={error}
            peffleBlock={peffleBlock}
            recovery={recovery}
            onRetry={() => authorize(false)}
            onReviewBasket={() => {
              setRecovery(null);
              setFailureOverlayOpen(false);
              setPhase("ready");
              setError("Basket needs a fresh agent check before payment can continue.");
            }}
            onClose={() => {
              setRecovery(null);
              setFailureOverlayOpen(false);
            }}
          />
        ) : null}
      </AnimatePresence>
      <AccountAuthModal
        open={accountModalOpen}
        initialMode={accountModalMode}
        sessionId={sessionId}
        onClose={() => setAccountModalOpen(false)}
        onAuthenticated={() => void continueAfterAccountAuth()}
        onAuthStateChange={() => refreshAuthState()}
      />
    </div>
  );
}

function mapApiResponseToAgentResult(payload: AgentApiResponse): AgentResult {
  return {
    status: payload.status,
    intent: payload.intent,
    primary: payload.primary,
    attach: payload.attach,
    results: payload.results ?? (payload.primary ? [payload.primary] : []),
    discoverySummary: payload.discoverySummary ?? null,
    discountPct: payload.discountPct,
    subtotal: payload.subtotal,
    marginPct: payload.marginPct,
    aovLift: payload.aovLift,
    explanations: payload.explanations,
    policies: payload.policies,
    blockedReason: payload.blockedReason,
  };
}

function PaymentOverlay({
  checkoutTotal,
  error,
  peffleBlock,
  recovery,
  onRetry,
  onReviewBasket,
  onClose,
}: {
  phase: "failed";
  checkoutTotal: number;
  result: AgentResult;
  error: string | null;
  peffleBlock: PeffleCheckoutBlock | null;
  recovery: RecoveryEvaluation | null;
  onRetry: () => void;
  onReviewBasket: () => void;
  onClose: () => void;
}) {
  if (peffleBlock) {
    return (
      <motion.div
        className="rf-overlay"
        role="presentation"
        initial={false}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <div className="rf-overlay-backdrop" aria-hidden />
        <section
          role="dialog"
          aria-modal="true"
          className="rf-dialog"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 className="text-lg font-semibold tracking-tight" data-testid="peffle-blocked-dialog">
            Peffle stopped this action
          </h2>
          <p className="mt-3 text-3xl font-semibold tracking-tight tabular">
            <Money value={peffleBlock.amountPaise / 100} />
          </p>
          <p className="mt-3 text-sm text-ink-soft" role="status">
            {peffleBlock.code === "PEFFLE_BUDGET_EXCEEDED" && peffleBlock.limitPaise != null ? (
              <>
                Execution stopped at the spend cap of <Money value={peffleBlock.limitPaise / 100} />.
                Razorpay order was not created.
              </>
            ) : peffleBlock.code === "PEFFLE_AGENT_KILLED" ? (
              <>Kill switch is on. Razorpay order was not created.</>
            ) : (
              <>Execution policy stopped this checkout. Razorpay order was not created.</>
            )}
          </p>
          <div className="mt-5">
            <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
              Close
            </Button>
          </div>
        </section>
      </motion.div>
    );
  }

  const failureMessage =
    error ?? "Razorpay declined the payment. Your basket is unchanged.";

  const recoveryStatus = recovery?.status ?? "retryable";

  return (
    <motion.div
      className="rf-overlay"
      role="presentation"
      initial={false}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="rf-overlay-backdrop" aria-hidden />
      <section
        role="dialog"
        aria-modal="true"
        className="rf-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <XCircle className="size-6 shrink-0 text-danger" weight="fill" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h2
              className="text-lg font-semibold tracking-tight"
              data-testid="payment-failed"
            >
              Payment failed
            </h2>
            <p className="mt-3 text-3xl font-semibold tracking-tight tabular">
              <Money value={checkoutTotal} />
            </p>
            <p className="mt-3 text-sm text-ink-soft" role="alert">
              {failureMessage}
            </p>
            {recoveryStatus === "retryable" ? (
              <>
                <p className="mt-2 text-sm text-muted">Your basket is unchanged.</p>
                <div className="mt-5 flex flex-col gap-2">
                  <Button type="button" data-testid="retry-payment" onClick={onRetry} className="w-full">
                    Retry payment
                  </Button>
                  <Button type="button" variant="secondary" onClick={onClose} className="w-full">
                    Close
                  </Button>
                </div>
              </>
            ) : recoveryStatus === "re_evaluate" ? (
              <>
                <p className="mt-2 text-sm text-muted">
                  {recovery?.changes.length
                    ? recovery.changes.join(". ")
                    : "One item changed availability, so we need to re-check your basket before retrying."}
                </p>
                <div className="mt-5 flex flex-col gap-2">
                  <Button
                    type="button"
                    data-testid="review-basket"
                    onClick={onReviewBasket}
                    className="w-full"
                  >
                    Review basket
                  </Button>
                  <Button type="button" variant="secondary" onClick={onClose} className="w-full">
                    Close
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted">
                  {recovery?.reason ??
                    "This basket no longer satisfies the merchant pricing policy."}
                </p>
                <p className="mt-2 text-sm font-medium text-danger">Recovery unavailable</p>
                <div className="mt-5">
                  <Button type="button" variant="secondary" onClick={onClose} className="w-full">
                    Close
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </motion.div>
  );
}
