import { describe, expect, it } from "vitest";
import venueJson from "@/fixtures/harborline-park.json";
import { analyzeVenue } from "@/engine/analyze";
import { applyScenario } from "@/engine/graph";
import type { ScenarioPatch, VenueModel } from "@/engine/types";
import { validateVenueDocument } from "@/engine/validation";

const parsed = validateVenueDocument(venueJson);
const baseVenue = parsed.model!;

function reachablePairs(result: ReturnType<typeof analyzeVenue>): Set<string> {
  const pairs = new Set<string>();
  for (const origin of result.reachability.occupiedOrigins) {
    for (const exitId of origin.reachableExitIds) {
      pairs.add(`${origin.originId}>${exitId}`);
    }
  }
  return pairs;
}

describe("monotonicity: closures never increase reachability", () => {
  it("closing any single edge never adds a reachable origin-exit pair", () => {
    const baseline = analyzeVenue(baseVenue, null);
    const baselinePairs = reachablePairs(baseline);

    for (const edge of baseVenue.edges) {
      const scenario: ScenarioPatch = {
        schemaVersion: "1",
        id: `mono-${edge.id}`,
        name: edge.id,
        operations: [{ op: "disableEdge", edgeId: edge.id }],
      };
      const result = analyzeVenue(baseVenue, scenario);
      const pairs = reachablePairs(result);
      for (const pair of pairs) {
        expect(baselinePairs.has(pair), `edge ${edge.id} added reachability pair ${pair}`).toBe(
          true,
        );
      }
      expect(result.reachability.reachablePopulation).toBeLessThanOrEqual(
        baseline.reachability.reachablePopulation,
      );
    }
  });

  it("closing any occupied or connector node never adds reachability", () => {
    const baseline = analyzeVenue(baseVenue, null);
    const baselinePairs = reachablePairs(baseline);

    for (const node of baseVenue.nodes) {
      if (node.type !== "section" && node.type !== "concourse") continue;
      const scenario: ScenarioPatch = {
        schemaVersion: "1",
        id: `mono-node-${node.id}`,
        name: node.id,
        operations: [{ op: "closeNode", nodeId: node.id }],
      };
      const result = analyzeVenue(baseVenue, scenario);
      for (const pair of reachablePairs(result)) {
        expect(baselinePairs.has(pair), `node ${node.id} added pair ${pair}`).toBe(true);
      }
    }
  });

  it("clearance time is NOT asserted monotonic under closures — documented non-invariant", () => {
    // Harborline demonstrates why: the east tunnel is a constriction, so removing it
    // REDUCES simulated clearance (queue dissipation beats lost proximity).
    const closedTunnel: ScenarioPatch = {
      schemaVersion: "1",
      id: "tunnel",
      name: "tunnel",
      operations: [{ op: "disableEdge", edgeId: "e-tunnel-east" }],
    };
    const baseline = analyzeVenue(baseVenue, null);
    const result = analyzeVenue(baseVenue, closedTunnel);
    expect(result.simulation.clearanceSeconds).toBeLessThan(baseline.simulation.clearanceSeconds);
    // …while theoretical flow can only drop or stay equal here.
    expect(result.flow.maxFlowPerMinute).toBeLessThanOrEqual(baseline.flow.maxFlowPerMinute);
  });
});

describe("scenario application semantics", () => {
  it("never mutates the base model", () => {
    const before = JSON.stringify(baseVenue);
    applyScenario(baseVenue, {
      schemaVersion: "1",
      id: "x",
      name: "X",
      operations: [
        { op: "scaleEdgeCapacity", edgeId: "e-tunnel-east", factor: 0.25 },
        { op: "setNodeOccupancy", nodeId: "sec-e", occupancy: 42 },
        { op: "closeNode", nodeId: "gate-east" },
      ],
    });
    expect(JSON.stringify(baseVenue)).toBe(before);
  });

  it("rounds scaled occupancy half-up and isolates populations cut off by a closed hub", () => {
    const venue: VenueModel = JSON.parse(JSON.stringify(baseVenue));

    // Half-up rounding of scaled occupancy: 101 * 0.5 = 50.5 -> 51.
    const rounded = applyScenario(venue, {
      schemaVersion: "1",
      id: "round",
      name: "Round",
      operations: [
        { op: "setNodeOccupancy", nodeId: "sec-e", occupancy: 101 },
        { op: "scaleNodeOccupancy", nodeId: "sec-e", factor: 0.5 },
      ],
    });
    expect(rounded.nodes.find((n) => n.id === "sec-e")?.occupancy).toBe(51);

    // Closing con-east cuts sec-e's only connector (e-spoke-e); its 1,500 people are
    // reported as isolated rather than hidden.
    const scenario: ScenarioPatch = {
      schemaVersion: "1",
      id: "close-con-east",
      name: "Close East Concourse",
      operations: [{ op: "closeNode", nodeId: "con-east" }],
    };
    const result = analyzeVenue(JSON.parse(JSON.stringify(baseVenue)), scenario);
    expect(result.reachability.isolatedOriginIds).toEqual(["sec-e"]);
    expect(result.reachability.isolatedPopulation).toBe(1500);
  });

  it("isolates populations when their final connector disappears", () => {
    const venue: VenueModel = JSON.parse(JSON.stringify(baseVenue));
    const bothEastLinks: ScenarioPatch = {
      schemaVersion: "1",
      id: "cut-east",
      name: "Cut east links",
      operations: [
        { op: "disableEdge", edgeId: "e-spoke-ne-e" },
        { op: "disableEdge", edgeId: "e-spoke-e" },
        { op: "disableEdge", edgeId: "e-spoke-se-e" },
        { op: "disableEdge", edgeId: "e-ring-es" },
        { op: "disableEdge", edgeId: "e-ring-ne" },
        { op: "disableEdge", edgeId: "e-stair-ne-1" },
      ],
    };
    const result = analyzeVenue(venue, bothEastLinks);
    // sec-e's only link was e-spoke-e -> now isolated.
    expect(result.reachability.isolatedOriginIds).toContain("sec-e");
    expect(result.reachability.isolatedPopulation).toBeGreaterThan(0);
  });
});
