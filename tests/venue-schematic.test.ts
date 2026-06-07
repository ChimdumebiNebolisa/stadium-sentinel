import { describe, expect, it } from "vitest";

import {
  buildVenueSchematicModel,
  getActiveLocationIdsFromPackages,
  getSchematicAnchorForLocation,
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

  it("resolves active queue location ids for orientation sync", () => {
    const demo = buildDemoState();
    const ids = getActiveLocationIdsFromPackages(demo.incidentPackages);

    expect(ids).toContain("section-112");
    expect(ids.length).toBeGreaterThanOrEqual(3);
  });
});
