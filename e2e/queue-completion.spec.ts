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

async function assertNoForbiddenWording(text: string) {
  expect(text).not.toMatch(/\bCritical\b/);
  expect(text).not.toMatch(/\bseverity\b/i);
  expect(text).not.toMatch(/\bconfidence\b/i);
  expect(text).not.toMatch(/\bscore\b/i);
  expect(text).not.toMatch(/Venue map/i);
  expect(text).not.toMatch(/Seat map/i);
  expect(text).not.toMatch(/case closed/i);
  expect(text).not.toMatch(/closed ticket/i);
}

async function approveAllChecklistActions(page: Page, incidentId: string) {
  await page.locator(`[data-incident-id="${incidentId}"]`).click();

  const workspace = page.getByTestId("active-incident-workspace");
  await workspace.getByRole("button", { name: /Dispatch team/i }).click();
  await workspace.getByRole("button", { name: /Coordinate the|Route support/i }).click();
  await workspace.getByRole("button", { name: /Confirm outcome|Record handoff/i }).click();
}

test("completed incident moves below unresolved queue items and stays reviewable", async ({
  page,
}) => {
  await page.goto("/command");
  await expect(page.getByTestId("incident-card")).toHaveCount(3);

  const initialOrder = await page
    .locator("[data-testid='incident-card']")
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-incident-id")),
    );

  expect(initialOrder[0]).toBe("incident-section-112");

  await approveAllChecklistActions(page, "incident-section-112");

  const completedCard = page.locator('[data-incident-id="incident-section-112"]');
  await expect(completedCard).toHaveAttribute("data-queue-completed", "true");
  await expect(completedCard.getByTestId("incident-completion-badge")).toHaveText(
    /Completed|Logged|Resolved/,
  );

  const finalOrder = await page
    .locator("[data-testid='incident-card']")
    .evaluateAll((cards) =>
      cards.map((card) => card.getAttribute("data-incident-id")),
    );

  expect(finalOrder[finalOrder.length - 1]).toBe("incident-section-112");
  expect(finalOrder.slice(0, 2)).toEqual(initialOrder.slice(1));

  await expect(page.getByTestId("active-incident-workspace")).toBeVisible();
  await expect(page.getByTestId("workspace-completion-badge")).toHaveText(
    /Completed|Logged|Resolved/,
  );
  await expect(page.getByTestId("selected-incident-title")).toContainText(
    "wheelchair access",
  );

  await page.getByTestId("incident-drawer-handle").click();
  await openWorkspace(page, "Incident log");
  await expect(page.getByTestId("timeline-panel")).toContainText("Section 112");

  await openWorkspace(page, "Source log");
  await expect(page.getByTestId("source-log-panel")).toBeVisible();

  await openWorkspace(page, "Report");
  await expect(page.getByTestId("report-input")).toBeVisible();

  const bodyText = (await page.locator("body").textContent()) ?? "";
  await assertNoForbiddenWording(bodyText);
});
