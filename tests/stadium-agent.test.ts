import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/evidence", () => ({
  retrieveAgentContext: vi.fn(),
}));

vi.mock("@/lib/agent/gemini", () => ({
  maybeGenerateAgentRefinement: vi.fn(),
}));

import { buildDeterministicAgentState } from "@/lib/agent/deterministic";
import { maybeGenerateAgentRefinement } from "@/lib/agent/gemini";
import { runStadiumAgent } from "@/lib/agent/stadium-agent";
import { retrieveAgentContext } from "@/lib/evidence";

const report =
  "Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.";

describe("runStadiumAgent", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("keeps the three-incident demo flow and categorical priorities", async () => {
    const result = await runStadiumAgent(report);

    expect(result.incidentPackages).toHaveLength(3);
    expect(result.incidentPackages.map(({ incident }) => incident.priority)).toEqual([
      "Immediate",
      "High",
      "High",
    ]);
    expect(result.meta.retrievalMode).toBe("local");
    expect(result.meta.geminiMode).toBe("fallback");
  });

  it("does not return score, confidence, or severity fields in incident evidence or actions", async () => {
    const result = await runStadiumAgent(report);
    const serialized = JSON.stringify(result);

    expect(serialized).not.toMatch(/severityScore/);
    expect(serialized).not.toMatch(/severityLabel/);
    expect(serialized).not.toMatch(/confidence/);
    expect(serialized).not.toMatch(/"score"/);
  });

  it("returns the deterministic baseline when the agent backend is disabled", async () => {
    process.env.AGENT_BACKEND_ENABLED = "false";

    const result = await runStadiumAgent(report);

    expect(vi.mocked(retrieveAgentContext)).not.toHaveBeenCalled();
    expect(vi.mocked(maybeGenerateAgentRefinement)).not.toHaveBeenCalled();
    expect(result.meta).toEqual({
      retrievalMode: "local",
      geminiMode: "fallback",
      elasticMcpMode: "unused",
    });
  });

  it("keeps the deterministic result when the agent backend falls back after local retrieval", async () => {
    process.env.AGENT_BACKEND_ENABLED = "true";
    const baseline = buildDeterministicAgentState(report);

    vi.mocked(retrieveAgentContext).mockResolvedValue({
      playbooks: [],
      locations: [],
      incidentExamples: [],
      evidence: [],
      mode: "local",
    });
    vi.mocked(maybeGenerateAgentRefinement).mockResolvedValue({
      incidentPackages: baseline.incidentPackages,
      mode: "fallback",
    });

    const result = await runStadiumAgent(report);

    expect(vi.mocked(retrieveAgentContext)).toHaveBeenCalledOnce();
    expect(vi.mocked(maybeGenerateAgentRefinement)).toHaveBeenCalledOnce();
    expect(result.meta.retrievalMode).toBe("local");
    expect(result.meta.geminiMode).toBe("fallback");
    expect(result.incidentPackages).toEqual(baseline.incidentPackages);
  });

  it("applies a live refinement without changing the parser-driven incident count", async () => {
    process.env.AGENT_BACKEND_ENABLED = "true";
    const baseline = buildDeterministicAgentState(report);
    const refinedIncidentPackages = baseline.incidentPackages.map((incidentPackage, index) =>
      index === 0
        ? {
            ...incidentPackage,
            incident: {
              ...incidentPackage.incident,
              recommendedActions: [
                "Dispatch Guest Services to Section 112",
                "Route via east-side aisles",
                "Confirm handoff over radio",
              ],
            },
            staffUpdate: "Guest Services notified via radio.",
          }
        : incidentPackage,
    );

    vi.mocked(retrieveAgentContext).mockResolvedValue({
      playbooks: [],
      locations: [],
      incidentExamples: [],
      evidence: [],
      mode: "elastic",
    });
    vi.mocked(maybeGenerateAgentRefinement).mockResolvedValue({
      incidentPackages: refinedIncidentPackages,
      mode: "live",
    });

    const result = await runStadiumAgent(report);

    expect(result.incidentPackages).toHaveLength(3);
    expect(result.meta.retrievalMode).toBe("elastic");
    expect(result.meta.geminiMode).toBe("live");
    expect(result.incidentPackages[0]?.incident.recommendedActions).toEqual([
      "Dispatch Guest Services to Section 112",
      "Route via east-side aisles",
      "Confirm handoff over radio",
    ]);
  });
});
