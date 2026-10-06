import { test, expect } from "@playwright/test";
import fs from "fs";
import path from "path";

type GlassAuditRow = {
  component: string;
  glassLevel: string | null;
  purpose: string | null;
  borderRadius: string;
  backdropFilter: string;
  background: string;
  border: string;
  boxShadow: string;
  flags: string[];
};

const viewports = [
  { width: 1440, height: 900, name: "desktop" },
  { width: 768, height: 900, name: "tablet" },
  { width: 390, height: 844, name: "mobile" },
] as const;

async function auditGlassElements(page: import("@playwright/test").Page): Promise<GlassAuditRow[]> {
  return page.evaluate(() => {
    const nodes = document.querySelectorAll("[data-rf-glass-level], [data-testid^='glass-']");
    const rows: GlassAuditRow[] = [];

    nodes.forEach((node) => {
      const el = node as HTMLElement;
      const style = getComputedStyle(el);
      const level = el.getAttribute("data-rf-glass-level");
      const purpose = el.getAttribute("data-rf-glass-purpose");
      const testId = el.getAttribute("data-testid");
      const flags: string[] = [];

      const parentGlass = el.parentElement?.closest("[data-rf-glass-level]");
      if (parentGlass && parentGlass !== el) {
        flags.push("GLASS_ON_GLASS");
      }

      const backdrop =
        style.backdropFilter ||
        (style as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter ||
        "none";
      if (level && backdrop === "none" && !window.matchMedia("(prefers-reduced-transparency: reduce)").matches) {
        flags.push("MISSING_BLUR");
      }

      const washAncestor = el.closest("[data-testid='glass-env-wash']");
      if (level === "2" && !washAncestor && testId === "glass-l2") {
        flags.push("INSUFFICIENT_CONTEXT");
      }

      rows.push({
        component: testId ?? purpose ?? el.className.slice(0, 40),
        glassLevel: level,
        purpose,
        borderRadius: style.borderRadius,
        backdropFilter: backdrop,
        background: style.backgroundColor,
        border: style.borderTopColor,
        boxShadow: style.boxShadow === "none" ? "none" : "set",
        flags,
      });
    });

    return rows;
  });
}

test.describe("Peffle glass audit", () => {
  for (const vp of viewports) {
    test(`lab material at ${vp.name} (${vp.width}px)`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/design-system");
      await page.getByRole("tab", { name: "Material" }).click();

      await expect(page.getByTestId("glass-env-wash")).toBeVisible();
      await expect(page.getByTestId("glass-l2")).toBeVisible();
      await expect(page.getByTestId("glass-l3")).toBeVisible();
      await expect(page.getByTestId("glass-gate-focal")).toBeVisible();

      const rows = await auditGlassElements(page);
      const report = { viewport: vp.name, width: vp.width, rows, generatedAt: new Date().toISOString() };

      await testInfo.attach(`glass-audit-${vp.name}.json`, {
        body: JSON.stringify(report, null, 2),
        contentType: "application/json",
      });

      const outDir = path.join(process.cwd(), "test-results");
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, `glass-audit-${vp.name}.json`), JSON.stringify(report, null, 2));

      for (const row of rows) {
        if (row.glassLevel === "2") {
          expect(parseFloat(row.borderRadius)).toBeGreaterThanOrEqual(11);
        }
        if (row.glassLevel === "3") {
          expect(parseFloat(row.borderRadius)).toBeGreaterThanOrEqual(15);
        }
        expect(row.flags).not.toContain("GLASS_ON_GLASS");
      }

      const l2 = rows.find((r) => r.component === "glass-l2");
      expect(l2?.flags ?? []).not.toContain("INSUFFICIENT_CONTEXT");
    });
  }

  test("reduced transparency fallback", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/design-system");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-a11y-reduced-transparency", "true");
    });
    await page.getByRole("tab", { name: "Material" }).click();

    const styles = await page.getByTestId("glass-l2").evaluate((el) => {
      const s = getComputedStyle(el);
      return {
        backdrop:
          s.backdropFilter ||
          (s as CSSStyleDeclaration & { webkitBackdropFilter?: string }).webkitBackdropFilter ||
          "none",
        background: s.backgroundColor,
      };
    });
    expect(styles.backdrop).toBe("none");
    expect(styles.background).toMatch(/255,\s*255,\s*255|rgb\(255, 255, 255\)/);
  });
});
