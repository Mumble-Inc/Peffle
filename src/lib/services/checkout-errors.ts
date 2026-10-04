import type { PeffleCheckoutBlock } from "@/lib/peffle/types";

export class CheckoutError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
    readonly code?: string,
    readonly peffle?: PeffleCheckoutBlock,
  ) {
    super(message);
    this.name = "CheckoutError";
  }
}
