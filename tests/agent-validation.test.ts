import { describe, expect, it } from "vitest";

import { buildDeterministicAgentState } from "@/lib/agent/deterministic";
import { validateAgentResponse } from "@/lib/agent/validate";

const baseline = buildDeterministicAgentState(
  "Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.",
);

describe("validateAgentResponse", () => {
  it("accepts a valid strict-json payload and repairs location ids from labels", () => {
    const validated = validateAgentResponse(
      JSON.stringify({
        incidents: [
          {
            id: "incident-section-112",
            title: "Guest needs wheelchair access near Section 112",
            queueTitle: "Section 112 assist",
            severity: "Immediate",
            locationId: "unknown",
            locationLabel: "Sec 112",
            venueLayer: "Stands",
            team: "Guest Services",
            riskTags: ["Accessibility critical", "Crowd-flow risk"],
            recommendedActions: [
              "Dispatch Guest Services to Section 112",
              "Route via east-side aisles",
            ],
            priorityRationale: "Prompt response keeps the access path clear.",
            evidence: ["Guest reported need for wheelchair access"],
          },
          {
            id: "incident-elevator-4",
            title: "Elevator 4 down",
            queueTitle: "Elevator 4 down",
            severity: "High",
            locationId: "elevator-4",
            locationLabel: "Elevator 4",
            venueLayer: "Concourse",
            team: "Facilities",
            riskTags: ["Accessibility critical"],
            recommendedActions: ["Send Facilities to Elevator 4 for diagnosis"],
            priorityRationale: "Vertical access is degraded.",
            evidence: ["Facilities requested immediate access"],
          },
          {
            id: "incident-gate-b",
            title: "Gate B backed up",
            queueTitle: "Gate B backed up",
            severity: "High",
            locationId: "gate-b",
            locationLabel: "Gate B",
            venueLayer: "Perimeter",
            team: "Security",
            riskTags: ["Crowd-flow risk"],
            recommendedActions: ["Dispatch Crowd Flow Lead to Gate B"],
            priorityRationale: "Queue pressure is spreading into ingress lanes.",
            evidence: ["Queue extended into the plaza"],
          },
        ],
        latestUpdate: "Guest Services notified via radio.",
        reportSummary: "Incidents triaged and dispatched.",
      }),
      baseline.incidentPackages,
    );

    expect(validated.incidents).toHaveLength(3);
    expect(validated.incidents[0]?.locationId).toBe("section-112");
    expect(validated.latestUpdate).toBe("Guest Services notified via radio.");
  });

  it("rejects invalid severity values", () => {
    expect(() =>
      validateAgentResponse(
        JSON.stringify({
          incidents: [
            {
              id: "incident-section-112",
              title: "Guest needs wheelchair access near Section 112",
              queueTitle: "Section 112 assist",
              severity: "Critical",
              locationId: "section-112",
              locationLabel: "Section 112",
              venueLayer: "Stands",
              team: "Guest Services",
              riskTags: ["Accessibility critical"],
              recommendedActions: ["Dispatch Guest Services"],
              priorityRationale: "Prompt response is required.",
              evidence: ["Guest reported need for wheelchair access"],
            },
            {
              id: "incident-elevator-4",
              title: "Elevator 4 down",
              queueTitle: "Elevator 4 down",
              severity: "High",
              locationId: "elevator-4",
              locationLabel: "Elevator 4",
              venueLayer: "Concourse",
              team: "Facilities",
              riskTags: ["Accessibility critical"],
              recommendedActions: ["Send Facilities"],
              priorityRationale: "Vertical access is degraded.",
              evidence: ["Facilities requested immediate access"],
            },
            {
              id: "incident-gate-b",
              title: "Gate B backed up",
              queueTitle: "Gate B backed up",
              severity: "High",
              locationId: "gate-b",
              locationLabel: "Gate B",
              venueLayer: "Perimeter",
              team: "Security",
              riskTags: ["Crowd-flow risk"],
              recommendedActions: ["Dispatch Crowd Flow Lead"],
              priorityRationale: "Queue pressure is spreading.",
              evidence: ["Queue extended into the plaza"],
            },
          ],
          latestUpdate: "Guest Services notified via radio.",
          reportSummary: "Incidents triaged and dispatched.",
        }),
        baseline.incidentPackages,
      ),
    ).toThrow(/Invalid incident\.severity/);
  });

  it("rejects count and id mismatches", () => {
    expect(() =>
      validateAgentResponse(
        JSON.stringify({
          incidents: [
            {
              id: "incident-section-112",
              title: "Guest needs wheelchair access near Section 112",
              queueTitle: "Section 112 assist",
              severity: "Immediate",
              locationId: "section-112",
              locationLabel: "Section 112",
              venueLayer: "Stands",
              team: "Guest Services",
              riskTags: ["Accessibility critical"],
              recommendedActions: ["Dispatch Guest Services"],
              priorityRationale: "Prompt response is required.",
              evidence: ["Guest reported need for wheelchair access"],
            },
          ],
          latestUpdate: "Guest Services notified via radio.",
          reportSummary: "Incidents triaged and dispatched.",
        }),
        baseline.incidentPackages,
      ),
    ).toThrow(/length must match/);
  });

  it("rejects unknown locations when they cannot be repaired", () => {
    expect(() =>
      validateAgentResponse(
        JSON.stringify({
          incidents: baseline.incidentPackages.map(({ incident }) => ({
            id: incident.id,
            title: incident.title,
            queueTitle: incident.title,
            severity: incident.priority,
            locationId: "unknown-location",
            locationLabel: "Unknown location",
            venueLayer: "Concourse",
            team: "Operations",
            riskTags: ["Operational risk"],
            recommendedActions: ["Dispatch team"],
            priorityRationale: "Operational issue requires response.",
            evidence: ["Staff note"],
          })),
          latestUpdate: "Operations acknowledged.",
          reportSummary: "Incidents triaged and dispatched.",
        }),
        baseline.incidentPackages,
      ),
    ).toThrow(/Unknown location/);
  });
});
