import { Suspense } from "react";

export const dynamic = "force-dynamic";
import { AuthRouteFallback } from "@/components/auth/auth-route-fallback";
import { getLandingShowcase } from "@/lib/services/desk-context";
import ResetPasswordClient from "./reset-password-client";

export default async function ResetPasswordPage() {
  const showcase = await getLandingShowcase();
  return (
    <Suspense fallback={<AuthRouteFallback merchantName={showcase.merchant.name} />}>
      <ResetPasswordClient merchantName={showcase.merchant.name} />
    </Suspense>
  );
}
