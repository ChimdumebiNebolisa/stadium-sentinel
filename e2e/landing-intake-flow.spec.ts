import { expect, test } from "@playwright/test";

const DEMO_SOURCE_IDS = ["guest-services", "security", "facilities", "radio"] as const;

async function expectPullComplete(page: Parameters<typeof test>[0]["page"]) {
  await expect(page.getByTestId("pull-status")).toContainText(/pulled|loaded/i, {
    timeout: 5_000,
  });
}

test("landing page loads with clean recording copy and CTAs", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", {
      name: "Make every stadium report easy to understand and act on.",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("hero-cta-intake-demo")).toBeVisible();
  await expect(page.getByTestId("hero-cta-command-center")).toBeVisible();
  await expect(page.getByText("Mock Intake")).toHaveCount(0);
});

test("landing CTA opens the command center", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("hero-cta-intake-demo").click();
  await page.waitForURL("**/command");

  await expect(page.getByTestId("intake-context-bar")).toBeVisible();
});

test("intake shows one connect button and four sources starting Not connected", async ({
  page,
}) => {
  await page.goto("/demo/intake");

  await expect(page.getByTestId("connect-demo-sources")).toBeVisible();
  await expect(page.getByTestId("pull-latest-reports")).not.toBeVisible();

  for (const sourceId of DEMO_SOURCE_IDS) {
    await expect(page.getByTestId(`source-status-${sourceId}`)).toHaveText("Not connected");
  }
});

test("intake flow connects operations sources and enables pull on command", async ({
  page,
}) => {
  await page.goto("/demo/intake");
  await page.getByTestId("connect-demo-sources").click();

  for (const sourceId of DEMO_SOURCE_IDS) {
    await expect(page.getByTestId(`source-status-${sourceId}`)).toHaveText("Connected", {
      timeout: 10_000,
    });
  }

  await page.getByTestId("open-command-center").click();
  await page.waitForURL("**/command");
  await expect(page.getByTestId("pull-latest-reports")).toBeEnabled();
});

test("command center shows the expected demo incident ids", async ({ page }) => {
  await page.goto("/command");

  await expect(page.locator('[data-incident-id="incident-section-112"]')).toBeVisible();
  await expect(page.locator('[data-incident-id="incident-elevator-4"]')).toBeVisible();
  await expect(page.locator('[data-incident-id="incident-gate-b"]')).toBeVisible();
});

test("pull latest reports updates incidents and rate-limits the third pull", async ({
  page,
}) => {
  await page.goto("/command");
  await page.evaluate(() => {
    localStorage.setItem("stadium-sentinel-demo-sources-connected", "true");
  });
  await page.reload();

  await expect(page.getByTestId("pull-latest-reports")).toBeEnabled({ timeout: 5_000 });

  await page.getByTestId("pull-latest-reports").click();
  await expectPullComplete(page);

  await page.getByTestId("pull-latest-reports").click();
  await expectPullComplete(page);

  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toHaveText(
    "Incidents are up to date. Try again shortly.",
    { timeout: 5_000 },
  );
});

test("pull button is disabled with updated helper copy when sources are not connected", async ({
  page,
}) => {
  await page.goto("/command");
  await page.evaluate(() => {
    localStorage.removeItem("stadium-sentinel-demo-sources-connected");
  });
  await page.reload();

  await expect(page.getByTestId("pull-latest-reports")).toBeDisabled({ timeout: 5_000 });
  await expect(page.getByTestId("pull-helper-text")).toHaveText(
    "Connect operations data first.",
  );
});

test("full demo journey from intake through dispatch and drawer still works", async ({
  page,
}) => {
  await page.goto("/demo/intake");

  await page.getByTestId("connect-demo-sources").click();
  for (const sourceId of DEMO_SOURCE_IDS) {
    await expect(page.getByTestId(`source-status-${sourceId}`)).toHaveText("Connected", {
      timeout: 10_000,
    });
  }

  await page.getByTestId("open-command-center").click();
  await page.waitForURL("**/command");
  await page.getByTestId("pull-latest-reports").click();
  await expectPullComplete(page);

  await page.getByTestId("incident-card").first().click();
  await page.getByTestId("active-incident-workspace").getByRole("button").first().click();

  await page.getByTestId("incident-drawer-handle").click();
  await expect(page.getByTestId("utility-drawer")).toHaveAttribute(
    "data-state",
    "expanded",
  );
  await expect(page.getByTestId("evidence-panel")).toBeVisible();
});
