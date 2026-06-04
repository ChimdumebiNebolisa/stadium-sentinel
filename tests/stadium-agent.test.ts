import { describe, expect, it } from "vitest";

import { runStadiumAgent } from "@/lib/agent/stadium-agent";

const report =
  "Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.";

describe("runStadiumAgent", () => {
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
});
