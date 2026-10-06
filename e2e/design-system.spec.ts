import { test, expect } from "@playwright/test";

const widths = [1440, 1280, 1024, 768, 390, 375, 320] as const;

test.describe("Global design system lab", () => {
  for (const width of widths) {
    test(`renders at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/design-system");
      await expect(page.getByRole("heading", { name: "Design system lab" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Primary" })).toBeVisible();
    });
  }

  test("focus and glass panels", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/design-system");
    await page.getByRole("tab", { name: "Controls" }).click();
    const primary = page.getByRole("button", { name: "Primary", exact: true });
    await expect(primary).toBeVisible();
    await primary.focus();
    await expect(primary).toBeFocused();
    await page.getByRole("tab", { name: "Material" }).click();
    await expect(page.getByTestId("glass-l2")).toBeVisible();
    await expect(page.getByTestId("glass-l3")).toBeVisible();
  });
});
