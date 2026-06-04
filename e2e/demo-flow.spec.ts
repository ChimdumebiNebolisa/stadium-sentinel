import { expect, test } from "@playwright/test";

test("demo report creates incident cards, markers, evidence, timeline update, and report", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByTestId("incident-card")).toHaveCount(3);
  await expect(page.getByTestId("map-marker")).toHaveCount(3);
  await expect(page.getByTestId("evidence-panel")).toBeVisible();
  await expect(page.getByText("Operational evidence")).toBeVisible();
  await expect(page.getByTestId("report-input")).toHaveValue(
    "Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.",
  );

  const timelineBeforeSubmit = await page
    .getByTestId("timeline-panel")
    .locator("article")
    .count();

  await page.getByRole("button", { name: "Process report" }).click();

  await expect(page.getByTestId("incident-card")).toHaveCount(3);
  await expect(page.getByTestId("map-marker")).toHaveCount(3);
  await expect(page.getByTestId("evidence-panel")).toBeVisible();
  await expect(page.getByTestId("timeline-panel").locator("article")).toHaveCount(
    timelineBeforeSubmit,
  );

  const timelineBefore = await page.getByTestId("timeline-panel").locator("article").count();

  await page.getByRole("button", { name: "Approve" }).first().click();

  await expect(page.getByTestId("timeline-panel").locator("article")).toHaveCount(
    timelineBefore + 1,
  );
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
