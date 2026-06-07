import { expect, test } from "@playwright/test";

const realDemoEnabled = process.env.REAL_DEMO_E2E === "1";

test.describe("real demo flow", () => {
  test.skip(!realDemoEnabled, "Set REAL_DEMO_E2E=1 with NEXT_PUBLIC_REAL_DEMO_FLOW=true dev server");

  test.beforeEach(async ({ page }) => {
    await page.goto("/command");
    await page.evaluate(() => {
      localStorage.removeItem("stadium-sentinel-operations-connected");
      localStorage.removeItem("stadium-sentinel-demo-sources-connected");
      localStorage.removeItem("stadium-sentinel-demo-incidents");
    });
    await page.reload();
  });

  test("command center starts disconnected with no incidents", async ({ page }) => {
    await expect(page.locator(".workbench")).toHaveAttribute("data-real-demo-flow", "true");
    await expect(page.locator(".workbench")).toHaveAttribute(
      "data-operations-connected",
      "false",
    );
    await expect(page.locator(".workbench")).toHaveAttribute("data-incidents-pulled", "false");

    await expect(page.getByTestId("dispatch-queue-empty")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("workspace-empty-title")).toHaveText(
      "No operations data connected",
    );
    await expect(page.getByTestId("selected-incident-title")).not.toBeVisible();
    await expect(page.getByTestId("connect-operations-data")).toBeVisible();
    await expect(page.getByTestId("pull-latest-reports")).not.toBeVisible();
  });

  test("landing CTA routes to disconnected command center", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("hero-cta-intake-demo").click();
    await page.waitForURL("**/command");
    await expect(page.getByTestId("connect-operations-data")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("pull-latest-reports")).not.toBeVisible();
  });

  test("connect enables pull without preloading incidents", async ({ page }) => {
    await page.route("**/api/ingest/bootstrap", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          outcome: "ready",
          skipped: true,
          elasticConfigured: true,
        }),
      });
    });

    await page.getByTestId("connect-operations-data").click();
    await expect(page.getByTestId("connect-status")).toContainText(
      "Operations data connected. Pull latest reports",
      { timeout: 5_000 },
    );
    await expect(page.locator(".workbench")).toHaveAttribute(
      "data-operations-connected",
      "true",
    );
    await expect(page.locator(".workbench")).toHaveAttribute("data-incidents-pulled", "false");
    await expect(page.getByTestId("pull-latest-reports")).toBeVisible();
    await expect(page.getByTestId("dispatch-queue-empty")).toBeVisible();
    await expect(page.getByTestId("workspace-empty-title")).toHaveText("No incidents loaded yet");
    await expect(page.getByTestId("selected-incident-title")).not.toBeVisible();
  });

  test("pull populates queue after connect", async ({ page }) => {
    await page.route("**/api/ingest/bootstrap", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          outcome: "ready",
          skipped: true,
          elasticConfigured: true,
        }),
      });
    });

    await page.route("**/api/ingest/pull", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          sourceMode: "elastic",
          outcome: "success",
          ingestionSummary: "Elastic ingestion applied 2 incident packages.",
          incidentPackages: [
            {
              incident: {
                id: "incident-section-112",
                rawText: "Guest near Section 112 needs wheelchair access.",
                title: "Section 112 assist",
                incidentType: "accessibility-assist",
                category: "guest-assistance",
                locationId: "section-112",
                locationLabel: "Section 112",
                priority: "Immediate",
                status: "new",
                assumptions: [],
                evidenceIds: [],
                recommendedActions: ["Dispatch Guest Services"],
                approvedActionIds: [],
                assignedRole: "Guest Services",
              },
              evidence: [],
              staffUpdate: "Wheelchair access requested.",
            },
            {
              incident: {
                id: "incident-gate-b",
                rawText: "Gate B queue backing up.",
                title: "Gate B backed up",
                incidentType: "queue-congestion",
                category: "crowd-flow",
                locationId: "gate-b",
                locationLabel: "Gate B",
                priority: "High",
                status: "new",
                assumptions: [],
                evidenceIds: [],
                recommendedActions: ["Route security to Gate B"],
                approvedActionIds: [],
                assignedRole: "Security",
              },
              evidence: [],
              staffUpdate: "Queue building at Gate B.",
            },
          ],
          timeline: [],
          reportSummary: {
            headline: "Report preview ready",
            unresolvedItems: [],
            recommendations: [],
            markdown: "# Report",
          },
          meta: {
            pulledAt: "2026-06-07T12:00:00.000Z",
            incidentCount: 2,
          },
        }),
      });
    });

    await page.getByTestId("connect-operations-data").click();
    await expect(page.getByTestId("pull-latest-reports")).toBeVisible({ timeout: 5_000 });
    await page.getByTestId("pull-latest-reports").click();

    await expect(page.locator(".workbench")).toHaveAttribute("data-incidents-pulled", "true", {
      timeout: 5_000,
    });
    await expect(page.getByTestId("incident-card")).toHaveCount(2);
    await expect(page.getByTestId("selected-incident-title")).toBeVisible();
    await expect(page.getByTestId("dispatch-queue-empty")).not.toBeVisible();
  });

  test("stale demo batch does not preload queue when operations was previously connected", async ({
    page,
  }) => {
    await page.evaluate(() => {
      localStorage.setItem("stadium-sentinel-operations-connected", "true");
      localStorage.setItem(
        "stadium-sentinel-demo-incidents",
        JSON.stringify({
          generatedAt: "2026-06-07T12:00:00.000Z",
          incidents: [
            {
              id: "incident-section-112",
              title: "Section 112 assist",
              priority: "Immediate",
              incidentType: "accessibility-assist",
              category: "guest-assistance",
              team: "Guest Services",
              location: "Section 112",
              status: "new",
              summary: "Stale batch",
              evidence: [],
              timeline: [],
            },
          ],
        }),
      );
    });
    await page.reload();

    await expect(page.getByTestId("dispatch-queue-empty")).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId("incident-card")).toHaveCount(0);
    await expect(page.getByTestId("pull-latest-reports")).toBeVisible();
  });
});
