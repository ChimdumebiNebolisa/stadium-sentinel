import { describe, expect, it } from "vitest";
import tunnelClosedJson from "@/fixtures/east-tunnel-closed.json";
import venueJson from "@/fixtures/harborline-park.json";
import { analyzeVenue } from "@/engine/analyze";
import { compareResults } from "@/engine/compare";
import type { EffectiveConfig } from "@/engine/types";
import {
  validateScenarioDocument,
  validateVenueDocument,
} from "@/engine/validation";

const venue = validateVenueDocument(venueJson).model!;
const tunnelScenario = validateScenarioDocument(tunnelClosedJson).scenario!;

describe("Harborline Park fixture (hand-verified pins)", () => {
  it("baseline: routing assignments match the hand-computed least-time solution", () => {
    const result = analyzeVenue(venue, null);
    const byOrigin = new Map(result.reachability.occupiedOrigins.map((o) => [o.originId, o]));
    expect(byOrigin.get("sec-nw")?.assignedExitId).toBe("gate-west");
    expect(byOrigin.get("sec-ne")?.assignedExitId).toBe("gate-east");
    expect(byOrigin.get("sec-w")?.assignedExitId).toBe("gate-west");
    expect(byOrigin.get("sec-e")?.assignedExitId).toBe("gate-east");
    expect(byOrigin.get("sec-sw")?.assignedExitId).toBe("gate-west");
    expect(byOrigin.get("sec-se")?.assignedExitId).toBe("gate-east");
    expect(byOrigin.get("sec-e")?.routeCost).toBeCloseTo(100 / 3, 9);
    expect(result.reachability.isolatedPopulation).toBe(0);
  });

  it("baseline: max flow 3500 with exact per-exit throughput and the east tunnel in the min cut", () => {
    const result = analyzeVenue(venue, null);
    expect(result.flow.maxFlowPerMinute).toBe(3500);
    const byExit = new Map(result.flow.perExitThroughput.map((t) => [t.exitId, t.flowPerMinute]));
    expect(byExit.get("gate-north")).toBe(1200);
    expect(byExit.get("gate-south")).toBe(1200);
    expect(byExit.get("gate-west")).toBe(800);
    expect(byExit.get("gate-east")).toBe(300);
    const cutEdges = result.flow.minCut.arcRefs.map((r) =>
      r.kind === "edge" ? r.edgeId : `capacity(${r.nodeId})`,
    );
    expect(cutEdges).toContain("e-tunnel-east");
  });

  it("baseline: clearance simulation completes with conservation (7500 people)", () => {
    const result = analyzeVenue(venue, null);
    expect(result.simulation.status).toBe("completed");
    expect(result.simulation.simulatedPopulation).toBe(7500);
    expect(result.simulation.evacuated).toBe(7500);
    const tunnelArcs = result.simulation.arcStats.filter((s) => s.edgeId === "e-tunnel-east");
    const tunnelFlow = tunnelArcs.reduce((sum, s) => sum + s.totalFlow, 0);
    // sec-ne + sec-e + sec-se all route through the tunnel at baseline.
    expect(tunnelFlow).toBe(4200);
    const minutes = result.simulation.clearanceSeconds / 60;
    expect(tunnelFlow).toBeLessThanOrEqual(300 * minutes + 2);
  });

  it("east-tunnel-closed: flow drops exactly by the tunnel capacity and three origins reroute", () => {
    const baselineResult = analyzeVenue(venue, null);
    const result = analyzeVenue(venue, tunnelScenario);
    expect(result.flow.maxFlowPerMinute).toBe(3200);

    const comparison = compareResults(baselineResult, result);
    expect(comparison.routeChanges.map((c) => c.originId).sort()).toEqual([
      "sec-e",
      "sec-ne",
      "sec-se",
    ]);
    const changedToNorth = comparison.routeChanges.filter(
      (c) => c.scenarioExitId === "gate-north",
    ).length;
    expect(changedToNorth).toBe(2);
    expect(comparison.rows.find((r) => r.field === "estimatedClearanceTime")!.delta).toBeLessThan(0);
  });

  it("reduce-east-tunnel-half: theoretical flow partially preserved, clearance worsens vs closure", () => {
    const halfCapacity = validateScenarioDocument({
      schemaVersion: "1",
      id: "half",
      name: "Half",
      operations: [{ op: "scaleEdgeCapacity", edgeId: "e-tunnel-east", factor: 0.5 }],
    }).scenario!;

    const baselineResult = analyzeVenue(venue, null);
    const reduced = analyzeVenue(venue, halfCapacity);
    expect(reduced.flow.maxFlowPerMinute).toBe(3350);
    expect(reduced.simulation.clearanceSeconds).toBeGreaterThan(
      baselineResult.simulation.clearanceSeconds,
    );

    // The ring preserves some theoretical flow even though simulated queueing worsens:
    // max-flow is a network ceiling; the simulation routes along least-time paths only.
    expect(reduced.flow.maxFlowPerMinute).toBeGreaterThan(
      analyzeVenue(venue, tunnelScenario).flow.maxFlowPerMinute,
    );
  });

  it("step-free traversal excludes stair connectors", () => {
    const overrides: Partial<EffectiveConfig> = { requireStepFreeTraversal: true };
    const result = analyzeVenue(venue, null, overrides);
    // sec-ne loses its stair alternative but keeps e-spoke-ne-e, so nothing isolates.
    expect(result.reachability.isolatedPopulation).toBe(0);
    for (const stat of result.simulation.arcStats) {
      expect(stat.edgeId.startsWith("e-stair")).toBe(false);
    }
  });
});
