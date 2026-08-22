import { describe, expect, it } from "vitest";
import { analyzeVenue } from "@/engine/analyze";
import type { ScenarioPatch, VenueModel } from "@/engine/types";

/** Linear corridor: sec -e1-> gate; capacity c people/min, travel time tt. */
function linearVenue(capacityPerMinute: number, occupancy: number): VenueModel {
  return {
    schemaVersion: "1",
    id: "sim-linear",
    name: "Sim Linear",
    nodes: [
      { id: "sec", label: "S", type: "section", occupancy, x: 0, y: 0 },
      { id: "gate", label: "G", type: "gate", x: 10, y: 0 },
    ],
    edges: [
      { id: "e1", from: "sec", to: "gate", travelTimeSeconds: 0, capacityPerMinute },
    ],
  };
}

describe("clearance simulation invariants (known answers)", () => {
  it("discharges exactly capacity per minute and finishes when everyone is through", () => {
    // 60/min at dt=1s -> 1 person/step. 120 people -> 120 steps -> clearance 120s.
    const result = analyzeVenue(linearVenue(60, 120), null);
    expect(result.simulation.status).toBe("completed");
    expect(result.simulation.evacuated).toBe(120);
    expect(result.simulation.clearanceSeconds).toBe(120);

    const arc = result.simulation.arcStats[0]!;
    expect(arc.totalFlow).toBe(120);
  });

  it("respects declared capacity over the whole run (rate-cap invariant)", () => {
    const result = analyzeVenue(linearVenue(90, 450), null);
    const arc = result.simulation.arcStats[0]!;
    const minutes = result.simulation.clearanceSeconds / 60;
    expect(arc.totalFlow).toBeLessThanOrEqual(90 * minutes + 2); // integer-step tolerance
    expect(result.simulation.evacuated).toBe(450);
  });

  it("never reports negative queues or flows and conserves population", () => {
    // The engine throws on any invariant violation during simulateClearance; reaching a
    // result here means conservation held at every step.
    const venue = makeTwoExitAsymmetric();
    const result = analyzeVenue(venue, null);
    expect(result.simulation.evacuated).toBe(
      result.reachability.reachablePopulation,
    );
    for (const stat of result.simulation.arcStats) {
      expect(stat.totalFlow).toBeGreaterThanOrEqual(0);
      expect(stat.peakQueue).toBeGreaterThanOrEqual(0);
      expect(stat.saturationSeconds).toBeGreaterThanOrEqual(0);
    }
  });

  it("sends the whole origin population along its single assigned route", () => {
    const venue = makeTwoExitAsymmetric();
    const result = analyzeVenue(venue, null);
    const byExit = new Map(result.simulation.perExitEvacuated.map((e) => [e.exitId, e.people]));
    // Least-time routing assigns every person to the near exit (15s vs 45s).
    expect(byExit.get("gate-near")).toBe(600);
    expect(byExit.get("gate-far") ?? 0).toBe(0);
  });

  it("evacuates everyone eventually when reachability and sufficient capacity are guaranteed", () => {
    const venue = makeTwoExitAsymmetric();
    const result = analyzeVenue(venue, null);
    expect(result.simulation.status).toBe("completed");
    expect(result.simulation.evacuated).toBe(600);
    expect(result.reachability.isolatedPopulation).toBe(0);
  });

  it("gate closure reroutes or isolates the affected population", () => {
    const venue = makeTwoExitAsymmetric();
    const scenario: ScenarioPatch = {
      schemaVersion: "1",
      id: "close-near",
      name: "Close Near",
      operations: [{ op: "closeNode", nodeId: "gate-near" }],
    };
    const result = analyzeVenue(venue, scenario);
    // Far gate remains reachable via mid; everyone reroutes there.
    expect(result.reachability.isolatedPopulation).toBe(0);
    const byExit = new Map(result.simulation.perExitEvacuated.map((e) => [e.exitId, e.people]));
    expect(byExit.get("gate-far")).toBe(600);
    expect(result.simulation.clearanceSeconds).toBeGreaterThan(
      analyzeVenue(makeTwoExitAsymmetric(), null).simulation.clearanceSeconds,
    );
  });

  it("corridor closure forces the longer alternative route", () => {
    const venue = makeTwoExitAsymmetric();
    const scenario: ScenarioPatch = {
      schemaVersion: "1",
      id: "cut-short",
      name: "Cut Short",
      operations: [{ op: "disableEdge", edgeId: "e-to-near" }],
    };
    const result = analyzeVenue(venue, scenario);
    const byExit = new Map(result.simulation.perExitEvacuated.map((e) => [e.exitId, e.people]));
    expect(byExit.get("gate-far")).toBe(600);
  });

  it("capacity reduction lengthens clearance on the constrained path", () => {
    const baselineResult = analyzeVenue(linearVenue(120, 600), null);
    const reducedScenario: ScenarioPatch = {
      schemaVersion: "1",
      id: "half",
      name: "Half",
      operations: [{ op: "scaleEdgeCapacity", edgeId: "e1", factor: 0.5 }],
    };
    const reduced = analyzeVenue(linearVenue(120, 600), reducedScenario);
    expect(reduced.simulation.clearanceSeconds).toBeGreaterThan(
      baselineResult.simulation.clearanceSeconds,
    );
    expect(reduced.simulation.clearanceSeconds).toBe(600);
  });

  it("stops at the step limit with an explicit status instead of hanging", () => {
    const result = analyzeVenue(linearVenue(60, 100000), null, { maxSimulationSteps: 500 });
    expect(result.simulation.status).toBe("step-limit-reached");
    expect(result.simulation.clearanceSeconds).toBe(500);
  });
});

/**
 * sec (600) -> mid; mid -> gate-near (tt 10, cap 1200); mid -> gate-far (tt 40, cap 1200).
 */
function makeTwoExitAsymmetric(): VenueModel {
  return {
    schemaVersion: "1",
    id: "asym",
    name: "Asym Exits",
    nodes: [
      { id: "sec", label: "S", type: "section", occupancy: 600, x: 0, y: 50 },
      { id: "mid", label: "M", type: "concourse", x: 30, y: 50 },
      { id: "gate-near", label: "Near", type: "gate", x: 70, y: 20 },
      { id: "gate-far", label: "Far", type: "gate", x: 95, y: 80 },
    ],
    edges: [
      { id: "e-in", from: "sec", to: "mid", travelTimeSeconds: 5, capacityPerMinute: 2000 },
      { id: "e-to-near", from: "mid", to: "gate-near", travelTimeSeconds: 10, capacityPerMinute: 1200 },
      { id: "e-via-mid-far", from: "mid", to: "gate-far", travelTimeSeconds: 40, capacityPerMinute: 1200 },
    ],
  };
}
