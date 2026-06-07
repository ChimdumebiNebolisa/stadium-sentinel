import { describe, expect, it, vi, beforeEach } from "vitest";

import { POST } from "@/app/api/timeline/write/route";
import * as timelineWrite from "@/lib/elastic/timeline-write";
import { buildDemoState } from "@/lib/demo";

vi.mock("@/lib/elastic/timeline-write", () => ({
  buildTimelineEntryFromApproval: vi.fn(),
  writeApprovedActionToElastic: vi.fn(),
}));

describe("timeline write api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mocked elastic success", async () => {
    const demo = buildDemoState();
    const incidentPackage = demo.incidentPackages[0]!;

    vi.mocked(timelineWrite.buildTimelineEntryFromApproval).mockReturnValue({
      timelineEntry: {
        id: `${incidentPackage.incident.id}-approved-0`,
        incidentId: incidentPackage.incident.id,
        timestamp: "2026-06-07T12:00:00.000Z",
        type: "approved",
        message: "Dispatch Guest Services",
        actor: "Operations Lead",
      },
      dispatchDocument: {
        id: `${incidentPackage.incident.id}-approved-0`,
        incidentId: incidentPackage.incident.id,
        timestamp: "2026-06-07T12:00:00.000Z",
        type: "approved",
        message: "Dispatch Guest Services",
        actor: "Operations Lead",
        source: "operator",
      },
      memoryDocument: {
        timestamp: "2026-06-07T12:00:00.000Z",
        incidentId: incidentPackage.incident.id,
        title: incidentPackage.incident.title,
        locationId: incidentPackage.incident.locationId,
        locationLabel: incidentPackage.incident.locationLabel,
        team: incidentPackage.incident.assignedRole,
        priority: incidentPackage.incident.priority,
        status: incidentPackage.incident.status,
        summary: incidentPackage.incident.rawText,
        approvedActionIds: [],
        evidenceRefs: [],
        source: "timeline_write_route",
      },
    });

    vi.mocked(timelineWrite.writeApprovedActionToElastic).mockResolvedValue({
      elasticWritten: true,
      result: timelineWrite.buildTimelineEntryFromApproval({
        incidentId: incidentPackage.incident.id,
        actionIndex: 0,
        actionLabel: "Dispatch Guest Services",
        incidentPackage,
      }),
    });

    const response = await POST(
      new Request("http://localhost/api/timeline/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: incidentPackage.incident.id,
          actionIndex: 0,
          actionLabel: "Dispatch Guest Services",
          incidentPackage,
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      elasticWritten: boolean;
      memoryWritten: boolean;
    };
    expect(payload.elasticWritten).toBe(true);
    expect(payload.memoryWritten).toBe(true);
  });

  it("returns 200 fallback when elastic write fails", async () => {
    const demo = buildDemoState();
    const incidentPackage = demo.incidentPackages[0]!;

    vi.mocked(timelineWrite.buildTimelineEntryFromApproval).mockReturnValue({
      timelineEntry: {
        id: `${incidentPackage.incident.id}-approved-0`,
        incidentId: incidentPackage.incident.id,
        timestamp: "2026-06-07T12:00:00.000Z",
        type: "approved",
        message: "Dispatch Guest Services",
        actor: "Operations Lead",
      },
      dispatchDocument: {
        id: `${incidentPackage.incident.id}-approved-0`,
        incidentId: incidentPackage.incident.id,
        timestamp: "2026-06-07T12:00:00.000Z",
        type: "approved",
        message: "Dispatch Guest Services",
        actor: "Operations Lead",
        source: "operator",
      },
      memoryDocument: {
        timestamp: "2026-06-07T12:00:00.000Z",
        incidentId: incidentPackage.incident.id,
        title: incidentPackage.incident.title,
        locationId: incidentPackage.incident.locationId,
        locationLabel: incidentPackage.incident.locationLabel,
        team: incidentPackage.incident.assignedRole,
        priority: incidentPackage.incident.priority,
        status: incidentPackage.incident.status,
        summary: incidentPackage.incident.rawText,
        approvedActionIds: [],
        evidenceRefs: [],
        source: "timeline_write_route",
      },
    });

    vi.mocked(timelineWrite.writeApprovedActionToElastic).mockResolvedValue({
      elasticWritten: false,
      result: timelineWrite.buildTimelineEntryFromApproval({
        incidentId: incidentPackage.incident.id,
        actionIndex: 0,
        actionLabel: "Dispatch Guest Services",
        incidentPackage,
      }),
    });

    const response = await POST(
      new Request("http://localhost/api/timeline/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          incidentId: incidentPackage.incident.id,
          actionIndex: 0,
          actionLabel: "Dispatch Guest Services",
          incidentPackage,
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      elasticWritten: boolean;
      sourceAuditSummary: string;
    };
    expect(payload.elasticWritten).toBe(false);
    expect(payload.sourceAuditSummary).toContain("Elastic write-back unavailable");
  });

  it("returns 400 for missing required fields", async () => {
    const response = await POST(
      new Request("http://localhost/api/timeline/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId: "incident-section-112" }),
      }),
    );

    expect(response.status).toBe(400);
  });
});
