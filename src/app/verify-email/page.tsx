import { Suspense } from "react";

export const dynamic = "force-dynamic";
import { AuthRouteFallback } from "@/components/auth/auth-route-fallback";
import { getLandingShowcase } from "@/lib/services/desk-context";
import VerifyEmailClient from "./verify-email-client";

export default async function VerifyEmailPage() {
  const showcase = await getLandingShowcase();
  return (
    <Suspense fallback={<AuthRouteFallback merchantName={showcase.merchant.name} />}>
      <VerifyEmailClient merchantName={showcase.merchant.name} />
    </Suspense>
  );
}
