import { expect, test, type Page } from "@playwright/test";

async function openWorkspace(
  page: Page,
  panel: "Evidence" | "Timeline" | "Report",
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
      : panel === "Timeline"
        ? page.getByTestId("timeline-panel")
        : page.getByTestId("report-panel");

  await expect(panelTarget).toBeVisible();
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

  await openWorkspace(page, "Timeline");
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

  await openWorkspace(page, "Timeline");
  await expect(page.getByTestId("timeline-panel").locator("article")).toHaveCount(
    timelineBeforeSubmit,
  );

  const timelineBeforeApprove = await page
    .getByTestId("timeline-panel")
    .locator("article")
    .count();

  await page.getByRole("button", { name: /Dispatch Guest Services:/i }).click();

  await openWorkspace(page, "Timeline");
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
  // Priority, Team, Location, Status label terms present (exact dt match)
  const section = page.getByTestId("command-file-section");
  await expect(section.locator("dt").filter({ hasText: /^Priority$/ })).toBeVisible();
  await expect(section.locator("dt").filter({ hasText: /^Team$/ })).toBeVisible();
  await expect(section.locator("dt").filter({ hasText: /^Location$/ })).toBeVisible();
  await expect(section.locator("dt").filter({ hasText: /^Status$/ })).toBeVisible();
});

test("command file section updates when a different incident is selected", async ({ page }) => {
  await page.goto("/command");

  await page.getByRole("button", { name: /Gate B backed up/i }).click();
  await expect(page.getByTestId("command-file-section")).toContainText("Gate B");

  await page.getByRole("button", { name: /Elevator 4 down/i }).click();
  await expect(page.getByTestId("command-file-section")).toContainText("Elevator 4");
});

test("agent reasoning section appears for pool incidents after pull", async ({ page }) => {
  await page.goto("/command");
  await page.evaluate(() => {
    localStorage.setItem("stadium-sentinel-demo-sources-connected", "true");
  });
  await page.reload();

  await page.getByTestId("pull-latest-reports").click();
  await expect(page.getByTestId("pull-status")).toHaveText("Latest demo reports pulled.", {
    timeout: 5_000,
  });

  await expect(page.getByTestId("agent-reasoning-section")).toBeVisible();
  // Reasoning entries are present
  await expect(
    page.getByTestId("agent-reasoning-section").locator("li").first(),
  ).toBeVisible();
});

test("timeline tab shows selected-incident-specific entries or calm empty state", async ({
  page,
}) => {
  await page.goto("/command");

  // Open timeline tab via drawer handle then tab click
  await page.getByTestId("incident-drawer-handle").click();
  await expect(page.getByTestId("utility-drawer")).toHaveAttribute("data-state", "expanded");

  const timelineTab = page
    .getByRole("tablist", { name: "Workspace panels" })
    .getByRole("tab", { name: "Timeline", exact: true })
    .first();
  await timelineTab.click();

  await expect(page.getByTestId("timeline-panel")).toBeVisible();

  // Either articles exist (entries for this incident) or the empty state is shown
  const articleCount = await page.getByTestId("timeline-panel").locator("article").count();
  const emptyStateVisible = await page
    .getByTestId("timeline-empty-state")
    .isVisible()
    .catch(() => false);
  expect(articleCount > 0 || emptyStateVisible).toBe(true);
});

test("timeline tab reflects selected incident after dispatch approval", async ({ page }) => {
  await page.goto("/command");

  await page.getByTestId("incident-drawer-handle").click();
  const timelineTab = page
    .getByRole("tablist", { name: "Workspace panels" })
    .getByRole("tab", { name: "Timeline", exact: true })
    .first();
  await timelineTab.click();

  const countBefore = await page.getByTestId("timeline-panel").locator("article").count();

  // Close drawer, approve dispatch
  await page.getByTestId("incident-drawer-handle").click();
  await page.getByRole("button", { name: /Dispatch Guest Services:/i }).click();

  // Re-open timeline tab
  await page.getByTestId("incident-drawer-handle").click();
  await timelineTab.click();

  await expect(page.getByTestId("timeline-panel").locator("article")).toHaveCount(
    countBefore + 1,
  );
});

test("evidence and staff update tabs reflect selected incident", async ({ page }) => {
  await page.goto("/command");

  // Open the drawer on Evidence tab (default)
  await page.getByTestId("incident-drawer-handle").click();
  await expect(page.getByTestId("utility-drawer")).toHaveAttribute("data-state", "expanded");
  await expect(page.getByTestId("evidence-panel")).toBeVisible();

  // Switch to Staff Update tab
  const staffTab = page
    .getByRole("tablist", { name: "Workspace panels" })
    .getByRole("tab", { name: "Staff Update", exact: true })
    .first();
  await staffTab.click();

  // Staff panel becomes open (panel container has data-state="open")
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
