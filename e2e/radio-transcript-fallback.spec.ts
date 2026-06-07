import { expect, test, type Page } from "@playwright/test";

const RADIO_TRANSCRIPT_PANEL_OVERRIDE_KEY = "stadium-sentinel-show-radio-transcript";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "true");
  }, RADIO_TRANSCRIPT_PANEL_OVERRIDE_KEY);
});

async function openSentinelPanel(page: Page) {
  const control = page.getByTestId("sentinel-control");
  await expect(control).toBeVisible();
  await control.click();
  await expect(page.getByTestId("sentinel-panel")).toBeVisible();
}

async function askSentinel(page: Page, question: string) {
  await page.getByTestId("sentinel-question-input").fill(question);
  await page.getByTestId("sentinel-question-input").press("Enter");
  await expect(page.getByTestId("sentinel-answer")).toBeVisible();
}

async function waitForIntakeBarReady(page: Page) {
  await expect
    .poll(async () => {
      if (await page.getByTestId("pull-helper-text").isVisible()) {
        return true;
      }

      const disabled = await page.getByTestId("pull-latest-reports").getAttribute("disabled");
      return disabled === null;
    })
    .toBe(true);
}

async function extractStandardTranscriptPreset(page: Page) {
  await waitForIntakeBarReady(page);
  await expect(page.getByTestId("radio-transcript-panel")).toBeVisible();
  const toggle = page.getByTestId("radio-transcript-toggle");
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.scrollIntoViewIfNeeded();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
  await expect(page.getByTestId("radio-transcript-input")).toBeVisible();
  await page.getByTestId("transcript-preset-standard").click();
  await page.getByTestId("extract-transcript").click();
  await expect(page.getByTestId("transcript-extract-summary")).toBeVisible();
}

async function enableDemoSources(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem("stadium-sentinel-demo-sources-connected", "true");
  });
  await page.reload();
  await waitForIntakeBarReady(page);
}

async function pullLatestReports(page: Page) {
  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toContainText(/pulled/i, {
    timeout: 5_000,
  });
}

async function openWorkspace(
  page: Page,
  panel: "Evidence" | "Incident log" | "Report" | "Source log",
) {
  const tab = page
    .getByRole("tablist", { name: "Workspace panels" })
    .getByRole("tab", { name: panel, exact: true })
    .first();
  if ((await tab.getAttribute("aria-selected")) !== "true") {
    await tab.click();
  }
  await expect(page.getByTestId("utility-drawer")).toHaveAttribute("data-state", "expanded");
}

async function assertNoForbiddenWording(text: string) {
  expect(text).not.toMatch(/\bCritical\b/);
  expect(text).not.toMatch(/\bLow\b(?!\s+operational)/i);
  expect(text).not.toMatch(/\bseverity\b/i);
  expect(text).not.toMatch(/\bconfidence\b/i);
  expect(text).not.toMatch(/\bscore\b/i);
}

test("radio transcript panel stays collapsed until opened when flag enabled", async ({
  page,
}) => {
  await page.goto("/command");
  await waitForIntakeBarReady(page);

  await expect(page.getByTestId("radio-transcript-panel")).toBeVisible();
  await expect(page.getByTestId("radio-transcript-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await expect(page.getByTestId("radio-transcript-input")).toHaveCount(0);
});

test("standard transcript preset matches current queue without adding incidents", async ({
  page,
}) => {
  await page.goto("/command");

  const queueCountBefore = await page.getByTestId("incident-card").count();
  await extractStandardTranscriptPreset(page);

  await expect(page.getByTestId("incident-card")).toHaveCount(queueCountBefore);
  await expect(page.getByTestId("transcript-extract-summary")).toContainText(
    "Radio transcript processed. 3 reports matched in the current queue.",
  );
});

test("repeat transcript extract keeps the selected incident stable", async ({ page }) => {
  await page.goto("/command");
  await waitForIntakeBarReady(page);

  await page.getByRole("button", { name: /Gate B backed up/i }).click();
  await expect(page.getByTestId("selected-incident-title")).toHaveText("Gate B backed up");

  await extractStandardTranscriptPreset(page);
  await expect(page.getByTestId("selected-incident-title")).toHaveText("Gate B backed up");

  await extractStandardTranscriptPreset(page);
  await expect(page.getByTestId("selected-incident-title")).toHaveText("Gate B backed up");
  await expect(page.getByTestId("transcript-extract-summary")).toContainText(
    "Radio transcript processed. 3 reports matched in the current queue.",
  );
});

test("transcript extract adds radio_log evidence and incident log entries", async ({ page }) => {
  await page.goto("/command");
  await extractStandardTranscriptPreset(page);

  await page.getByTestId("incident-drawer-handle").click();
  await openWorkspace(page, "Evidence");
  await expect(
    page.getByTestId("evidence-panel").getByRole("heading", { name: "Radio log excerpt" }),
  ).toBeVisible();

  await openWorkspace(page, "Incident log");
  await expect(page.getByTestId("timeline-panel")).toContainText("Radio report received");
});

test("pull latest reports and rate limit still work after transcript extract", async ({
  page,
}) => {
  await page.goto("/command");
  await enableDemoSources(page);
  await extractStandardTranscriptPreset(page);

  await pullLatestReports(page);
  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toContainText(/pulled/i, {
    timeout: 5_000,
  });

  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toHaveText(
    "Incidents are up to date. Try again shortly.",
    { timeout: 5_000 },
  );
});

test("pull after transcript extract filters stale log snippets from removed incidents", async ({
  page,
}) => {
  await page.goto("/command");
  await enableDemoSources(page);
  await waitForIntakeBarReady(page);

  await expect(page.getByTestId("radio-transcript-panel")).toBeVisible();
  const toggle = page.getByTestId("radio-transcript-toggle");
  await toggle.scrollIntoViewIfNeeded();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await page.getByTestId("transcript-preset-restroom").click();
  await page.getByTestId("extract-transcript").click();
  await expect(page.getByTestId("transcript-extract-summary")).toContainText(
    /new report added/i,
  );

  await pullLatestReports(page);
  const logText = (await page.getByTestId("timeline-panel").textContent()) ?? "";
  expect(logText).not.toContain("West Concourse restroom is out of order.");
});

test("sentinel answers what the radio log added after transcript extract", async ({ page }) => {
  await page.goto("/command");
  await extractStandardTranscriptPreset(page);
  await openSentinelPanel(page);
  await askSentinel(page, "What did the radio log add?");

  const answerText = (await page.getByTestId("sentinel-answer").textContent()) ?? "";
  expect(answerText).toMatch(/recognized|matched/i);
  expect(answerText).toMatch(/current queue/i);
});

test("sentinel answers timeline progress with active response stage", async ({ page }) => {
  await page.goto("/command");
  await extractStandardTranscriptPreset(page);
  await openSentinelPanel(page);
  await askSentinel(page, "What stage is this incident?");

  const answerText = (await page.getByTestId("sentinel-answer").textContent()) ?? "";
  expect(answerText).toMatch(/active stage|pending stage|complete/i);
  expect(answerText).toMatch(/Intake|Acknowledged|Team assigned|Dispatched|Resolved/i);
});

test("sentinel transcript prompts avoid forbidden wording", async ({ page }) => {
  await page.goto("/command");
  await extractStandardTranscriptPreset(page);
  await openSentinelPanel(page);
  await askSentinel(page, "What did the radio log add?");

  const panelText = (await page.getByTestId("sentinel-panel").textContent()) ?? "";
  await assertNoForbiddenWording(panelText);
});
