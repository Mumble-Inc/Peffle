import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AuthError } from "@/lib/auth/errors";
import { requireStaffSession } from "@/lib/auth/request";

export default async function AdminRouteLayout({ children }: { children: ReactNode }) {
  const hdrs = await headers();
  const request = new Request("http://internal/admin", {
    headers: { cookie: hdrs.get("cookie") ?? "" },
  });

  try {
    await requireStaffSession(request);
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/desk");
    }
    throw error;
  }

  return children;
}
