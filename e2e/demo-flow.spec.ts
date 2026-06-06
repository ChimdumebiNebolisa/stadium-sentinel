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
