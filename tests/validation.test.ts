import { describe, expect, it } from "vitest";
import type { VenueModel } from "@/engine/types";
import {
  validateScenarioAgainstVenue,
  validateScenarioDocument,
  validateVenueDocument,
} from "@/engine/validation";

const validVenue: VenueModel = {
  schemaVersion: "1",
  id: "tiny",
  name: "Tiny Hall",
  nodes: [
    { id: "sec-a", label: "Section A", type: "section", occupancy: 100, x: 20, y: 40 },
    { id: "con", label: "Concourse", type: "concourse", x: 50, y: 40 },
    { id: "gate-x", label: "Exit X", type: "gate", x: 80, y: 40 },
  ],
  edges: [
    { id: "e1", from: "sec-a", to: "con", distanceMeters: 30, capacityPerMinute: 300 },
    { id: "e2", from: "con", to: "gate-x", travelTimeSeconds: 10, capacityPerMinute: 600 },
  ],
};

function firstError(raw: unknown): string | undefined {
  const { diagnostics } = validateVenueDocument(raw);
  return diagnostics.find((d) => d.severity === "error")?.code;
}

function cloneVenue(): VenueModel {
  return JSON.parse(JSON.stringify(validVenue)) as VenueModel;
}

describe("venue validation", () => {
  it("accepts a well-formed venue", () => {
    const { model, diagnostics } = validateVenueDocument(validVenue);
    expect(diagnostics.filter((d) => d.severity === "error")).toHaveLength(0);
    expect(model).toBeDefined();
    expect(model!.nodes).toHaveLength(3);
    expect(model!.edges).toHaveLength(2);
  });

  it("rejects unsupported schema versions", () => {
    const venue = cloneVenue();
    (venue as unknown as Record<string, unknown>).schemaVersion = "99";
    expect(firstError(venue)).toBe("E_UNSUPPORTED_SCHEMA_VERSION");
  });

  it("rejects duplicate node ids", () => {
    const venue = cloneVenue();
    venue.nodes.push({ ...cloneVenue().nodes[0]! });
    expect(firstError(venue)).toBe("E_DUPLICATE_NODE_ID");
  });

  it("rejects duplicate edge ids", () => {
    const venue = cloneVenue();
    venue.edges.push({ ...cloneVenue().edges[1]!, from: "con", to: "con" });
    // self-loop also triggers; assert duplicate is reported for the second edge
    const codes = validateVenueDocument(venue).diagnostics.map((d) => d.code);
    expect(codes).toContain("E_DUPLICATE_EDGE_ID");
  });

  it("rejects edges referencing unknown nodes", () => {
    const venue = cloneVenue();
    venue.edges[0]!.to = "nope";
    expect(firstError(venue)).toBe("E_UNKNOWN_EDGE_ENDPOINT");
  });

  it("rejects zero and negative edge capacity", () => {
    const zero = cloneVenue();
    zero.edges[0]!.capacityPerMinute = 0;
    expect(firstError(zero)).toBe("E_ZERO_OR_NEGATIVE_CAPACITY");

    const negative = cloneVenue();
    negative.edges[0]!.capacityPerMinute = -5;
    expect(firstError(negative)).toBe("E_ZERO_OR_NEGATIVE_CAPACITY");
  });

  it("rejects impossible occupancy (occupancy above declared capacity)", () => {
    const venue = cloneVenue();
    venue.nodes[0]!.capacity = 50;
    expect(firstError(venue)).toBe("E_IMPOSSIBLE_OCCUPANCY");
  });

  it("rejects negative occupancy and non-integer occupancy", () => {
    const negative = cloneVenue();
    negative.nodes[0]!.occupancy = -1;
    expect(firstError(negative)).toBeDefined();

    const fractional = cloneVenue();
    fractional.nodes[0]!.occupancy = 10.5;
    expect(fractional.nodes[0] && firstError(fractional)).toBeDefined();
  });

  it("rejects non-finite coordinates", () => {
    const venue = cloneVenue();
    (venue.nodes[0] as { x: number }).x = Number.NaN;
    expect(firstError(venue)).toBe("E_INVALID_COORDINATES");
  });

  it("rejects edges with neither distance nor travel time", () => {
    const venue = cloneVenue() as VenueModel & { edges: Record<string, unknown>[] };
    delete (venue.edges[0] as Record<string, unknown>).distanceMeters;
    expect(firstError(venue)).toBe("E_MISSING_TRAVERSAL_BASIS");
  });

  it("rejects self-loop edges", () => {
    const venue = cloneVenue();
    venue.edges[0]!.to = "sec-a";
    expect(firstError(venue)).toBe("E_SELF_LOOP_EDGE");
  });

  it("rejects unknown fields instead of silently repairing them", () => {
    const venue = cloneVenue() as unknown as Record<string, unknown>;
    (venue as { mystery?: unknown }).mystery = true;
    const codes = validateVenueDocument(venue).diagnostics.map((d) => d.code);
    expect(codes).toContain("E_UNKNOWN_FIELD");
  });

  it("rejects occupied sections with no path to any gate", () => {
    const venue = cloneVenue();
    venue.edges.splice(0, 1); // disconnect sec-a
    expect(firstError(venue)).toBe("E_DISCONNECTED_OCCUPIED_SECTION");
  });
});

describe("scenario validation", () => {
  it("accepts a valid patch", () => {
    const { scenario, diagnostics } = validateScenarioDocument({
      schemaVersion: "1",
      id: "s",
      name: "S",
      operations: [{ op: "setEdgeCapacity", edgeId: "e1", capacityPerMinute: 100 }],
    });
    expect(scenario).toBeDefined();
    expect(diagnostics.filter((d) => d.severity === "error")).toHaveLength(0);

    const semantic = validateScenarioAgainstVenue(validVenue, scenario!);
    expect(semantic).toHaveLength(0);
  });

  it("rejects unknown operations and malformed values structurally", () => {
    expect(
      validateScenarioDocument({
        schemaVersion: "1",
        id: "s",
        name: "S",
        operations: [{ op: "explode" }],
      }).diagnostics.some((d) => d.code === "E_UNKNOWN_OPERATION"),
    ).toBe(true);

    expect(
      validateScenarioDocument({
        schemaVersion: "1",
        id: "s",
        name: "S",
        operations: [{ op: "setEdgeCapacity", edgeId: "e1", capacityPerMinute: -3 }],
      }).diagnostics.some((d) => d.severity === "error"),
    ).toBe(true);
  });

  it("rejects references to unknown entities", () => {
    const { scenario } = validateScenarioDocument({
      schemaVersion: "1",
      id: "s",
      name: "S",
      operations: [{ op: "disableEdge", edgeId: "missing-edge" }],
    });
    const semantic = validateScenarioAgainstVenue(validVenue, scenario!);
    expect(semantic.map((d) => d.code)).toContain("E_UNKNOWN_REFERENCE");
  });

  it("rejects contradictory capacity operations on the same edge", () => {
    const { scenario } = validateScenarioDocument({
      schemaVersion: "1",
      id: "s",
      name: "S",
      operations: [
        { op: "setEdgeCapacity", edgeId: "e1", capacityPerMinute: 120 },
        { op: "scaleEdgeCapacity", edgeId: "e1", factor: 2 },
      ],
    });
    const semantic = validateScenarioAgainstVenue(validVenue, scenario!);
    expect(semantic.map((d) => d.code)).toContain("E_CONTRADICTORY_OPERATIONS");
  });

  it("rejects contradictory enable/disable operations on the same edge", () => {
    const { scenario } = validateScenarioDocument({
      schemaVersion: "1",
      id: "s",
      name: "S",
      operations: [
        { op: "disableEdge", edgeId: "e1" },
        { op: "enableEdge", edgeId: "e1" },
      ],
    });
    const semantic = validateScenarioAgainstVenue(validVenue, scenario!);
    expect(semantic.map((d) => d.code)).toContain("E_CONTRADICTORY_OPERATIONS");
  });

  it("rejects occupancy results that exceed node capacity", () => {
    const { scenario } = validateScenarioDocument({
      schemaVersion: "1",
      id: "s",
      name: "S",
      operations: [{ op: "setNodeOccupancy", nodeId: "sec-a", occupancy: 500 }],
    });
    const capped = cloneVenue();
    capped.nodes[0]!.capacity = 200;
    const semantic = validateScenarioAgainstVenue(capped, scenario!);
    expect(semantic.map((d) => d.code)).toContain("E_IMPOSSIBLE_OCCUPANCY");
  });

  it("rejects an empty or wrong-type operations array", () => {
    const bad = validateScenarioDocument({
      schemaVersion: "1",
      id: "s",
      name: "S",
      operations: "nope",
    });
    expect(bad.scenario).toBeUndefined();
  });
});
