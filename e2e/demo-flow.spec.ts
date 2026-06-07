import { expect, test, type Page } from "@playwright/test";

async function openWorkspace(
  page: Page,
  panel: "Evidence" | "Incident log" | "Report" | "Source log",
) {
  const tab = page
    .getByRole("tablist", { name: "Workspace panels" })
    .getByRole("tab", { name: panel, exact: true })
    .first();
  const isSelected = await tab.getAttribute("aria-selected");

  if (isSelected !== "true") {
    await tab.click();
  }

  await expect(page.getByTestId("utility-drawer")).toHaveAttribute(
    "data-state",
    "expanded",
  );

  const panelTarget =
    panel === "Evidence"
      ? page.getByTestId("evidence-panel")
      : panel === "Incident log"
        ? page.getByTestId("timeline-panel")
        : panel === "Source log"
          ? page.getByTestId("source-log-panel")
          : page.getByTestId("report-panel");

  await expect(panelTarget).toBeVisible();
}

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

async function assertNoForbiddenWording(text: string) {
  expect(text).not.toMatch(/\bCritical\b/);
  expect(text).not.toMatch(/\bLow\b(?!\s+operational)/i);
  expect(text).not.toMatch(/\bseverity\b/i);
  expect(text).not.toMatch(/\bconfidence\b/i);
  expect(text).not.toMatch(/\bscore\b/i);
}

async function enableDemoSources(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem("stadium-sentinel-demo-sources-connected", "true");
  });
  await page.reload();
}

async function pullLatestReports(page: Page) {
  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toContainText(/pulled/i, {
    timeout: 5_000,
  });
}

test("demo report renders the command-center shell and preserves the response workflow", async ({
  page,
}) => {
  await page.goto("/command");

  await expect(page.getByTestId("dispatch-queue")).toBeVisible();
  await expect(page.getByTestId("active-incident-workspace")).toBeVisible();
  await expect(page.getByTestId("utility-drawer")).toBeVisible();
  await expect(page.getByTestId("incident-card")).toHaveCount(3);
  await expect(page.getByTestId("selected-incident-title")).toHaveText(
    "Guest needs wheelchair access near Section 112",
  );
  await expect(page.getByText("Venue map")).toHaveCount(0);

  const initialLatest = await page.getByTestId("utility-latest-update").textContent();
  expect(initialLatest).toContain("Latest:");

  await openWorkspace(page, "Evidence");
  await expect(page.getByText("Operational evidence")).toBeVisible();

  await openWorkspace(page, "Report");
  await expect(page.getByTestId("report-input")).toHaveValue(
    "Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.",
  );

  await openWorkspace(page, "Incident log");
  const timelineBeforeSubmit = await page
    .getByTestId("timeline-panel")
    .locator("article")
    .count();

  await openWorkspace(page, "Report");
  await page.getByTestId("manual-ingest-confirm-replace").click();

  await expect(page.getByTestId("incident-card")).toHaveCount(3);
  await expect(page.getByTestId("selected-incident-title")).toHaveText(
    "Guest needs wheelchair access near Section 112",
  );

  await openWorkspace(page, "Incident log");
  await expect(page.getByTestId("timeline-panel").locator("article")).toHaveCount(
    timelineBeforeSubmit,
  );

  const timelineBeforeApprove = await page
    .getByTestId("timeline-panel")
    .locator("article")
    .count();

  await page.getByRole("button", { name: /Dispatch Guest Services:/i }).click();

  await openWorkspace(page, "Incident log");
  await expect(page.getByTestId("timeline-panel").locator("article")).toHaveCount(
    timelineBeforeApprove + 1,
  );
  await expect(page.getByTestId("utility-latest-update")).toHaveText(
    "Latest: Guest Services notified via radio.",
  );

  const bodyText = (await page.locator("body").textContent()) ?? "";

  expect(bodyText).not.toMatch(/\bscore\b/i);
  expect(bodyText).not.toMatch(/confidence/i);
  expect(bodyText).not.toMatch(/severity score/i);
  expect(bodyText).not.toMatch(/ticket/i);
  expect(bodyText).not.toMatch(/seat selection/i);
  expect(bodyText).not.toMatch(/seat map/i);
});

test("dispatch queue selection switches the active incident workspace", async ({
  page,
}) => {
  await page.goto("/command");

  await page.getByRole("button", { name: /Gate B backed up/i }).click();
  await expect(page.getByTestId("selected-incident-title")).toHaveText(
    "Gate B backed up",
  );

  await page.getByRole("button", { name: /Elevator 4 down/i }).click();
  await expect(page.getByTestId("selected-incident-title")).toHaveText(
    "Elevator 4 down",
  );

  await page.getByRole("button", { name: /Section 112 assist/i }).click();
  await expect(page.getByTestId("selected-incident-title")).toHaveText(
    "Guest needs wheelchair access near Section 112",
  );
});

test("bottom drawer expands upward from the collapsed handle", async ({ page }) => {
  await page.goto("/command");

  await expect(page.getByTestId("utility-drawer")).toHaveAttribute(
    "data-state",
    "collapsed",
  );
  await expect(page.getByTestId("incident-drawer-handle")).toBeVisible();
  await expect(page.getByText("Pull up incident files")).toBeVisible();

  await page.getByTestId("incident-drawer-handle").click();

  await expect(page.getByTestId("utility-drawer")).toHaveAttribute(
    "data-state",
    "expanded",
  );
  await expect(page.getByTestId("evidence-panel")).toBeVisible();
});

test("operations timeline appears for selected incident", async ({ page }) => {
  await page.goto("/command");

  await expect(page.getByTestId("operations-timeline")).toBeVisible();
  const section = page.getByTestId("operations-timeline");
  await expect(section.locator("h3").filter({ hasText: /^Operations timeline$/ })).toBeVisible();
});

test("operations timeline updates when a different incident is selected", async ({ page }) => {
  await page.goto("/command");

  await page.getByRole("button", { name: /Gate B backed up/i }).click();
  await expect(page.getByTestId("operations-timeline")).toBeVisible();

  await page.getByRole("button", { name: /Elevator 4 down/i }).click();
  await expect(page.getByTestId("operations-timeline")).toBeVisible();
});

test("sentinel control opens compact Q&A panel on default incidents", async ({
  page,
}) => {
  await page.goto("/command");

  await expect(page.getByTestId("sentinel-control")).toBeVisible();
  await openSentinelPanel(page);
  await expect(page.getByText("Ask about this incident")).toBeVisible();
  await expect(page.getByText("Sentinel reads the current command state.")).toBeVisible();
  await expect(page.getByTestId("sentinel-question-input")).toBeVisible();
  await expect(page.getByTestId("sentinel-mock-voice")).toBeVisible();
  await expect(page.getByTestId("sentinel-suggested-question").count()).resolves.toBeGreaterThanOrEqual(3);
  await expect(page.getByTestId("sentinel-suggested-question").count()).resolves.toBeLessThanOrEqual(5);
});

test("sentinel mock voice fills question input without auto-submit", async ({ page }) => {
  await page.goto("/command");
  await openSentinelPanel(page);

  await page.getByTestId("sentinel-mock-voice").click();
  await expect(page.getByTestId("sentinel-question-input")).toHaveValue(
    "What should I ask the radio operator?",
  );
  await expect(page.getByTestId("sentinel-answer")).toHaveCount(0);
});

test("sentinel mock voice requires manual Ask before showing an answer", async ({
  page,
}) => {
  await page.goto("/command");
  await openSentinelPanel(page);

  await page.getByTestId("sentinel-mock-voice").click();
  await expect(page.getByTestId("sentinel-answer")).toHaveCount(0);

  await page.getByTestId("sentinel-question-input").press("Enter");
  await expect(page.getByTestId("sentinel-answer")).toBeVisible();
  await expect(page.getByTestId("sentinel-answer")).not.toBeEmpty();
});

test("sentinel typed ask flow still works after mock voice control is present", async ({
  page,
}) => {
  await page.goto("/command");
  await openSentinelPanel(page);
  await askSentinel(page, "What should I do first?");

  const answerText = (await page.getByTestId("sentinel-answer").textContent()) ?? "";
  expect(answerText).toMatch(/Guest Services|Dispatch|Section 112/i);
});

test("sentinel suggested question produces an answer", async ({ page }) => {
  await page.goto("/command");
  await openSentinelPanel(page);

  await page.getByTestId("sentinel-suggested-question").first().click();
  const answer = page.getByTestId("sentinel-answer");
  await expect(answer).toBeVisible();
  await expect(answer).not.toBeEmpty();
});

test("sentinel answers what should I do first on default incidents", async ({
  page,
}) => {
  await page.goto("/command");
  await openSentinelPanel(page);
  await askSentinel(page, "What should I do first?");

  const answerText = (await page.getByTestId("sentinel-answer").textContent()) ?? "";
  expect(answerText).toMatch(/Guest Services|Dispatch|Section 112/i);
});

test("sentinel answers evidence question with current evidence", async ({ page }) => {
  await page.goto("/command");
  await openSentinelPanel(page);
  await askSentinel(page, "What evidence supports this?");

  const answerText = (await page.getByTestId("sentinel-answer").textContent()) ?? "";
  expect(answerText.length).toBeGreaterThan(20);
});

test("sentinel answers what changed after pull latest reports", async ({ page }) => {
  await page.goto("/command");
  await enableDemoSources(page);
  await pullLatestReports(page);

  await openSentinelPanel(page);
  await askSentinel(page, "What changed?");

  const answerText = (await page.getByTestId("sentinel-answer").textContent()) ?? "";
  expect(answerText).toMatch(/New:|Top priority:/i);
});

test("sentinel drafts a radio update", async ({ page }) => {
  await page.goto("/command");
  await openSentinelPanel(page);
  await askSentinel(page, "Draft a radio update.");

  const answerText = (await page.getByTestId("sentinel-answer").textContent()) ?? "";
  expect(answerText).toMatch(/dispatch/i);
  expect(answerText).toMatch(/priority/i);
});

test("sentinel Q&A avoids forbidden wording", async ({ page }) => {
  await page.goto("/command");
  await openSentinelPanel(page);
  await askSentinel(page, "What should I do first?");

  const panelText =
    (await page.getByTestId("sentinel-panel").textContent()) ?? "";
  await assertNoForbiddenWording(panelText);
});

test("sentinel panel closes when selected incident changes", async ({ page }) => {
  await page.goto("/command");

  await openSentinelPanel(page);
  await page.getByRole("button", { name: /Gate B backed up/i }).click();
  await expect(page.getByTestId("sentinel-control")).toHaveAttribute("aria-expanded", "false");
  await expect(page.getByTestId("sentinel-panel")).toHaveCount(0);
});

test("workspace shows evidence pointer without evidence card", async ({ page }) => {
  await page.goto("/command");

  await expect(page.getByText("Recent evidence")).toHaveCount(0);
  await expect(page.getByTestId("evidence-drawer-pointer")).toHaveText(
    "Open drawer → Evidence, Staff Update, Incident log, Report, Source log.",
  );
});

test("workspace shows operations timeline with operational stages", async ({ page }) => {
  await page.goto("/command");

  const opsTimeline = page.getByTestId("operations-timeline");
  await expect(opsTimeline).toBeVisible();
  await expect(opsTimeline.getByText("Operations timeline")).toBeVisible();
  
  await expect(opsTimeline.getByText("Assigned").first()).toBeVisible();
  await expect(page.getByText("Recent activity")).toHaveCount(0);
});

test("incident log tab shows full incident log heading and entries", async ({
  page,
}) => {
  await page.goto("/command");

  await page.getByTestId("incident-drawer-handle").click();
  await expect(page.getByTestId("utility-drawer")).toHaveAttribute("data-state", "expanded");

  const incidentLogTab = page
    .getByRole("tablist", { name: "Workspace panels" })
    .getByRole("tab", { name: "Incident log", exact: true })
    .first();
  await incidentLogTab.click();

  await expect(page.getByTestId("timeline-panel")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Full incident log" })).toBeVisible();

  const articleCount = await page.getByTestId("timeline-panel").locator("article").count();
  const emptyStateVisible = await page
    .getByTestId("timeline-empty-state")
    .isVisible()
    .catch(() => false);
  expect(articleCount > 0 || emptyStateVisible).toBe(true);
});

test("incident log tab reflects selected incident after dispatch approval", async ({
  page,
}) => {
  await page.goto("/command");

  await page.getByTestId("incident-drawer-handle").click();
  const incidentLogTab = page
    .getByRole("tablist", { name: "Workspace panels" })
    .getByRole("tab", { name: "Incident log", exact: true })
    .first();
  await incidentLogTab.click();

  const countBefore = await page.getByTestId("timeline-panel").locator("article").count();

  await page.getByTestId("incident-drawer-handle").click();
  await page.getByRole("button", { name: /Dispatch Guest Services:/i }).click();

  await page.getByTestId("incident-drawer-handle").click();
  await incidentLogTab.click();

  await expect(page.getByTestId("timeline-panel").locator("article")).toHaveCount(
    countBefore + 1,
  );
});

test("evidence and staff update tabs reflect selected incident", async ({ page }) => {
  await page.goto("/command");

  await page.getByTestId("incident-drawer-handle").click();
  await expect(page.getByTestId("utility-drawer")).toHaveAttribute("data-state", "expanded");
  await expect(page.getByTestId("evidence-panel")).toBeVisible();

  const staffTab = page
    .getByRole("tablist", { name: "Workspace panels" })
    .getByRole("tab", { name: "Staff Update", exact: true })
    .first();
  await staffTab.click();

  await expect(page.locator("#workspace-panel-staff")).toHaveAttribute("data-state", "open");
  await expect(page.getByRole("heading", { name: "Staff update" })).toBeVisible();
});

test("no forbidden wording appears in Phase B UI text", async ({ page }) => {
  await page.goto("/command");
  await page.evaluate(() => {
    localStorage.setItem("stadium-sentinel-demo-sources-connected", "true");
  });
  await page.reload();

  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toContainText(/pulled/i, {
    timeout: 5_000,
  });

  const bodyText = (await page.locator("body").textContent()) ?? "";
  expect(bodyText).not.toMatch(/\bCritical\b/);
  expect(bodyText).not.toMatch(/\bLow\b(?!\s+operational)/i);
  expect(bodyText).not.toMatch(/\bseverity\b/i);
  expect(bodyText).not.toMatch(/\bconfidence\b/i);
  expect(bodyText).not.toMatch(/\bscore\b/i);
});

test("pull latest reports shows what changed summary", async ({ page }) => {
  await page.goto("/command");
  await page.evaluate(() => {
    localStorage.setItem("stadium-sentinel-demo-sources-connected", "true");
  });
  await page.reload();

  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toContainText(/pulled/i, {
    timeout: 5_000,
  });

  const summary = page.getByTestId("what-changed-summary");
  await expect(summary).toBeVisible();
  await expect(summary.getByText("What changed?")).toBeVisible();
  await expect(summary.getByText(/Top priority:/)).toBeVisible();
});

test("selected incident shows compact dispatch note", async ({ page }) => {
  await page.goto("/command");
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);

  await expect(page.getByText("Recommended dispatch message")).toHaveCount(0);
  await expect(
    page.getByText("Staff-ready wording for radio or ops channel — copy only, nothing is sent."),
  ).toHaveCount(0);
  await expect(page.getByText("Dispatch note", { exact: true })).toBeVisible();
  await expect(page.getByTestId("workflow-cues")).toBeVisible();
  await expect(page.getByTestId("dispatch-message")).not.toBeEmpty();
  await expect(page.getByTestId("copy-dispatch-message")).toBeVisible();
  await page.getByTestId("copy-dispatch-message").click();
  await expect(page.getByTestId("copy-dispatch-message")).toHaveText("Copied");
  await expect(page.getByTestId("follow-up-sentinel-cue")).toHaveText(
    "More follow-ups in Ask Sentinel.",
  );
  await expect(page.getByTestId("follow-up-questions")).toHaveCount(0);
  await expect(page.getByTestId("operations-timeline")).toBeVisible();
  await expect(page.getByTestId("evidence-drawer-pointer")).toBeVisible();
  await expect(page.getByText("Recent evidence")).toHaveCount(0);
});

test("report tab shows demo report draft and memory", async ({ page }) => {
  await page.goto("/command");

  await openWorkspace(page, "Report");
  await expect(page.getByTestId("report-draft-headline")).toHaveText("Report draft ready");
  await expect(page.getByTestId("report-draft-markdown")).toContainText(
    "Operations Report Draft",
  );
  await expect(page.getByTestId("demo-memory-panel")).toBeVisible();
  await expect(page.getByTestId("demo-memory-panel")).toContainText("demo incident");
});

test("phase 2 workflow cues avoid forbidden wording after pull", async ({ page }) => {
  await page.goto("/command");
  await page.evaluate(() => {
    localStorage.setItem("stadium-sentinel-demo-sources-connected", "true");
  });
  await page.reload();

  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toContainText(/pulled/i, {
    timeout: 5_000,
  });

  await openSentinelPanel(page);
  await openWorkspace(page, "Report");

  const bodyText = (await page.locator("body").textContent()) ?? "";
  expect(bodyText).not.toMatch(/\bCritical\b/);
  expect(bodyText).not.toMatch(/\bLow\b(?!\s+operational)/i);
  expect(bodyText).not.toMatch(/\bseverity\b/i);
  expect(bodyText).not.toMatch(/\bconfidence\b/i);
  expect(bodyText).not.toMatch(/\bscore\b/i);
});

test("radio transcript panel is hidden by default", async ({ page }) => {
  await page.goto("/command");

  await expect(page.getByTestId("radio-transcript-panel")).toHaveCount(0);
});

test("sentinel answers radio operator question with follow-ups", async ({ page }) => {
  await page.goto("/command");
  await openSentinelPanel(page);
  await askSentinel(page, "What should I ask the radio operator?");

  const answerText = (await page.getByTestId("sentinel-answer").textContent()) ?? "";
  expect(answerText.length).toBeGreaterThan(10);
});

test("manual report ingestion requires replace confirmation when queue is non-empty", async ({
  page,
}) => {
  await page.goto("/command");
  await openWorkspace(page, "Report");

  await expect(page.getByTestId("manual-ingest-confirm")).toBeVisible();
  await expect(page.getByRole("button", { name: "Process report" })).toBeDisabled();
});

test("ingestion status banner loads without elastic credentials", async ({ page }) => {
  await page.goto("/command");

  await expect(page.getByTestId("ingestion-status-banner")).toBeVisible({
    timeout: 5_000,
  });
  await expect(page.getByTestId("ingestion-status-banner")).toContainText(
    /demo\/local|Seeded stadium operations data ready/i,
  );
});

test("pull latest reports records a source log entry", async ({ page }) => {
  await page.goto("/command");
  await enableDemoSources(page);
  await pullLatestReports(page);
  await openWorkspace(page, "Source log");

  await expect(page.getByTestId("source-log-entry").first()).toBeVisible();
});

test("evidence panel shows optional elastic read path state", async ({ page }) => {
  await page.goto("/command");
  await openWorkspace(page, "Evidence");

  await expect(page.getByTestId("elastic-evidence-read-panel")).toBeVisible({
    timeout: 5_000,
  });
  await expect(page.getByTestId("evidence-read-mode")).not.toHaveText("Checking…", {
    timeout: 5_000,
  });
});

const showVenueOrientation =
  process.env.NEXT_PUBLIC_SHOW_VENUE_ORIENTATION === "true";

test("venue orientation is hidden by default and page avoids forbidden map wording", async ({
  page,
}) => {
  test.skip(
    showVenueOrientation,
    "Venue orientation enabled via NEXT_PUBLIC_SHOW_VENUE_ORIENTATION=true",
  );

  await page.goto("/command");

  await expect(page.getByTestId("venue-orientation-section")).toHaveCount(0);
  await expect(page.getByText("Venue map")).toHaveCount(0);
  await expect(page.getByText("Seat map")).toHaveCount(0);
});

test("venue orientation highlights selected incident anchor when expanded", async ({
  page,
}) => {
  test.skip(
    !showVenueOrientation,
    "Venue orientation hidden by default; set NEXT_PUBLIC_SHOW_VENUE_ORIENTATION=true",
  );

  await page.goto("/command");

  await expect(page.getByTestId("venue-orientation-section")).toBeVisible();
  await expect(page.getByTestId("venue-orientation-toggle")).toHaveAttribute(
    "aria-expanded",
    "false",
  );
  await page.getByTestId("venue-orientation-toggle").click();
  await expect(page.getByTestId("venue-orientation-panel")).toBeVisible();
  await expect(page.getByTestId("venue-anchor-section-112")).toHaveAttribute(
    "data-selected",
    "true",
  );

  await page.getByRole("button", { name: /Gate B backed up/i }).click();
  await expect(page.getByTestId("venue-anchor-gate-b")).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.getByTestId("venue-anchor-section-112")).toHaveAttribute(
    "data-selected",
    "false",
  );
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
