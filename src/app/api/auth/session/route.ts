import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/errors";
import { getSessionAuthState } from "@/lib/auth/request";
import { resolveDemoMerchant } from "@/lib/services/merchant";

export async function GET(request: Request) {
  try {
    const merchant = await resolveDemoMerchant();
    const { sessionId, account } = await getSessionAuthState(request);

    const authenticated = Boolean(account);
    const capability = authenticated && account ? account.capability : "anonymous";
    const emailVerified = authenticated && account ? account.emailVerified : false;

    return NextResponse.json({
      merchantId: merchant.id,
      merchantName: merchant.name,
      sessionId,
      account: account
        ? {
            id: account.id,
            email: account.email,
            emailVerified: account.emailVerified,
            emailVerifiedAt: account.emailVerifiedAt,
            capability: account.capability,
          }
        : null,
      email: authenticated && account ? account.email : null,
      emailVerified,
      emailVerifiedAt: authenticated && account ? account.emailVerifiedAt : null,
      capability,
      authenticated,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("GET /api/auth/session failed:", error);
    return NextResponse.json({ error: "Failed to load session" }, { status: 500 });
  }
}
