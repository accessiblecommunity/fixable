import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("Museum home page", () => {
  test("has accessibility violations in broken mode", async ({ page }) => {
    await page.goto("museum/");

    const results = await new AxeBuilder({ page }).analyze();

    expect(results.violations.length).toBeGreaterThan(0);

    for (const violation of results.violations) {
      console.log(
        `[${violation.impact}] ${violation.id}: ${violation.description} (${violation.nodes.length} instance(s))`,
      );
    }
  });
});
