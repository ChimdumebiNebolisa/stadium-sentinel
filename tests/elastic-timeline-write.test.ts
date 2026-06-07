import { describe, expect, it } from "vitest";

import { buildTimelineEntryFromApproval } from "@/lib/elastic/timeline-write";
import { buildDemoState } from "@/lib/demo";

describe("elastic timeline write", () => {
  it("maps approval payload to dispatch timeline and memory docs", () => {
    const demo = buildDemoState();
    const incidentPackage = demo.incidentPackages[0]!;
    const result = buildTimelineEntryFromApproval({
      incidentId: incidentPackage.incident.id,
      actionIndex: 0,
      actionLabel: incidentPackage.incident.recommendedActions[0] ?? "Dispatch team",
      actor: "Operations Lead",
      sentinelRecommendationId: "Dispatch Guest Services",
      incidentPackage: {
        ...incidentPackage,
        incident: {
          ...incidentPackage.incident,
          approvedActionIds: [`${incidentPackage.incident.id}-action-0`],
          status: "actioned",
        },
      },
    });

    expect(result.timelineEntry.type).toBe("approved");
    expect(result.dispatchDocument.source).toBe("sentinel");
    expect(result.dispatchDocument.recommendedActionId).toBe("Dispatch Guest Services");
    expect(result.memoryDocument.incidentId).toBe(incidentPackage.incident.id);
    expect(result.memoryDocument.source).toBe("timeline_write_route");
  });
});
