import { expect, test, type Page } from "@playwright/test";

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

  await expect(page.getByTestId("utility-drawer")).toHaveAttribute(
    "data-state",
    "expanded",
  );
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

async function assertNoForbiddenWording(text: string) {
  expect(text).not.toMatch(/\bCritical\b/);
  expect(text).not.toMatch(/\bLow\b(?!\s+operational)/i);
  expect(text).not.toMatch(/\bseverity\b/i);
  expect(text).not.toMatch(/\bconfidence\b/i);
  expect(text).not.toMatch(/\bscore\b/i);
  expect(text).not.toMatch(/Venue map/i);
  expect(text).not.toMatch(/Seat map/i);
}

async function enableDemoSources(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem("stadium-sentinel-demo-sources-connected", "true");
  });
  await page.reload();
}

async function pullLatestReports(page: Page) {
  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toContainText(/refreshed|loaded/i, {
    timeout: 5_000,
  });
}

test("command center shell stays intact and uses cleaned recording copy", async ({
  page,
}) => {
  await page.goto("/command");

  await expect(page.getByTestId("dispatch-queue")).toBeVisible();
  await expect(page.getByTestId("active-incident-workspace")).toBeVisible();
  await expect(page.getByTestId("utility-drawer")).toBeVisible();
  await expect(page.getByTestId("incident-card")).toHaveCount(3);
  await expect(page.getByText("Mock Intake")).toHaveCount(0);
  await expect(page.getByText("Automatic ingest (prototype)")).toHaveCount(0);
  await expect(page.getByTestId("what-changed-summary")).toHaveCount(0);
  await expect(page.getByTestId("ingestion-status-banner")).toHaveCount(0);
  await expect(page.getByTestId("command-strip-summary")).toContainText(/operations/i);
});

test("dispatch queue selection switches the active incident workspace", async ({
  page,
}) => {
  await page.goto("/command");

  await page.locator('[data-incident-id="incident-gate-b"]').click();
  await expect(page.getByTestId("selected-incident-title")).toHaveText("Gate B backed up");

  await page.locator('[data-incident-id="incident-elevator-4"]').click();
  await expect(page.getByTestId("selected-incident-title")).toHaveText("Elevator 4 down");

  await page.locator('[data-incident-id="incident-section-112"]').click();
  await expect(page.getByTestId("selected-incident-title")).toHaveText(
    "Guest needs wheelchair access near Section 112",
  );
});

test("drawer, evidence panel, and report panel use the cleaned structures", async ({
  page,
}) => {
  await page.goto("/command");
  await page.getByTestId("incident-drawer-handle").click();

  await openWorkspace(page, "Evidence");
  await expect(page.getByText("Evidence used")).toBeVisible();
  await expect(page.getByText("Recommended next action")).toBeVisible();
  await expect(page.getByText("Operational evidence")).toHaveCount(0);
  await expect(page.getByText("Evidence read path")).toHaveCount(0);
  await expect(page.getByText("Elastic search")).toHaveCount(0);

  await openWorkspace(page, "Report");
  await expect(page.getByTestId("report-input")).not.toBeEmpty();
  await expect(page.getByTestId("report-draft-markdown")).toContainText(
    "Operations Report Draft",
  );
  await expect(page.getByTestId("demo-memory-panel")).toContainText("Recent command memory");
});

test("sentinel command panel opens from the command strip and supports typed fallback", async ({
  page,
}) => {
  await page.goto("/command");

  await openSentinelPanel(page);
  await expect(page.getByText("Sentinel command")).toBeVisible();
  await expect(page.getByTestId("sentinel-state")).toBeVisible();
  await expect(
    page.getByText("Type instead").or(page.getByTestId("sentinel-question-input")),
  ).toBeVisible();

  await askSentinel(page, "What should I do first?");
  const answerText = (await page.getByTestId("sentinel-answer").textContent()) ?? "";
  expect(answerText).toMatch(/Guest Services|Dispatch|Section 112/i);
});

test("sentinel can open Evidence and render a visible action trace", async ({ page }) => {
  await page.goto("/command");
  await openSentinelPanel(page);
  await askSentinel(page, "Show me evidence");

  await expect(page.getByTestId("sentinel-action-trace")).toContainText("Open Evidence");
  await expect(page.getByTestId("sentinel-action-trace")).toContainText(
    "Evidence opened for the selected incident.",
  );
  await expect(page.getByTestId("utility-drawer")).toHaveAttribute("data-state", "expanded");
  await expect(page.getByTestId("evidence-panel")).toBeVisible();
});

test("sentinel can open Report and draft into the visible report field", async ({
  page,
}) => {
  await page.goto("/command");
  await openSentinelPanel(page);
  await askSentinel(page, "Write a report");

  await expect(page.getByTestId("sentinel-action-trace")).toContainText("Draft a report");
  await openWorkspace(page, "Report");
  await expect(page.getByTestId("report-input")).toContainText(
    "Operations report for",
  );
});

test("sentinel dispatch command uses the existing action path and records write-back trace", async ({
  page,
}) => {
  await page.goto("/command");
  await openSentinelPanel(page);
  await askSentinel(page, "Dispatch assigned team");

  await expect(page.getByTestId("sentinel-apply-action")).toBeVisible();
  await page.getByTestId("sentinel-apply-action").click();
  await expect(page.getByTestId("sentinel-action-trace")).toContainText(
    /write-back/i,
  );
  await expect(page.getByRole("button", { name: /Dispatch logged|Team dispatched/i })).toBeVisible();
});

test("sentinel source-log action opens the source log drawer", async ({ page }) => {
  await page.goto("/command");
  await openSentinelPanel(page);
  await askSentinel(page, "Open source log");

  await expect(page.getByTestId("source-log-panel")).toBeVisible();
  await expect(page.getByTestId("sentinel-action-trace")).toContainText("Open Source log");
});

test("pull latest reports updates source summary and records a source log entry", async ({
  page,
}) => {
  await page.goto("/command");
  await enableDemoSources(page);
  await pullLatestReports(page);

  await expect(page.getByTestId("command-strip-summary")).toContainText(/incidents pulled/i);

  await openWorkspace(page, "Source log");
  await expect(page.getByTestId("source-log-entry").first()).toBeVisible();
});

test("workspace pointer and dispatch note use cleaned copy", async ({ page }) => {
  await page.goto("/command");

  await expect(page.getByTestId("workflow-cues")).toBeVisible();
  await expect(page.getByTestId("dispatch-message")).not.toBeEmpty();
  await expect(page.getByTestId("follow-up-sentinel-cue")).toHaveText(
    "More follow-ups in Ask Sentinel.",
  );
  await expect(page.getByTestId("evidence-drawer-pointer")).toHaveText(
    "Open drawer: Evidence, Staff Update, Incident log, Report, Source log.",
  );
});

test("venue context updates the selected marker and keeps venue orientation hidden", async ({
  page,
}) => {
  await page.goto("/command");

  await expect(page.getByTestId("venue-orientation-section")).toHaveCount(0);
  await expect(page.getByTestId("venue-anchor-section-112")).toHaveAttribute(
    "data-selected",
    "true",
  );

  await page.locator('[data-incident-id="incident-gate-b"]').click();
  await expect(page.getByTestId("venue-anchor-gate-b")).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.getByTestId("venue-anchor-section-112")).toHaveAttribute(
    "data-selected",
    "false",
  );
});

test("operations timeline remains visible and avoids forbidden wording", async ({ page }) => {
  await page.goto("/command");

  const opsTimeline = page.getByTestId("operations-timeline");
  await expect(opsTimeline).toBeVisible();
  await expect(opsTimeline.getByText("Assigned").first()).toBeVisible();
  await expect(page.getByText("Recent activity")).toHaveCount(0);

  const bodyText = (await page.locator("body").textContent()) ?? "";
  await assertNoForbiddenWording(bodyText);
});

test("radio transcript panel is hidden by default", async ({ page }) => {
  await page.goto("/command");

  await expect(page.getByTestId("radio-transcript-panel")).toHaveCount(0);
});

test("backend-off mode keeps the deterministic api contract for the demo input", async ({
  page,
}) => {
  const response = await page.request.post("/api/agent", {
    data: {
      report:
        "Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.",
    },
  });

  expect(response.ok()).toBe(true);

  const payload = (await response.json()) as {
    incidentPackages: Array<{ incident: { id: string; priority: string } }>;
    meta: { retrievalMode: string; geminiMode: string };
  };

  expect(payload.incidentPackages).toHaveLength(3);
  expect(payload.incidentPackages.map(({ incident }) => incident.id)).toEqual([
    "incident-section-112",
    "incident-elevator-4",
    "incident-gate-b",
  ]);
  expect(payload.incidentPackages.map(({ incident }) => incident.priority)).toEqual([
    "Immediate",
    "High",
    "High",
  ]);
  expect(payload.meta.retrievalMode).toBe("local");
  expect(payload.meta.geminiMode).toBe("fallback");
  expect(JSON.stringify(payload)).not.toMatch(/score|confidence/i);
});
