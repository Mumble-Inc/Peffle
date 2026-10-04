import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/errors";
import { requireStaffSession } from "@/lib/auth/request";
import { isDemoModeEnabled, loadDemoTrace } from "@/lib/peffle/demo-trace";

export async function GET(request: Request) {
  try {
    if (!isDemoModeEnabled()) {
      return NextResponse.json({ error: "Demo mode is disabled" }, { status: 403 });
    }
    const staff = await requireStaffSession(request);
    const payload = await loadDemoTrace(staff.sessionId);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("GET /api/admin/peffle/trace failed:", error);
    return NextResponse.json({ error: "Could not load demo trace" }, { status: 500 });
  }
}
