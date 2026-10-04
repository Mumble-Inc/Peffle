import { assertPeffleGuardEnv } from "@/lib/peffle/runtime";

export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  assertPeffleGuardEnv();
  console.info("Peffle mode: local/process-scoped");
}
