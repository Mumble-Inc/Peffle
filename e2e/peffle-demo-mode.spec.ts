import { expect, test } from "@playwright/test";
import { authenticateStaffOnPage, HALO_FLIGHT_INTENT, prepareE2EBaseline, runDeskAgentWithIntent } from "./helpers/baseline";

test.describe("Demo Mode presentation trace", () => {
  test.beforeEach(async ({ page }) => {
    await prepareE2EBaseline(page);
  });

  test("buyer desk has no Demo Mode toggle", async ({ page }) => {
    await page.goto("/desk");
    await expect(page.getByTestId("demo-mode-toggle")).toHaveCount(0);
    await expect(page.getByTestId("peffle-trace")).toHaveCount(0);
  });

  test("staff can toggle the live trace without fabricating events", async ({ page }) => {
    await authenticateStaffOnPage(page);
    await runDeskAgentWithIntent(page, HALO_FLIGHT_INTENT);
    await expect(page.getByTestId("demo-mode-toggle")).toBeVisible();
    await expect(page.getByTestId("peffle-trace")).toHaveCount(0);

    await page.getByTestId("demo-mode-toggle").click();
    await page.getByRole("tab", { name: "Trace" }).click();
    await expect(page.getByTestId("peffle-trace")).toBeVisible();
    await expect(page.getByTestId("peffle-trace-decision")).toContainText("Waiting for a guarded action");
    await expect(page.getByTestId("peffle-trace-history")).toHaveCount(0);

    await page.getByRole("tab", { name: "Chat" }).click();
    await page.getByTestId("agent-chat-input").fill("give me 200 rupees off");
    await page.getByTestId("agent-chat-send").click();
    await expect(page.getByTestId("peffle-trace-action")).toHaveText("apply_discount", { timeout: 10_000 });
    await expect(page.getByTestId("peffle-trace-decision")).toContainText("ACTION ALLOWED");
    await expect(page.getByTestId("peffle-trace-reason")).toHaveText("ALLOWED");
  });
});
