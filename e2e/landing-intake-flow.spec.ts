import { expect, test } from "@playwright/test";

const DEMO_SOURCE_IDS = ["guest-services", "security", "facilities", "radio"] as const;

test("landing page loads with hero and CTAs", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.status()).toBe(200);
  await expect(
    page.getByRole("heading", {
      name: "Make every stadium report easy to understand and act on.",
    }),
  ).toBeVisible();
  await expect(page.getByTestId("hero-cta-intake-demo")).toBeVisible();
  await expect(page.getByTestId("hero-cta-command-center")).toBeVisible();
  await expect(page.getByTestId("landing-expected-incidents")).toBeVisible();
});

test("Run intake demo opens the command center", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("hero-cta-intake-demo").click();
  await page.waitForURL("**/command");

  await expect(page.getByTestId("intake-context-bar")).toBeVisible();
});

test("intake shows single connect button and four sources starting Not connected", async ({
  page,
}) => {
  await page.goto("/demo/intake");

  // Exactly one main connect button — no per-source buttons
  await expect(page.getByTestId("connect-demo-sources")).toBeVisible();
  await expect(page.getByTestId("pull-latest-reports")).not.toBeVisible();

  // All four sources start as "Not connected"
  for (const sourceId of DEMO_SOURCE_IDS) {
    await expect(page.getByTestId(`source-status-${sourceId}`)).toHaveText("Not connected");
  }
});

test("connecting all demo sources shows Open command center button", async ({ page }) => {
  await page.goto("/demo/intake");

  // Open command center button is not yet visible
  await expect(page.getByTestId("open-command-center")).not.toBeVisible();

  // Clicking Connect demo sources sequences all four sources
  await page.getByTestId("connect-demo-sources").click();

  for (const sourceId of DEMO_SOURCE_IDS) {
    await expect(page.getByTestId(`source-status-${sourceId}`)).toHaveText("Connected", {
      timeout: 10_000,
    });
  }

  // Open command center appears; pull button does not
  await expect(page.getByTestId("open-command-center")).toBeVisible();
  await expect(page.getByTestId("pull-latest-reports")).not.toBeVisible();
});

test("intake flow connects sources and navigates to command with pull enabled", async ({
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

  // Intake context bar shows sync info
  await expect(page.getByTestId("intake-last-sync")).toBeVisible();

  // Pull latest reports button is enabled on command after sources connected
  await expect(page.getByTestId("pull-latest-reports")).toBeEnabled();
});

test("command center shows the three expected incident ids", async ({ page }) => {
  await page.goto("/command");

  await expect(page.locator('[data-incident-id="incident-section-112"]')).toBeVisible();
  await expect(page.locator('[data-incident-id="incident-elevator-4"]')).toBeVisible();
  await expect(page.locator('[data-incident-id="incident-gate-b"]')).toBeVisible();
});

test("pull latest reports on command updates incidents and shows status", async ({ page }) => {
  // Set sources-connected flag in localStorage before visiting command
  await page.goto("/command");
  await page.evaluate(() => {
    localStorage.setItem("stadium-sentinel-demo-sources-connected", "true");
  });
  await page.reload();

  // Pull button should now be enabled
  await expect(page.getByTestId("pull-latest-reports")).toBeEnabled({ timeout: 5_000 });

  await page.getByTestId("pull-latest-reports").click();

  // Status message appears
  await expect(page.getByTestId("pull-status")).toContainText(/pulled/i, {
    timeout: 5_000,
  });

  // Dispatch queue updates — at least one incident card present
  await expect(page.getByTestId("incident-card").first()).toBeVisible();
});

test("pull latest reports shows rate-limit message on third pull within 60 seconds", async ({
  page,
}) => {
  await page.goto("/command");
  await page.evaluate(() => {
    localStorage.setItem("stadium-sentinel-demo-sources-connected", "true");
  });
  await page.reload();

  await expect(page.getByTestId("pull-latest-reports")).toBeEnabled({ timeout: 5_000 });

  // First pull
  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toContainText(/pulled/i, {
    timeout: 5_000,
  });

  // Second pull
  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toContainText(/pulled/i, {
    timeout: 5_000,
  });

  // Third pull — rate limit
  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toHaveText(
    "Incidents are up to date. Try again shortly.",
    { timeout: 5_000 },
  );
});

test("pull button is disabled with helper text when sources not connected", async ({ page }) => {
  await page.goto("/command");
  // Ensure sources-connected key is absent
  await page.evaluate(() => {
    localStorage.removeItem("stadium-sentinel-demo-sources-connected");
  });
  await page.reload();

  await expect(page.getByTestId("pull-latest-reports")).toBeDisabled({ timeout: 5_000 });
  await expect(page.getByTestId("pull-helper-text")).toHaveText("Connect demo sources first.");
});

test("full demo journey from landing through dispatch and drawer", async ({ page }) => {
  await page.goto("/demo/intake");

  await page.getByTestId("connect-demo-sources").click();
  for (const sourceId of DEMO_SOURCE_IDS) {
    await expect(page.getByTestId(`source-status-${sourceId}`)).toHaveText("Connected", {
      timeout: 10_000,
    });
  }

  await page.getByTestId("open-command-center").click();
  await page.waitForURL("**/command");

  // Pull latest reports on command center
  await expect(page.getByTestId("pull-latest-reports")).toBeEnabled({ timeout: 5_000 });
  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toContainText(/pulled/i, {
    timeout: 5_000,
  });

  // Click the first incident card in the dispatch queue
  await page.getByTestId("incident-card").first().click();
  // Click the primary dispatch button in the active workspace
  await page.getByTestId("active-incident-workspace").getByRole("button").first().click();

  await page.getByTestId("incident-drawer-handle").click();
  await expect(page.getByTestId("utility-drawer")).toHaveAttribute(
    "data-state",
    "expanded",
  );
  await expect(page.getByTestId("evidence-panel")).toBeVisible();
});
