import { describe, expect, it } from "vitest";

import {
  buildVenueSchematicModel,
  getActiveLabelPlacement,
  getActiveLocationIdsFromPackages,
  getSchematicAnchorForLocation,
  isAnchorInsideViewBox,
  resolveOrientationSelection,
  VENUE_SCHEMATIC_VIEWBOX,
} from "@/lib/venue-schematic";
import { buildDemoState } from "@/lib/demo";

describe("venue schematic anchor model", () => {
  it("builds operational anchors from location records", () => {
    const model = buildVenueSchematicModel();

    expect(model.anchors.length).toBeGreaterThan(3);
    expect(model.anchors.some((anchor) => anchor.id === "gate-b")).toBe(true);
    expect(model.anchors.some((anchor) => anchor.id === "section-112")).toBe(true);
    expect(model.anchors.some((anchor) => anchor.id === "elevator-4")).toBe(true);
    expect(model.anchors.every((anchor) => anchor.x >= 0 && anchor.y >= 0)).toBe(
      true,
    );
  });

  it("resolves anchors for demo incident locations", () => {
    const anchor = getSchematicAnchorForLocation("section-112");

    expect(anchor?.label).toContain("112");
    expect(anchor?.zoneLayer).toBe("bowl");
  });

  it("does not expose seat-map semantics", () => {
    const model = buildVenueSchematicModel();
    const labels = model.anchors.map((anchor) => anchor.label.toLowerCase()).join(" ");

    expect(labels).not.toMatch(/seat map/);
    expect(labels).not.toMatch(/venue map/);
  });

  it("resolves orientation selection against active queue anchors", () => {
    const demo = buildDemoState();
    const activeIds = getActiveLocationIdsFromPackages(demo.incidentPackages);
    const selection = resolveOrientationSelection("gate-b", activeIds);

    expect(selection.selectedAnchor?.id).toBe("gate-b");
    expect(selection.activeAnchorIds).toEqual(
      expect.arrayContaining(["gate-b", "section-112", "elevator-4"]),
    );
  });

  it("normalizes elastic-backed incident anchors inside the venue schematic viewBox", () => {
    const elasticEightLocationIds = [
      "section-112",
      "elevator-4",
      "gate-b",
      "west-concourse",
      "section-112",
      "screening-east",
      "west-concourse",
      "section-112",
    ];

    expect(elasticEightLocationIds).toHaveLength(8);

    for (const locationId of elasticEightLocationIds) {
      const anchor = getSchematicAnchorForLocation(locationId);
      expect(anchor, `anchor for ${locationId}`).toBeDefined();
      expect(isAnchorInsideViewBox(anchor!)).toBe(true);

      const placement = getActiveLabelPlacement(anchor!);
      const maxX = VENUE_SCHEMATIC_VIEWBOX.minX + VENUE_SCHEMATIC_VIEWBOX.width;
      const maxY = VENUE_SCHEMATIC_VIEWBOX.minY + VENUE_SCHEMATIC_VIEWBOX.height;
      expect(placement.rectX).toBeGreaterThanOrEqual(VENUE_SCHEMATIC_VIEWBOX.minX);
      expect(placement.rectY).toBeGreaterThanOrEqual(VENUE_SCHEMATIC_VIEWBOX.minY);
      expect(placement.rectX + 36).toBeLessThanOrEqual(maxX);
      expect(placement.rectY + 7).toBeLessThanOrEqual(maxY);
    }
  });

  it("places low bowl anchors with labels above the marker", () => {
    const anchor = getSchematicAnchorForLocation("section-112");
    expect(anchor).toBeDefined();
    const placement = getActiveLabelPlacement(anchor!);
    expect(placement.rectY + 7).toBeLessThanOrEqual(anchor!.y);
  });
});
