import { expect, test, type Page } from "@playwright/test";

async function openWorkspace(
  page: Page,
  panel: "Evidence" | "Timeline" | "Report",
) {
  await page
    .getByRole("tablist", { name: "Workspace panels" })
    .getByRole("tab", { name: panel, exact: true })
    .click();

  const panelTarget =
    panel === "Evidence"
      ? page.getByTestId("evidence-panel")
      : panel === "Timeline"
        ? page.getByTestId("timeline-panel")
        : page.getByTestId("report-panel");

  await expect(panelTarget).toBeVisible();
}

test("demo report creates incident cards, markers, evidence, timeline update, and report", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByTestId("incident-card")).toHaveCount(3);
  await expect(page.getByTestId("map-marker")).toHaveCount(3);
  await expect(page.getByTestId("evidence-panel")).not.toBeVisible();
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
  await expect(page.getByTestId("map-marker")).toHaveCount(3);
  await openWorkspace(page, "Evidence");
  await expect(page.getByTestId("evidence-panel")).toBeVisible();

  await openWorkspace(page, "Timeline");
  await expect(page.getByTestId("timeline-panel").locator("article")).toHaveCount(
    timelineBeforeSubmit,
  );

  const timelineBefore = await page.getByTestId("timeline-panel").locator("article").count();

  await page.getByRole("button", { name: /Dispatch Guest Services:/i }).press("Enter");

  await openWorkspace(page, "Timeline");
  await expect(page.getByTestId("timeline-panel").locator("article")).toHaveCount(
    timelineBefore + 1,
  );
  await openWorkspace(page, "Report");
  await expect(page.getByTestId("report-panel")).toBeVisible();
  await expect(page.getByText("Stadium Sentinel Post-Event Report")).toBeVisible();

  const bodyText = (await page.locator("body").textContent()) ?? "";

  expect(bodyText).not.toMatch(/\bscore\b/i);
  expect(bodyText).not.toMatch(/severity score/i);
  expect(bodyText).not.toMatch(/top severity/i);
  expect(bodyText).not.toMatch(/system signal/i);
  expect(bodyText).not.toMatch(/confidence/i);
  expect(bodyText).not.toMatch(/\b94\b/);
  expect(bodyText).not.toMatch(/\b88\b/);
  expect(bodyText).not.toMatch(/\b82\b/);
});

test("map markers switch the selected incident detail", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Gate B High incident", exact: true }).click();
  await expect(page.getByTestId("selected-incident-title")).toHaveText(
    "Gate B backed up",
  );

  await page
    .getByRole("button", { name: "Elevator 4 High incident", exact: true })
    .click();
  await expect(page.getByTestId("selected-incident-title")).toHaveText(
    "Elevator 4 down",
  );

  await page
    .getByRole("button", { name: "Section 112 Immediate incident", exact: true })
    .click();
  await expect(page.getByTestId("selected-incident-title")).toHaveText(
    "Guest needs wheelchair access near Section 112",
  );
});
