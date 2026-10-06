import { expect, test } from "@playwright/test";

const WIDTHS = [1440, 1280, 1024, 768, 390, 375, 320] as const;

const REMIX_PRIMARY_RGB = "rgb(12, 65, 134)";
const REMIX_CANVAS_RGB = "rgb(255, 255, 255)";

test.describe("landing visual", () => {
  test.beforeEach(({ }, testInfo) => {
    test.skip(testInfo.project.name !== "chromium", "viewport matrix runs on chromium");
  });

  for (const width of WIDTHS) {
    test(`holds at ${width}px`, async ({ page }) => {
      const errors: string[] = [];
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(message.text());
      });
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });

      await page.setViewportSize({ width, height: width >= 768 ? 900 : 812 });
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1, name: /blank cheque/i })).toBeVisible();
      await expect(page.getByRole("link", { name: "Open the desk" }).first()).toBeVisible();
      await expect(page.getByRole("tab", { name: "Intent" })).toBeVisible();
      await expect(page.getByRole("tab", { name: "Understanding" })).toBeVisible();
      await expect(page.getByTestId("landing-product-stage")).toBeVisible();

      const overflow = await page.evaluate(() => {
        const root = document.documentElement;
        return root.scrollWidth - root.clientWidth;
      });
      expect(overflow).toBeLessThanOrEqual(1);
      expect(errors).toEqual([]);

      const primaryCta = page.locator("#content").getByRole("link", { name: "Open the desk" }).first();
      await expect(primaryCta).toHaveCSS("background-color", REMIX_PRIMARY_RGB);

      const canvas = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(canvas).toBe(REMIX_CANVAS_RGB);

      const ambient = page.getByTestId("ambient-mesh");
      await expect(ambient).toBeAttached();
      await expect(ambient).toHaveCSS("background-color", REMIX_CANVAS_RGB);

      const stageShell = page.getByTestId("landing-product-stage").locator(".rf-glass-l3");
      const backdrop = await stageShell.evaluate((el) => {
        const style = getComputedStyle(el);
        return (
          style.backdropFilter ||
          (style as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter ||
          "none"
        );
      });
      if (width >= 768) {
        expect(backdrop).not.toBe("none");
      }
    });
  }

  test("trace steps, gate, and faq", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto("/");

    await page.getByRole("tab", { name: "Policy" }).click();
    await expect(page.getByRole("tabpanel")).toContainText("Allowed");
    await page.getByRole("tab", { name: "Approval" }).click();
    await expect(page.getByRole("tabpanel")).toContainText("Approved");
    await page.getByRole("tab", { name: "Settlement" }).click();
    await expect(page.getByRole("tabpanel")).toContainText("Ready");

    await expect(page.getByRole("heading", { name: /This request stops/i })).toBeVisible();
    await expect(page.getByText("Stopped at the gate", { exact: true })).toBeVisible();

    const faq = page.locator(".rf-faq details").first();
    await faq.locator("summary").focus();
    await page.keyboard.press("Enter");
    await expect(faq).toHaveJSProperty("open", true);
    await page.keyboard.press("Enter");
    await expect(faq).toHaveJSProperty("open", false);
  });

  test("reduced motion keeps the selected step", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByRole("tab", { name: "Understanding" }).click();
    await expect(page.getByRole("tab", { name: "Understanding" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    await expect(page.getByRole("tabpanel")).toBeVisible();
    await expect(page.locator(".rf-ambient__mesh")).toHaveAttribute("data-animated", "false");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});
