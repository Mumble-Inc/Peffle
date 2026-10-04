import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/errors";
import { requireStaffSession } from "@/lib/auth/request";
import { setRuntimeDiscountCapPaise } from "@/lib/peffle/client";
import { getPeffleControlState } from "@/lib/peffle/control";
import { CheckoutError } from "@/lib/services/checkout-errors";

export async function POST(request: Request) {
  try {
    await requireStaffSession(request);
    const body = (await request.json()) as { capPaise?: unknown };
    if (typeof body.capPaise !== "number" || !Number.isInteger(body.capPaise)) {
      return NextResponse.json({ error: "capPaise must be an integer (paise)" }, { status: 400 });
    }
    setRuntimeDiscountCapPaise(body.capPaise);
    return NextResponse.json(getPeffleControlState());
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    if (error instanceof CheckoutError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    return NextResponse.json({ error: "Could not update discount cap" }, { status: 500 });
  }
}
