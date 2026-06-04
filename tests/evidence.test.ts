import { describe, expect, it } from "vitest";

import { retrieveOperationalEvidence } from "@/lib/evidence";

const report =
  "Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.";

describe("retrieveOperationalEvidence", () => {
  it("returns local fallback evidence for Gate B with the stable shape", async () => {
    const evidence = await retrieveOperationalEvidence({
      incidentTitle: "Gate B backed up",
      incidentCategory: "crowd-flow",
      locationName: "Gate B",
      priority: "High",
      reportText: report,
    });

    expect(evidence.length).toBeGreaterThan(0);
    expect(evidence.some((item) => item.sourceType === "policy")).toBe(true);
    expect(evidence.some((item) => item.sourceType === "runbook")).toBe(true);
    expect(evidence.some((item) => item.sourceType === "location")).toBe(true);
    expect(evidence[0]).toEqual({
      title: expect.any(String),
      sourceType: expect.any(String),
      excerpt: expect.any(String),
      rationale: expect.any(String),
      sourceId: expect.any(String),
    });
    expect("score" in evidence[0]).toBe(false);
    expect("confidence" in evidence[0]).toBe(false);
  });

  it("covers Elevator 4 outage retrieval with facilities and accessible route evidence", async () => {
    const evidence = await retrieveOperationalEvidence({
      incidentTitle: "Elevator 4 down",
      incidentCategory: "facility-outage",
      locationName: "Elevator 4",
      priority: "High",
      reportText: report,
    });

    expect(evidence.some((item) => item.title.includes("Elevator 4"))).toBe(true);
    expect(
      evidence.some((item) => /facilities response|Facilities Engineer/i.test(item.excerpt)),
    ).toBe(true);
    expect(
      evidence.some((item) => /accessible route/i.test(item.excerpt)),
    ).toBe(true);
  });

  it("covers Section 112 wheelchair support retrieval with guest services evidence", async () => {
    const evidence = await retrieveOperationalEvidence({
      incidentTitle: "Guest needs wheelchair access near Section 112",
      incidentCategory: "guest-assistance",
      locationName: "Section 112",
      priority: "Immediate",
      reportText: report,
    });

    expect(evidence.some((item) => item.title.includes("Section 112"))).toBe(true);
    expect(
      evidence.some((item) => /Guest Services/i.test(item.title) || /guest services/i.test(item.excerpt)),
    ).toBe(true);
    expect(
      evidence.some((item) => /accessible route/i.test(item.excerpt)),
    ).toBe(true);
  });
});
