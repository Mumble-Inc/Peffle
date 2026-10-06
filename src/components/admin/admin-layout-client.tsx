"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { isStaffOrAdmin } from "@/lib/auth/capability";
import type { BuyerCapability } from "@/lib/auth/capability";

type AdminLayoutClientProps = {
  children: React.ReactNode;
};

export function AdminLayoutClient({ children }: AdminLayoutClientProps) {
  const router = useRouter();
  const [merchantName, setMerchantName] = useState("Merchant");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    async function bootstrap() {
      try {
        const authRes = await fetch("/api/auth/session", { credentials: "include" });
        if (!authRes.ok) {
          router.replace("/desk");
          return;
        }
        const authPayload = (await authRes.json()) as {
          merchantName?: string;
          capability?: BuyerCapability;
        };
        if (!authPayload.capability || !isStaffOrAdmin(authPayload.capability)) {
          router.replace("/desk");
          return;
        }
        if (authPayload.merchantName) {
          setMerchantName(authPayload.merchantName);
        }
        setReady(true);
      } catch {
        router.replace("/desk");
      }
    }

    void bootstrap();
  }, [router]);

  if (!ready) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-4">
        <p className="text-sm text-muted">Loading Peffle control plane…</p>
      </div>
    );
  }

  return <AdminShell merchantName={merchantName}>{children}</AdminShell>;
}
