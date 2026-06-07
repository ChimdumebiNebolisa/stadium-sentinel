import { describe, expect, it } from "vitest";

import { buildDemoState } from "@/lib/demo";
import { resolveSelectedIncidentId } from "@/lib/demo-flow-state";
import { localStorageIncidentToPackage } from "@/lib/demo-incident-pool";

describe("demo flow state", () => {
  it("keeps the current selection when the incident remains in the queue", () => {
    const demo = buildDemoState();

    expect(
      resolveSelectedIncidentId(demo.incidentPackages, "incident-gate-b"),
    ).toBe("incident-gate-b");
  });

  it("falls back to the top incident when the current selection is no longer active", () => {
    const demo = buildDemoState();
    const gateOnly = demo.incidentPackages.filter(
      ({ incident }) => incident.id === "incident-gate-b",
    );

    expect(resolveSelectedIncidentId(gateOnly, "incident-elevator-4")).toBe(
      "incident-gate-b",
    );
  });

  it("falls back to the first package when the selection is empty", () => {
    const demo = buildDemoState();

    expect(resolveSelectedIncidentId(demo.incidentPackages, "")).toBe(
      demo.incidentPackages[0]?.incident.id,
    );
  });

  it("preserves selection across a matched-only transcript queue update", () => {
    const demo = buildDemoState();

    expect(
      resolveSelectedIncidentId(demo.incidentPackages, "incident-elevator-4"),
    ).toBe("incident-elevator-4");
  });

  it("selects the top priority incident when a pull batch drops the current selection", () => {
    const demo = buildDemoState();
    const restroom = localStorageIncidentToPackage({
      id: "incident-restroom-outage",
      title: "Restroom out of order",
      priority: "Moderate",
      incidentType: "facility-outage",
      category: "facility-outage",
      team: "Facilities",
      location: "West Concourse",
      status: "new",
      summary: "West Concourse restroom facility is out of service.",
      evidence: [],
      timeline: [],
    });
    const pulledBatch = [demo.incidentPackages[0]!, restroom];

    expect(
      resolveSelectedIncidentId(pulledBatch, "incident-restroom-outage"),
    ).toBe("incident-restroom-outage");
    expect(
      resolveSelectedIncidentId(pulledBatch, "incident-gate-b"),
    ).toBe(demo.incidentPackages[0]?.incident.id);
  });
});
