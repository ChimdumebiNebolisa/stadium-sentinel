import { describe, expect, it } from "vitest";
import { analyzeVenue } from "@/engine/analyze";
import type { ScenarioPatch, VenueModel } from "@/engine/types";

function makeVenue(): VenueModel {
  return {
    schemaVersion: "1",
    id: "routing-fixture",
    name: "Routing Fixture",
    nodes: [
      { id: "sec", label: "Origin", type: "section", occupancy: 500, x: 10, y: 50 },
      { id: "mid-a", label: "Mid A", type: "concourse", x: 50, y: 20 },
      { id: "mid-b", label: "Mid B", type: "concourse", x: 50, y: 80 },
      { id: "gate-x", label: "Exit X", type: "gate", x: 90, y: 50 },
      { id: "gate-y", label: "Exit Y", type: "gate", x: 90, y: 80 },
    ],
    edges: [
      { id: "e-sa", from: "sec", to: "mid-a", travelTimeSeconds: 30, capacityPerMinute: 600 },
      { id: "e-sb", from: "sec", to: "mid-b", travelTimeSeconds: 30, capacityPerMinute: 600 },
      { id: "e-ax", from: "mid-a", to: "gate-x", travelTimeSeconds: 20, capacityPerMinute: 900 },
      { id: "e-bx", from: "mid-b", to: "gate-x", travelTimeSeconds: 20, capacityPerMinute: 900 },
      { id: "e-by", from: "mid-b", to: "gate-y", travelTimeSeconds: 5, capacityPerMinute: 3000 },
    ],
  };
}

describe("least-cost routing (known answers)", () => {
  it("single origin reaches its single exit via the unique shortest path", () => {
    const venue = makeVenue();
    venue.edges = venue.edges.filter((e) => !["e-sb", "e-by"].includes(e.id));
    const result = analyzeVenue(venue, null);
    const route = result.reachability.occupiedOrigins[0]!;
    expect(route.reachable).toBe(true);
    expect(route.assignedExitId).toBe("gate-x");
    expect(route.routeCost).toBe(50);
    expect(route.routePathNodeIds).toEqual(["sec", "mid-a", "gate-x"]);
  });

  it("breaks exact ties deterministically toward the lexicographically smaller node id", () => {
    // Remove gate-y so both branches must reach gate-x with identical totals (30+20).
    const venue = makeVenue();
    venue.edges = venue.edges.filter((e) => e.id !== "e-by");
    const result = analyzeVenue(venue, null);
    const route = result.reachability.occupiedOrigins[0]!;
    expect(route.routeCost).toBe(50);
    expect(route.routePathNodeIds).toEqual(["sec", "mid-a", "gate-x"]);
    expect(route.assignedExitId).toBe("gate-x");

    // Renaming the nodes inverts the winner while costs stay tied — proof the rule is
    // lexicographic and not structural accident.
    const renamed = makeVenue();
    renamed.edges = renamed.edges.filter((e) => e.id !== "e-by");
    const swap: Record<string, string> = { "mid-a": "m-zzz", "mid-b": "m-aaa" };
    renamed.nodes = renamed.nodes.map((n) => ({
      ...n,
      ...(swap[n.id] ? { id: swap[n.id] } : {}),
    }));
    renamed.edges = renamed.edges.map((e) => ({
      ...e,
      from: swap[e.from] ?? e.from,
      to: swap[e.to] ?? e.to,
    }));
    const result2 = analyzeVenue(renamed, null);
    expect(result2.reachability.occupiedOrigins[0]!.routePathNodeIds).toEqual([
      "sec",
      "m-aaa",
      "gate-x",
    ]);
  });

  it("prefers a nearer exit when several exist (asymmetric exits)", () => {
    const result = analyzeVenue(makeVenue(), null);
    // sec -> mid-b -> gate-y = 30 + 5 = 35 beats everything through gate-x (50).
    expect(result.reachability.occupiedOrigins[0]!.assignedExitId).toBe("gate-y");
    expect(result.reachability.occupiedOrigins[0]!.routeCost).toBe(35);
  });

  it("reports disconnected occupied origins as isolated with zero reachable exits", () => {
    const venue = makeVenue();
    venue.edges = venue.edges.filter((e) => e.id !== "e-sa" && e.id !== "e-sb");
    const result = analyzeVenue(venue, null);
    const route = result.reachability.occupiedOrigins[0]!;
    expect(route.reachable).toBe(false);
    expect(route.reachableExitIds).toHaveLength(0);
    expect(result.reachability.isolatedPopulation).toBe(500);
  });

  it("handles cyclic graphs and still finds the shortest path deterministically", () => {
    const venue = makeVenue();
    // Create a cycle between mid-a and mid-b.
    venue.edges.push({ id: "e-ab", from: "mid-a", to: "mid-b", travelTimeSeconds: 2, capacityPerMinute: 100 });
    const result = analyzeVenue(venue, null);
    // sec->mid-a->mid-b->gate-y = 30+2+5=37 beats sec->mid-b->gate-y = 35? No: 35 < 37.
    expect(result.reachability.occupiedOrigins[0]!.routeCost).toBe(35);
    expect(result.reachability.occupiedOrigins[0]!.routePathNodeIds).toEqual(["sec", "mid-b", "gate-y"]);
  });

  it("respects directed edges when computing routes", () => {
    const venue = makeVenue();
    venue.edges = venue.edges.map((e) =>
      e.id === "e-sa" ? { ...e, directed: true, from: "mid-a", to: "sec" } : e,
    );
    // The only remaining inbound edge into the origin network is e-sb; route must use it.
    const result = analyzeVenue(venue, null);
    expect(result.reachability.occupiedOrigins[0]!.routePathNodeIds).toContain("mid-b");
  });

  it("keeps least-time and least-distance metrics distinct and labeled", () => {
    const venue = makeVenue();
    venue.edges.push({
      id: "e-short-slow",
      from: "sec",
      to: "gate-x",
      distanceMeters: 10,
      travelTimeSeconds: 100,
      capacityPerMinute: 100,
    });
    const byTime = analyzeVenue(venue, null);
    expect(byTime.costMetric).toBe("time");
    expect(byTime.costUnit).toBe("seconds");
    expect(byTime.reachability.occupiedOrigins[0]!.assignedExitId).toBe("gate-y");

    const byDistance = analyzeVenue(venue, null, { costMetric: "distance" });
    expect(byDistance.costMetric).toBe("distance");
    expect(byDistance.costUnit).toBe("meters");
    // Distance metric picks the short-but-slow edge (10 m beats every alternative).
    expect(byDistance.reachability.occupiedOrigins[0]!.assignedExitId).toBe("gate-x");
  });

  it("derives travel time from distance at the configured walking speed", () => {
    const venue: VenueModel = {
      schemaVersion: "1",
      id: "speed-fixture",
      name: "Speed Fixture",
      nodes: [
        { id: "s", label: "S", type: "section", occupancy: 10, x: 0, y: 0 },
        { id: "g", label: "G", type: "gate", x: 10, y: 0 },
      ],
      edges: [{ id: "e", from: "s", to: "g", distanceMeters: 24, capacityPerMinute: 60 }],
    };
    const result = analyzeVenue(venue, null);
    expect(result.reachability.occupiedOrigins[0]!.routeCost).toBeCloseTo(24 / 1.2, 10);

    const fast = analyzeVenue(venue, null, { walkingSpeedMetersPerSecond: 2.4 });
    expect(fast.reachability.occupiedOrigins[0]!.routeCost).toBeCloseTo(10, 10);
  });

  it("recomputes routes under scenario closures", () => {
    const scenario: ScenarioPatch = {
      schemaVersion: "1",
      id: "close-e-sb",
      name: "Close e-sb",
      operations: [{ op: "disableEdge", edgeId: "e-sb" }],
    };
    const result = analyzeVenue(makeVenue(), scenario);
    const route = result.reachability.occupiedOrigins[0]!;
    expect(route.routePathNodeIds).toEqual(["sec", "mid-a", "gate-x"]);
    expect(route.routeCost).toBe(50);
  });
});
