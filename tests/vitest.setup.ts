import { setIntentProviderForTests } from "@/lib/agent/intent";
import { getPeffle, PEFFLE_CHECKOUT_AGENT_ID } from "@/lib/peffle/client";
import { afterEach } from "vitest";
import os from "node:os";
import path from "node:path";

process.env.RAZORFLOW_SESSION_SECRET ??= "razorflow-test-session-secret";
process.env.INITIAL_ADMIN_EMAIL ??= "admin@example.com";
process.env.PEFFLE_STORAGE ??= path.join(os.tmpdir(), `razorflow-peffle-${process.pid}.sqlite`);
process.env.PEFFLE_POLICY ??= path.join(process.cwd(), "peffle.policy.json");
process.env.PEFFLE_CHECKOUT_CAP_PAISE ??= "100000000000";

// Keep unit/integration tests deterministic unless a test opts into Gemini explicitly.
delete process.env.GEMINI_API_KEY;
setIntentProviderForTests(null);

afterEach(() => {
  try {
    getPeffle().revive(PEFFLE_CHECKOUT_AGENT_ID);
  } catch {
    // Singleton may not exist yet, or a test closed it.
  }
});

