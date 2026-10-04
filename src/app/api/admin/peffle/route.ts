import { NextResponse } from "next/server";
import { AuthError } from "@/lib/auth/errors";
import { requireStaffSession } from "@/lib/auth/request";
import { getPeffleControlState } from "@/lib/peffle/control";

export async function GET(request: Request) {
  try {
    await requireStaffSession(request);
    return NextResponse.json(getPeffleControlState());
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("GET /api/admin/peffle failed:", error);
    return NextResponse.json({ error: "Could not load execution control" }, { status: 500 });
  }
}
