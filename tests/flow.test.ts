import { describe, expect, it } from "vitest";
import { analyzeVenue } from "@/engine/analyze";
import type { ScenarioPatch, VenueModel } from "@/engine/types";

function chainVenue(caps: number[]): VenueModel {
  const nodes: VenueModel["nodes"] = [
    { id: "sec", label: "Origin", type: "section", occupancy: caps.reduce((a, b) => a + b, 0), x: 0, y: 0 },
  ];
  const edges: VenueModel["edges"] = [];
  let prev = "sec";
  caps.forEach((cap, i) => {
    const isLast = i === caps.length - 1;
    const id = isLast ? "gate" : `j${i}`;
    if (!isLast) {
      nodes.push({ id, label: id.toUpperCase(), type: "corridor", x: i + 1, y: 0 });
    } else {
      nodes.push({ id, label: "Exit", type: "gate", x: caps.length, y: 0 });
    }
    edges.push({
      id: `e${i}`,
      from: prev,
      to: id,
      travelTimeSeconds: 10,
      capacityPerMinute: cap,
    });
    prev = id;
  });
  return { schemaVersion: "1", id: "flow-fixture", name: "Flow Fixture", nodes, edges };
}

describe("max-flow and min-cut (known answers)", () => {
  it("series chain: max flow equals the minimum capacity", () => {
    // 300 - 700 - 500 -> bottleneck 300
    const venue = chainVenue([300, 700, 500]);
    const result = analyzeVenue(venue, null);
    expect(result.flow.maxFlowPerMinute).toBe(300);
    expect(result.flow.minCut.arcRefs).toEqual([{ kind: "edge", edgeId: "e0" }]);
  });

  it("parallel paths share load until a shared downstream arc binds", () => {
    // Inflow capacity 1300 (three parallel arcs); the shared mid->gate arc binds at 1000.
    const venue = makeParallelVenue();
    const result = analyzeVenue(venue, null);
    expect(result.flow.maxFlowPerMinute).toBe(1000);
    const cutEdges = result.flow.minCut.arcRefs.map((r) => (r.kind === "edge" ? r.edgeId : "?"));
    expect(cutEdges).toContain("e-out");
  });

  it("two exits with asymmetric gate capacities produce exact per-exit throughput", () => {
    const venue = makeParallelVenue();
    // Add a second, weaker exit branch off mid. Inflow capacity is 1300 (400+500+400),
    // exactly matching combined exit capacity (1000+300), so both exits saturate.
    venue.nodes.push({ id: "gate-b", label: "Exit B", type: "gate", x: 90, y: 90 });
    venue.edges.push({ id: "e-mb", from: "mid", to: "gate-b", travelTimeSeconds: 10, capacityPerMinute: 300 });
    const result = analyzeVenue(venue, null);
    expect(result.flow.maxFlowPerMinute).toBe(1300);
    const byId = new Map(result.flow.perExitThroughput.map((t) => [t.exitId, t.flowPerMinute]));
    expect(byId.get("gate")).toBe(1000);
    expect(byId.get("gate-b")).toBe(300);
  });

  it("closing an exit removes exactly its saturated contribution", () => {
    const venue = makeParallelVenue();
    venue.nodes.push({ id: "gate-b", label: "Exit B", type: "gate", x: 90, y: 90 });
    venue.edges.push({ id: "e-mb", from: "mid", to: "gate-b", travelTimeSeconds: 10, capacityPerMinute: 300 });
    const scenario: ScenarioPatch = {
      schemaVersion: "1",
      id: "close-b",
      name: "Close B",
      operations: [{ op: "closeNode", nodeId: "gate-b" }],
    };
    const baselineWithB = analyzeVenue(venue, null);
    const result = analyzeVenue(venue, scenario);
    expect(baselineWithB.flow.maxFlowPerMinute).toBe(1300);
    expect(result.flow.maxFlowPerMinute).toBe(1000);
    // Criticality is reported by the run that still contains the element.
    expect(
      baselineWithB.flow.criticality.find((c) => c.kind === "exit" && c.refId === "gate-b")
        ?.deltaMaxFlow,
    ).toBe(300);
  });

  it("node capacity splitting binds flow when the declared stock is the minimum", () => {
    const venue = chainVenue([1000, 1000]);
    // Give the middle corridor node a tiny stock: 150 people/minute-equivalent.
    const middle = venue.nodes.find((n) => n.id === "j0")!;
    middle.capacity = 150;
    const result = analyzeVenue(venue, null);
    expect(result.flow.maxFlowPerMinute).toBe(150);
    const cutKinds = result.flow.minCut.arcRefs.map((r) => r.kind);
    expect(cutKinds).toContain("nodeCapacity");
    const nodeCut = result.flow.minCut.arcRefs.find((r) => r.kind === "nodeCapacity");
    expect(nodeCut && nodeCut.nodeId).toBe("j0");
  });

  it("directed edges do not create reverse capacity", () => {
    // sec -> mid (directed 400); mid has no other way out except gate (directed mid->gate).
    const venue: VenueModel = {
      schemaVersion: "1",
      id: "dir-flow",
      name: "Directed Flow",
      nodes: [
        { id: "sec", label: "S", type: "section", occupancy: 800, x: 0, y: 0 },
        { id: "mid", label: "M", type: "concourse", x: 5, y: 0 },
        { id: "gate", label: "G", type: "gate", x: 10, y: 0 },
      ],
      edges: [
        { id: "e-sm", from: "sec", to: "mid", directed: true, travelTimeSeconds: 5, capacityPerMinute: 400 },
        { id: "e-mg", from: "mid", to: "gate", directed: true, travelTimeSeconds: 5, capacityPerMinute: 400 },
      ],
    };
    const result = analyzeVenue(venue, null);
    expect(result.flow.maxFlowPerMinute).toBe(400);
  });

  it("removing a zero-flow edge never changes max flow", () => {
    const venue = makeParallelVenue();
    // A useless side branch to a refuge leaf.
    venue.nodes.push({ id: "refuge", label: "Refuge", type: "refuge", x: 50, y: 90 });
    venue.edges.push({ id: "e-refuge", from: "mid", to: "refuge", travelTimeSeconds: 1, capacityPerMinute: 999 });
    const baseline = analyzeVenue(makeParallelVenue(), null);
    const withRefuge = analyzeVenue(venue, null);
    expect(withRefuge.flow.maxFlowPerMinute).toBe(baseline.flow.maxFlowPerMinute);
    expect(withRefuge.flow.flowByEdgeId["e-refuge"]).toBeUndefined();
  });

  it("criticality deltas respect the binding constraint", () => {
    // Baseline max flow 1000 is bound by e-out. Removing e-a leaves inflow 900, so the
    // delta is 100; removing the larger e-b leaves 800, so the delta is 200.
    const venue = makeParallelVenue();
    const result = analyzeVenue(venue, null);
    const criticality = new Map(result.flow.criticality.map((c) => [c.refId, c.deltaMaxFlow]));
    expect(criticality.get("e-a")).toBe(100);
    expect(criticality.get("e-b")).toBe(200);
    expect(result.flow.criticality.find((c) => c.refId === "gate")?.deltaMaxFlow).toBe(1000);
  });
});

/** diamond: sec -> (mid via three parallel arcs 400+500+400) -> gate (1000) */
function makeParallelVenue(): VenueModel {
  return {
    schemaVersion: "1",
    id: "parallel",
    name: "Parallel",
    nodes: [
      { id: "sec", label: "S", type: "section", occupancy: 3000, x: 0, y: 0 },
      { id: "mid", label: "M", type: "concourse", x: 5, y: 0 },
      { id: "gate", label: "G", type: "gate", x: 10, y: 0 },
    ],
    edges: [
      { id: "e-a", from: "sec", to: "mid", travelTimeSeconds: 10, capacityPerMinute: 400 },
      { id: "e-b", from: "sec", to: "mid", travelTimeSeconds: 12, capacityPerMinute: 500 },
      { id: "e-c", from: "sec", to: "mid", travelTimeSeconds: 11, capacityPerMinute: 400 },
      { id: "e-out", from: "mid", to: "gate", travelTimeSeconds: 5, capacityPerMinute: 1000 },
    ],
  };
}
