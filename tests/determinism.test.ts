import { describe, expect, it } from "vitest";
import venueJson from "@/fixtures/harborline-park.json";
import { analyzeVenue } from "@/engine/analyze";
import { canonicalJsonString } from "@/engine/fingerprint";
import type { VenueModel } from "@/engine/types";
import { validateVenueDocument } from "@/engine/validation";

const venue = validateVenueDocument(venueJson).model!;
const overrides = { requireStepFreeTraversal: false };

function jsonOf(result: ReturnType<typeof analyzeVenue>): string {
  return `${JSON.stringify(result, null, 2)}\n`;
}

describe("determinism and fingerprinting", () => {
  it("produces byte-identical output for identical inputs", () => {
    const a = analyzeVenue(venue, null, overrides);
    const b = analyzeVenue(venue, null, overrides);
    expect(jsonOf(a)).toBe(jsonOf(b));
    expect(a.fingerprint).toBe(b.fingerprint);
  });

  it("is insensitive to node/edge order and key order in the input document", () => {
    const shuffledRaw: Record<string, unknown> = {
      edges: [...(venueJson.edges as unknown[])].reverse(),
      name: venueJson.name,
      nodes: [...(venueJson.nodes as unknown[])].reverse(),
      id: venueJson.id,
      schemaVersion: "1",
      description: venueJson.description,
      config: {},
    };
    const shuffled = validateVenueDocument(shuffledRaw).model!;

    const baseline = analyzeVenue(venue, null, overrides);
    const reordered = analyzeVenue(shuffled, null, overrides);
    expect(reordered.fingerprint).toBe(baseline.fingerprint);
    expect(jsonOf(reordered)).toBe(jsonOf(baseline));
  });

  it("changes the fingerprint when any semantic input changes", () => {
    const baselineFp = analyzeVenue(venue, null, overrides).fingerprint;

    const withScenario = analyzeVenue(
      venue,
      {
        schemaVersion: "1",
        id: "s",
        name: "S",
        operations: [{ op: "disableEdge", edgeId: "e-refuge" }],
      },
      overrides,
    );
    expect(withScenario.fingerprint).not.toBe(baselineFp);

    const withConfig = analyzeVenue(venue, null, {
      ...overrides,
      walkingSpeedMetersPerSecond: 1.3,
    });
    expect(withConfig.fingerprint).not.toBe(baselineFp);

    const tweakedVenue: VenueModel = JSON.parse(JSON.stringify(venue));
    tweakedVenue.name = "Harborline Park (renamed)";
    expect(analyzeVenue(tweakedVenue, null, overrides).fingerprint).not.toBe(baselineFp);
  });

  it("hashes a canonical bundle whose layout is documented and stable", () => {
    // Direct sensitivity check of the canonical serializer itself.
    const bundleA = { engineVersion: "1.0.0", z: 1, a: { nested: [2, 1] } };
    const bundleB = { a: { nested: [2, 1] }, z: 1, engineVersion: "1.0.0" };
    expect(canonicalJsonString(bundleA)).toBe(canonicalJsonString(bundleB));
  });
});
