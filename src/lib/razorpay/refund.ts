import { getRazorpayClient, isRazorpayConfigured } from "@/lib/razorpay/client";

export type RazorpayRefundResult = {
  id: string;
  stubbed: boolean;
};

export function razorpayRefundsStubbed() {
  return process.env.RAZORFLOW_STUB_RAZORPAY_REFUND === "1";
}

export async function createRazorpayRefund(
  razorpayPaymentId: string,
  amountPaise: number,
): Promise<RazorpayRefundResult | null> {
  if (!razorpayPaymentId) return null;
  if (razorpayRefundsStubbed()) {
    return { id: `stub_rfnd_${razorpayPaymentId.slice(0, 12)}`, stubbed: true };
  }
  if (!isRazorpayConfigured()) return null;
  const refund = await getRazorpayClient().payments.refund(razorpayPaymentId, { amount: amountPaise });
  return { id: typeof refund.id === "string" ? refund.id : String(refund.id), stubbed: false };
}
