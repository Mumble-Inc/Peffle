"use client";

import { ShieldWarning } from "@phosphor-icons/react";
import { Money } from "@/components/money";
import { Button } from "@/components/ui/design-system";
import type { PeffleCheckoutBlock } from "@/lib/peffle/types";

function titleForBlock(block: PeffleCheckoutBlock) {
  if (block.code === "PEFFLE_AGENT_KILLED") return "Agent disabled";
  if (block.code === "PEFFLE_BUDGET_EXCEEDED") return "Peffle blocked this action";
  return "Peffle blocked this action";
}

function explanation(block: PeffleCheckoutBlock) {
  const amount = <Money value={block.amountPaise / 100} />;
  if (block.code === "PEFFLE_AGENT_KILLED") {
    return (
      <>
        Kill switch stopped a {amount} checkout. Razorpay order was not created.
      </>
    );
  }
  if (block.code === "PEFFLE_BUDGET_EXCEEDED" && block.limitPaise != null) {
    return (
      <>
        Spend cap stopped a {amount} checkout. Cap: <Money value={block.limitPaise / 100} />.
        Razorpay order was not created.
      </>
    );
  }
  return <>Execution policy stopped a {amount} checkout. Razorpay order was not created.</>;
}

export function PeffleBlockedPanel({
  block,
  onDismiss,
}: {
  block: PeffleCheckoutBlock;
  onDismiss: () => void;
}) {
  return (
    <div
      className="rf-desk-transact-incomplete mt-auto space-y-3 border-t border-line/60 pt-4"
      data-testid="peffle-blocked"
    >
      <div className="rf-desk-peffle-stop rounded-[12px] border p-4">
        <p className="rf-desk-peffle-stop-title flex items-center gap-2 text-sm font-medium">
          <ShieldWarning className="size-4" aria-hidden />
          {titleForBlock(block)}
        </p>
        <p className="mt-2 text-sm text-ink-soft" role="status">
          {explanation(block)}
        </p>
      </div>
      <Button type="button" variant="secondary" className="w-full" onClick={onDismiss}>
        Back to basket
      </Button>
    </div>
  );
}
