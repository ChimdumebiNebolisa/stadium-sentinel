import { expect, test } from "@playwright/test";

const realDemoEnabled = process.env.REAL_DEMO_E2E === "1";

test.describe("real demo flow", () => {
  test.skip(!realDemoEnabled, "Set REAL_DEMO_E2E=1 with NEXT_PUBLIC_REAL_DEMO_FLOW=true build");

  test("command center starts disconnected until operations data is connected", async ({
    page,
  }) => {
    await page.goto("/command");
    await page.evaluate(() => {
      localStorage.removeItem("stadium-sentinel-operations-connected");
      localStorage.removeItem("stadium-sentinel-demo-sources-connected");
    });
    await page.reload();

    await expect(page.getByTestId("dispatch-queue-empty")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("workspace-empty-title")).toHaveText(
      "No operations data connected",
    );
    await expect(page.getByTestId("pull-latest-reports")).toBeDisabled();
    await expect(page.getByTestId("connect-operations-data")).toBeVisible();
  });

  test("landing CTA routes to disconnected command center", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("hero-cta-intake-demo").click();
    await page.waitForURL("**/command");
    await expect(page.getByTestId("connect-operations-data")).toBeVisible({ timeout: 5_000 });
  });
});
