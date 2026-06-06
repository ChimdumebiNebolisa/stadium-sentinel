import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/agent/vertex", () => ({
  generateVertexStructuredResponse: vi.fn(),
  isVertexConfigured: vi.fn(() => true),
}));

import { buildDeterministicAgentState } from "@/lib/agent/deterministic";
import { maybeGenerateAgentRefinement } from "@/lib/agent/gemini";
import { generateVertexStructuredResponse } from "@/lib/agent/vertex";

const report =
  "Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.";

describe("maybeGenerateAgentRefinement", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: "development" };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("falls back safely when Gemini returns invalid JSON", async () => {
    const baseline = buildDeterministicAgentState(report);

    vi.mocked(generateVertexStructuredResponse).mockResolvedValue("not-json");

    const result = await maybeGenerateAgentRefinement({
      incidentPackages: baseline.incidentPackages,
      report,
      retrieval: {
        playbooks: [],
        locations: [],
        incidentExamples: [],
        evidence: [],
        mode: "local",
      },
    });

    expect(result.mode).toBe("fallback");
    expect(result.incidentPackages).toEqual(baseline.incidentPackages);
  });

  it("falls back when Gemini tries to change the deterministic incident ids", async () => {
    const baseline = buildDeterministicAgentState(report);

    vi.mocked(generateVertexStructuredResponse).mockResolvedValue(
      JSON.stringify({
        incidents: baseline.incidentPackages.map(({ incident }, index) => ({
          id: index === 0 ? "changed-id" : incident.id,
          title: incident.title,
          queueTitle: incident.title,
          severity: incident.priority,
          locationId: incident.locationId,
          locationLabel: incident.locationLabel,
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
    );

    const result = await maybeGenerateAgentRefinement({
      incidentPackages: baseline.incidentPackages,
      report,
      retrieval: {
        playbooks: [],
        locations: [],
        incidentExamples: [],
        evidence: [],
        mode: "local",
      },
    });

    expect(result.mode).toBe("fallback");
    expect(result.incidentPackages).toEqual(baseline.incidentPackages);
  });
});
