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

test("Run intake demo opens the mock intake flow", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("hero-cta-intake-demo").click();
  await page.waitForURL("**/demo/intake");

  await expect(page.getByRole("heading", { name: "Simulated intake demo" })).toBeVisible();
});

test("connecting all demo sources enables Pull latest reports", async ({ page }) => {
  await page.goto("/demo/intake");

  const pullButton = page.getByTestId("pull-latest-reports");
  await expect(pullButton).toBeDisabled();

  for (const sourceId of DEMO_SOURCE_IDS) {
    await page.getByTestId(`connect-${sourceId}`).click();
    await expect(page.getByTestId(`source-status-${sourceId}`)).toHaveText("Connected");
  }

  await expect(pullButton).toBeEnabled();
});

test("intake flow creates 3 incidents and opens command center", async ({ page }) => {
  await page.goto("/demo/intake");

  for (const sourceId of DEMO_SOURCE_IDS) {
    await page.getByTestId(`connect-${sourceId}`).click();
  }

  await page.getByTestId("pull-latest-reports").click();

  await expect(page.getByTestId("intake-incident-count")).toHaveText("3 incidents created");
  await expect(page.getByTestId("intake-incident-incident-section-112")).toBeVisible();
  await expect(page.getByTestId("intake-incident-incident-elevator-4")).toBeVisible();
  await expect(page.getByTestId("intake-incident-incident-gate-b")).toBeVisible();

  await page.getByTestId("open-command-center").click();
  await page.waitForURL("**/command");
  await expect(page.getByTestId("intake-last-sync")).toBeVisible();
});

test("command center shows the three expected incident ids", async ({ page }) => {
  await page.goto("/command");

  await expect(page.locator('[data-incident-id="incident-section-112"]')).toBeVisible();
  await expect(page.locator('[data-incident-id="incident-elevator-4"]')).toBeVisible();
  await expect(page.locator('[data-incident-id="incident-gate-b"]')).toBeVisible();
});

test("full demo journey from landing through dispatch and drawer", async ({ page }) => {
  await page.goto("/");
  await page.getByTestId("hero-cta-intake-demo").click();
  await page.waitForURL("**/demo/intake");

  for (const sourceId of DEMO_SOURCE_IDS) {
    await page.getByTestId(`connect-${sourceId}`).click();
  }

  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("intake-incident-count")).toHaveText("3 incidents created");
  await page.getByTestId("open-command-center").click();

  await page.locator('[data-incident-id="incident-section-112"]').click();
  await page.getByRole("button", { name: /Dispatch Guest Services:/i }).click();

  await page.getByTestId("incident-drawer-handle").click();
  await expect(page.getByTestId("utility-drawer")).toHaveAttribute(
    "data-state",
    "expanded",
  );
  await expect(page.getByTestId("evidence-panel")).toBeVisible();
});
