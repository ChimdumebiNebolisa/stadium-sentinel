import { expect, test, type Page } from "@playwright/test";

const RADIO_TRANSCRIPT_PANEL_OVERRIDE_KEY = "stadium-sentinel-show-radio-transcript";

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, "true");
  }, RADIO_TRANSCRIPT_PANEL_OVERRIDE_KEY);
});

async function waitForIntakeBarReady(page: Page) {
  await expect
    .poll(async () => {
      if (await page.getByTestId("pull-helper-text").isVisible().catch(() => false)) {
        return true;
      }

      const disabled = await page.getByTestId("pull-latest-reports").getAttribute("disabled");
      return disabled === null;
    })
    .toBe(true);
}

async function openSentinelPanel(page: Page) {
  await expect(page.getByTestId("sentinel-control")).toBeVisible();
  await page.getByTestId("sentinel-control").click();
  await expect(page.getByTestId("sentinel-panel")).toBeVisible();
}

async function revealTypedSentinelInput(page: Page) {
  const input = page.getByTestId("sentinel-question-input");
  if ((await input.count()) === 0 || !(await input.first().isVisible())) {
    await page.getByText("Type instead").click();
  }
  await expect(page.getByTestId("sentinel-question-input")).toBeVisible();
}

async function askSentinel(page: Page, question: string) {
  await revealTypedSentinelInput(page);
  await page.getByTestId("sentinel-question-input").fill(question);
  await page.getByTestId("sentinel-question-input").press("Enter");
  await expect(page.getByTestId("sentinel-answer")).toBeVisible();
}

async function extractStandardTranscriptPreset(page: Page) {
  await waitForIntakeBarReady(page);
  await expect(page.getByTestId("radio-transcript-panel")).toBeVisible();
  const toggle = page.getByTestId("radio-transcript-toggle");
  if ((await toggle.getAttribute("aria-expanded")) !== "true") {
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
  }
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
  await expect(page.getByTestId("pull-status")).toContainText(/pulled|loaded/i, {
    timeout: 5_000,
  });
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

test("standard transcript preset matches the current queue without adding incidents", async ({
  page,
}) => {
  await page.goto("/command");
  const queueCountBefore = await page.getByTestId("incident-card").count();

  await extractStandardTranscriptPreset(page);

  await expect(page.getByTestId("incident-card")).toHaveCount(queueCountBefore);
  await expect(page.getByTestId("transcript-extract-summary")).toContainText(/matched/i);
});

test("repeat transcript extract keeps the selected incident stable", async ({ page }) => {
  await page.goto("/command");
  await page.locator('[data-incident-id="incident-gate-b"]').click();
  await expect(page.getByTestId("selected-incident-title")).toHaveText("Gate B backed up");

  await extractStandardTranscriptPreset(page);
  await expect(page.getByTestId("selected-incident-title")).toHaveText("Gate B backed up");

  await extractStandardTranscriptPreset(page);
  await expect(page.getByTestId("selected-incident-title")).toHaveText("Gate B backed up");
});

test("transcript extract preserves transcript-linked evidence and incident log entries", async ({
  page,
}) => {
  await page.goto("/command");
  await extractStandardTranscriptPreset(page);
  await page.getByTestId("incident-drawer-handle").click();

  const evidenceTab = page.getByRole("tab", { name: "Evidence", exact: true });
  if ((await evidenceTab.getAttribute("aria-selected")) !== "true") {
    await evidenceTab.click();
  }
  await expect(page.getByTestId("evidence-panel")).toContainText(/Radio log|Evidence used/i);

  const incidentLogTab = page.getByRole("tab", { name: "Incident log", exact: true });
  await incidentLogTab.click();
  await expect(page.getByTestId("timeline-panel")).toContainText("Source received");
  await expect(page.getByTestId("timeline-panel")).toContainText("Sentinel evidence opened");
});

test("transcript extract keeps pull and sentinel follow-up paths working", async ({
  page,
}) => {
  await page.goto("/command");
  await enableDemoSources(page);
  await extractStandardTranscriptPreset(page);
  await pullLatestReports(page);

  await openSentinelPanel(page);
  await askSentinel(page, "What did the radio log add?");

  const answerText = (await page.getByTestId("sentinel-answer").textContent()) ?? "";
  expect(answerText).toMatch(/radio log|queue|matched|added/i);
});
