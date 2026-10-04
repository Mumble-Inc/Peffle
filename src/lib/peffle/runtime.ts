export function assertPeffleGuardEnv() {
  if (process.env.PEFFLE_GUARD === "0" && process.env.NODE_ENV !== "test") {
    throw new Error("PEFFLE_GUARD=0 is only allowed when NODE_ENV=test");
  }
}

export function peffleGuardEnabled() {
  assertPeffleGuardEnv();
  return process.env.PEFFLE_GUARD !== "0";
}

export function sessionAgentId(sessionId: string) {
  return `desk:${sessionId}`;
}
