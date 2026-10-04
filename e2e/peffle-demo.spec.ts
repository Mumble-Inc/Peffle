import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { authenticateStaff, ensureVerifiedBuyerForCheckout, HALO_FLIGHT_INTENT, prepareE2EBaseline, runDeskAgentWithIntent } from "./helpers/baseline";

test.describe.configure({ mode: "serial" });
test.use({
  video: { mode: "on", size: { width: 1440, height: 900 } },
});

test.describe("Peffle agent demo path", () => {
  test.beforeEach(async ({ page }) => {
    await prepareE2EBaseline(page);
  });

  test("discount, budget, kill, revive, refund approval", async ({ page, playwright, baseURL }) => {
    const staff = await playwright.request.newContext({ baseURL });
    await authenticateStaff(staff);
    const cap = await staff.post("/api/admin/peffle/discount-cap", {
      data: { capPaise: 50_000 },
    });
    expect(cap.ok()).toBeTruthy();

    await runDeskAgentWithIntent(page, HALO_FLIGHT_INTENT);
    await ensureVerifiedBuyerForCheckout(page);

    const ctx = await page.request.get("/api/desk/context");
    const sessionId = ((await ctx.json()) as { auth?: { sessionId?: string } }).auth?.sessionId;
    expect(sessionId).toBeTruthy();

    async function chat(message: string) {
      const response = await page.request.post("/api/agent/chat", {
        data: { sessionId, message },
      });
      expect(response.ok()).toBeTruthy();
      return response.json() as Promise<{
        reply: string;
        tools: Array<{ ok: boolean; reasonCode: string }>;
      }>;
    }

    const first = await chat("give me 200 rupees off");
    expect(first.tools[0]?.ok, JSON.stringify(first)).toBe(true);

    const second = await chat("give me 400 rupees off");
    expect(second.tools[0]?.ok).toBe(true);

    const exhausted = await chat("give me 800 rupees off");
    expect(exhausted.tools[0]?.ok).toBe(false);
    expect(exhausted.tools[0]?.reasonCode).toBe("BUDGET_EXCEEDED");

    const kill = await staff.post("/api/admin/peffle/kill", {
      data: { action: "kill", agentId: `desk:${sessionId}` },
    });
    expect(kill.ok()).toBeTruthy();

    const killed = await chat("give me 450 rupees off");
    expect(killed.tools[0]?.reasonCode).toBe("AGENT_KILLED");

    const revive = await staff.post("/api/admin/peffle/kill", {
      data: { action: "revive", agentId: `desk:${sessionId}` },
    });
    expect(revive.ok()).toBeTruthy();

    const refund = await chat("refund 10 rupees");
    expect(["APPROVAL_REQUIRED", "ORDER_NOT_CAPTURED", "ORDER_NOT_FOUND"]).toContain(
      refund.tools[0]?.reasonCode ?? "NO_TOOL",
    );

    if (refund.tools[0]?.reasonCode === "APPROVAL_REQUIRED") {
      const state = await staff.get("/api/admin/peffle");
      const payload = (await state.json()) as { pendingApprovals: Array<{ eventId: string }> };
      const eventId = payload.pendingApprovals[0]?.eventId;
      expect(eventId).toBeTruthy();
      const approved = await staff.post("/api/admin/peffle/approvals", {
        data: { eventId, decision: "approve" },
      });
      expect(approved.ok()).toBeTruthy();
      const body = (await approved.json()) as { ok: boolean };
      expect(body.ok).toBe(true);
    }

    await staff.dispose();
    const video = page.video();
    await page.close();
    if (video) {
      const src = await video.path();
      fs.mkdirSync(path.join(process.cwd(), "docs"), { recursive: true });
      fs.copyFileSync(src, path.join(process.cwd(), "docs/demo.webm"));
    }
  });
});
