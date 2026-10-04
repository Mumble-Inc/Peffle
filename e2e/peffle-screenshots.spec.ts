import { createHmac, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import {
  authenticateStaff,
  authenticateStaffOnPage,
  ensureVerifiedBuyerForCheckout,
  HALO_FLIGHT_INTENT,
  prepareE2EBaseline,
  runDeskAgentWithIntent,
} from "./helpers/baseline";

test.use({ viewport: { width: 1440, height: 900 } });

const demoNumbers = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "docs/demo-numbers.json"), "utf8"),
) as { peffle: { discountBudgetPaise: number }; demoDiscounts: { passesPaise: number; commerceBlockedPct: number } };

test("control, policies, approvals, activity at 1440x900", async ({ page, playwright, baseURL }) => {
  await prepareE2EBaseline(page);
  const dir = path.join(process.cwd(), "docs/screenshots");
  fs.mkdirSync(dir, { recursive: true });

  const staff = await playwright.request.newContext({ baseURL });
  await authenticateStaff(staff);
  await staff.post("/api/admin/peffle/discount-cap", {
    data: { capPaise: demoNumbers.peffle.discountBudgetPaise },
  });

  await runDeskAgentWithIntent(page, HALO_FLIGHT_INTENT);
  await ensureVerifiedBuyerForCheckout(page);
  const ctx = await page.request.get("/api/desk/context");
  const sessionId = ((await ctx.json()) as { auth?: { sessionId?: string } }).auth?.sessionId;
  expect(sessionId).toBeTruthy();

  await page.request.post("/api/agent/chat", {
    data: { sessionId, message: `give me ${Math.round(demoNumbers.demoDiscounts.passesPaise / 100)} rupees off` },
  });
  await page.request.post("/api/agent/chat", {
    data: { sessionId, message: `give me ${demoNumbers.demoDiscounts.commerceBlockedPct}% off` },
  });

  const checkout = await page.request.post("/api/checkout", { data: { sessionId, source: "cart" } });
  expect(checkout.ok(), await checkout.text()).toBeTruthy();
  const checkoutBody = (await checkout.json()) as { razorpayOrderId: string };
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET!;
  const rawBody = JSON.stringify({
    id: `evt_shot_${randomUUID().slice(0, 8)}`,
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: `pay_shot_${randomUUID().slice(0, 8)}`,
          order_id: checkoutBody.razorpayOrderId,
          status: "captured",
        },
      },
    },
  });
  await page.request.post("/api/webhooks/razorpay", {
    headers: { "x-razorpay-signature": createHmac("sha256", webhookSecret).update(rawBody).digest("hex") },
    data: rawBody,
  });

  await page.request.post("/api/agent/chat", { data: { sessionId, message: "refund 10 rupees" } });
  await page.request.post("/api/agent/chat", { data: { sessionId, message: "refund 20 rupees" } });

  const peffle = await staff.get("/api/admin/peffle");
  const state = (await peffle.json()) as { pendingApprovals: Array<{ eventId: string }> };
  expect(state.pendingApprovals.length).toBeGreaterThanOrEqual(1);
  await staff.post("/api/admin/peffle/approvals", {
    data: { eventId: state.pendingApprovals[0]!.eventId, decision: "approve" },
  });

  await staff.post("/api/admin/peffle/kill", { data: { action: "kill", agentId: `desk:${sessionId}` } });
  await page.request.post("/api/agent/chat", { data: { sessionId, message: "give me 50 rupees off" } });

  await authenticateStaffOnPage(page);
  await page.goto("/admin");
  await expect(page.getByRole("heading", { name: "Control", exact: true })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByTestId("peffle-kill-all")).toBeVisible();
  await page.screenshot({ path: path.join(dir, "control.png"), fullPage: false });

  await page.goto("/admin/policies");
  await expect(page.getByRole("heading", { name: "Merchant policies" })).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: path.join(dir, "policies.png"), fullPage: false });

  await page.goto("/admin");
  await expect(page.getByTestId("peffle-pending-approvals")).toBeVisible();
  await page.screenshot({ path: path.join(dir, "approvals.png"), fullPage: false });

  await page.goto("/admin/activity");
  await expect(page.getByRole("heading", { name: "Activity", exact: true })).toBeVisible({ timeout: 15_000 });
  await page.screenshot({ path: path.join(dir, "activity.png"), fullPage: false });

  await staff.dispose();
});
