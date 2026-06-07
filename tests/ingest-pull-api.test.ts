import { describe, expect, it, vi, beforeEach } from "vitest";

import { POST } from "@/app/api/ingest/pull/route";
import * as pullModule from "@/lib/elastic/pull";

vi.mock("@/lib/elastic/pull", () => ({
  pullLatestReportsFromElastic: vi.fn(),
  buildDemoPullFallbackResponse: vi.fn(),
  mapActiveIncidentToPackage: vi.fn(),
  fetchActiveIncidentsFromElastic: vi.fn(),
  fetchRelatedPullContext: vi.fn(),
}));

describe("ingest pull api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mocked elastic success with 200", async () => {
    vi.mocked(pullModule.pullLatestReportsFromElastic).mockResolvedValue({
      sourceMode: "elastic",
      outcome: "success",
      ingestionSummary: "Elastic ingestion applied 3 incident packages.",
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
        incidentCount: 1,
        elasticQuery: "stadium_active_incidents/_search",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/ingest/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ includeTimeline: true }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      sourceMode: string;
      outcome: string;
      incidentPackages: unknown[];
    };
    expect(payload.sourceMode).toBe("elastic");
    expect(payload.outcome).toBe("success");
    expect(payload.incidentPackages).toHaveLength(1);
  });

  it("returns fallback 200 when elastic is unavailable", async () => {
    vi.mocked(pullModule.pullLatestReportsFromElastic).mockResolvedValue({
      sourceMode: "demo",
      outcome: "fallback",
      ingestionSummary: "Fallback local ingestion applied 4 incident packages.",
      incidentPackages: [],
      timeline: [],
      reportSummary: {
        headline: "Report preview ready",
        unresolvedItems: [],
        recommendations: [],
        markdown: "# Report",
      },
      meta: {
        pulledAt: "2026-06-07T12:00:00.000Z",
        incidentCount: 0,
      },
    });

    const response = await POST(
      new Request("http://localhost/api/ingest/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { outcome: string; sourceMode: string };
    expect(payload.outcome).toBe("fallback");
    expect(payload.sourceMode).toBe("demo");
  });

  it("returns 400 for malformed request body", async () => {
    const response = await POST(
      new Request("http://localhost/api/ingest/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify("not-an-object"),
      }),
    );

    expect(response.status).toBe(400);
  });
});
