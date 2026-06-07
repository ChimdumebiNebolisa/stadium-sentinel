import { expect, test, type Page } from "@playwright/test";

async function openWorkspace(
  page: Page,
  panel: "Evidence" | "Incident log" | "Report",
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
        : page.getByTestId("report-panel");

  await expect(panelTarget).toBeVisible();
}

async function openSentinelPanel(page: Page) {
  const control = page.getByTestId("sentinel-control");
  await expect(control).toBeVisible();
  await control.click();
  await expect(control).toHaveAttribute("aria-expanded", "true");
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

async function extractStandardTranscriptPreset(page: Page) {
  await page.getByTestId("radio-transcript-toggle").click();
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
}

async function pullLatestReports(page: Page) {
  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toHaveText("Latest demo reports pulled.", {
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
  await page.getByRole("button", { name: "Process report" }).click({ force: true });

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

test("command file section appears for selected incident", async ({ page }) => {
  await page.goto("/command");

  await expect(page.getByTestId("command-file-section")).toBeVisible();
  const section = page.getByTestId("command-file-section");
  await expect(section.locator("dt").filter({ hasText: /^Priority$/ })).toBeVisible();
  await expect(section.locator("dt").filter({ hasText: /^Team$/ })).toBeVisible();
  await expect(section.locator("dt").filter({ hasText: /^Location$/ })).toBeVisible();
  await expect(section.locator("dt").filter({ hasText: /^Status$/ })).toBeVisible();
  await expect(section.getByText("Suggested staff update")).toHaveCount(0);
});

test("command file section updates when a different incident is selected", async ({ page }) => {
  await page.goto("/command");

  await page.getByRole("button", { name: /Gate B backed up/i }).click();
  await expect(page.getByTestId("command-file-section")).toContainText("Gate B");

  await page.getByRole("button", { name: /Elevator 4 down/i }).click();
  await expect(page.getByTestId("command-file-section")).toContainText("Elevator 4");
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
  await expect(page.getByTestId("sentinel-suggested-question").count()).resolves.toBeGreaterThanOrEqual(3);
  await expect(page.getByTestId("sentinel-suggested-question").count()).resolves.toBeLessThanOrEqual(5);
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
    "Evidence reviewed — open drawer for full record.",
  );
});

test("workspace shows response timeline with operational stages", async ({ page }) => {
  await page.goto("/command");

  const responseTimeline = page.getByTestId("response-timeline");
  await expect(responseTimeline).toBeVisible();
  await expect(responseTimeline.getByText("Response timeline")).toBeVisible();
  await expect(responseTimeline.getByTestId("response-timeline-stage-intake")).toBeVisible();
  await expect(responseTimeline.getByTestId("response-timeline-stage-acknowledged")).toBeVisible();
  await expect(responseTimeline.getByTestId("response-timeline-stage-team-assigned")).toBeVisible();
  await expect(responseTimeline.getByTestId("response-timeline-stage-dispatched")).toBeVisible();
  await expect(responseTimeline.getByTestId("response-timeline-stage-resolved")).toBeVisible();
  await expect(responseTimeline.getByTestId("response-timeline-stage-intake")).toContainText("Intake");
  await expect(responseTimeline.getByTestId("response-timeline-stage-acknowledged")).toContainText(
    "Acknowledged",
  );
  await expect(responseTimeline.getByTestId("response-timeline-stage-team-assigned")).toContainText(
    "Team assigned",
  );
  await expect(responseTimeline.getByTestId("response-timeline-stage-dispatched")).toContainText(
    "Dispatched",
  );
  await expect(responseTimeline.getByTestId("response-timeline-stage-resolved")).toContainText(
    "Resolved",
  );
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
  await expect(page.getByTestId("pull-status")).toHaveText("Latest demo reports pulled.", {
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
  await expect(page.getByTestId("pull-status")).toHaveText("Latest demo reports pulled.", {
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
    "Staff follow-ups available in Ask Sentinel.",
  );
  await expect(page.getByTestId("follow-up-questions")).toHaveCount(0);
  await expect(page.getByTestId("response-timeline")).toBeVisible();
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
  await expect(page.getByTestId("pull-status")).toHaveText("Latest demo reports pulled.", {
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

test("radio transcript panel stays collapsed until opened", async ({ page }) => {
  await page.goto("/command");

  await expect(page.getByTestId("radio-transcript-panel")).toBeVisible();
  await expect(page.getByTestId("radio-transcript-toggle")).toHaveAttribute("aria-expanded", "false");
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
  await expect(page.getByTestId("pull-status")).toHaveText("Latest demo reports pulled.", {
    timeout: 5_000,
  });

  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toHaveText("Latest demo reports pulled.", {
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

  await page.getByTestId("radio-transcript-toggle").click();
  await page.getByTestId("transcript-preset-restroom").click();
  await page.getByTestId("extract-transcript").click();
  await expect(page.getByTestId("transcript-extract-summary")).toContainText(
    /new report added/i,
  );

  await pullLatestReports(page);

  await page.getByTestId("incident-drawer-handle").click();
  await openWorkspace(page, "Incident log");
  const logText = (await page.getByTestId("timeline-panel").textContent()) ?? "";
  expect(logText).not.toContain("West Concourse restroom is out of order.");
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
