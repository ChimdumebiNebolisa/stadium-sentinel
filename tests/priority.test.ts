import { describe, expect, it } from "vitest";

import { comparePriority, derivePriority } from "@/lib/priority";
import type { Incident } from "@/lib/types";

describe("priority routing", () => {
  it("assigns rule-based priorities without numeric scoring", () => {
    const elevator = derivePriority({
      incidentType: "facility-outage",
      category: "facility-outage",
      location: {
        type: "elevator",
        zoneLayer: "concourse",
        accessibilityCritical: true,
        crowdFlowCritical: true,
        restrictedAccess: false,
      },
    });
    const accessibility = derivePriority({
      incidentType: "accessibility-assist",
      category: "guest-assistance",
      location: {
        type: "section",
        zoneLayer: "bowl",
        accessibilityCritical: true,
        crowdFlowCritical: true,
        restrictedAccess: false,
      },
    });
    const queue = derivePriority({
      incidentType: "queue-congestion",
      category: "crowd-flow",
      location: {
        type: "gate",
        zoneLayer: "perimeter",
        accessibilityCritical: true,
        crowdFlowCritical: true,
        restrictedAccess: false,
      },
    });

    expect(accessibility).toBe("Immediate");
    expect(elevator).toBe("High");
    expect(queue).toBe("High");
  });

  it("assigns monitor to a non-urgent bowl issue", () => {
    const bowlIssue = derivePriority({
      incidentType: "facility-outage",
      category: "facility-outage",
      location: {
        type: "suite",
        zoneLayer: "bowl",
        accessibilityCritical: false,
        crowdFlowCritical: false,
        restrictedAccess: false,
      },
    });

    expect(bowlIssue).toBe("Monitor");
  });

  it("defaults to moderate when no higher operational rule applies", () => {
    const fallback = derivePriority({
      incidentType: "facility-outage",
      category: "facility-outage",
      location: {
        type: "amenity",
        zoneLayer: "concourse",
        accessibilityCritical: false,
        crowdFlowCritical: false,
        restrictedAccess: false,
      },
    });

    expect(fallback).toBe("Moderate");
  });

  it("sorts by operational priority and stable incident precedence", () => {
    const incidents = [
      {
        incidentType: "queue-congestion",
        priority: "High",
      },
      {
        incidentType: "facility-outage",
        priority: "High",
      },
      {
        incidentType: "accessibility-assist",
        priority: "Immediate",
      },
    ] satisfies Pick<Incident, "incidentType" | "priority">[];

    expect(incidents.sort(comparePriority)).toEqual([
      {
        incidentType: "accessibility-assist",
        priority: "Immediate",
      },
      {
        incidentType: "facility-outage",
        priority: "High",
      },
      {
        incidentType: "queue-congestion",
        priority: "High",
      },
    ]);
  });
});
