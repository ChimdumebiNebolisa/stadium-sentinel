import { describe, expect, it } from "vitest";

import {
  buildVenueIncidentMarkers,
  buildVenueSchematicModel,
  getActiveLabelPlacement,
  getActiveLocationIdsFromPackages,
  getSchematicAnchorForLocation,
  getSchematicCoordsForLocation,
  isAnchorInsideViewBox,
  resolveOrientationSelection,
  VENUE_INCIDENT_MARKER_LIMIT,
  VENUE_SCHEMATIC_LOCATION_COORDS,
  VENUE_SCHEMATIC_VIEWBOX,
} from "@/lib/venue-schematic";
import { buildDemoState } from "@/lib/demo";
import {
  DEMO_INCIDENT_POOL,
  localStorageIncidentToPackage,
} from "@/lib/demo-incident-pool";
import { comparePriority } from "@/lib/priority";

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

  it("maps canonical venue locations to explicit schematic coordinates", () => {
    for (const locationId of Object.keys(VENUE_SCHEMATIC_LOCATION_COORDS)) {
      const coords = getSchematicCoordsForLocation(locationId);
      expect(coords, `coords for ${locationId}`).toEqual(
        VENUE_SCHEMATIC_LOCATION_COORDS[locationId],
      );
    }
  });

  it("builds exactly three incident markers from the demo dispatch queue", () => {
    const demo = buildDemoState();
    const selectedId = demo.incidentPackages[0]?.incident.id;
    const markers = buildVenueIncidentMarkers(
      demo.incidentPackages,
      demo.timeline,
      selectedId,
    );

    expect(markers).toHaveLength(VENUE_INCIDENT_MARKER_LIMIT);
    expect(markers.map((marker) => marker.incidentId)).toEqual(
      expect.arrayContaining([selectedId]),
    );
    expect(new Set(markers.map((marker) => marker.incidentId)).size).toBe(3);
    expect(markers.every((marker) => marker.incidentId.startsWith("incident-"))).toBe(true);
    expect(markers.every((marker) => marker.label.length > 0)).toBe(true);
  });

  it("includes the selected incident in markers when it has schematic coordinates", () => {
    const packages = DEMO_INCIDENT_POOL.slice(0, 5)
      .map(localStorageIncidentToPackage)
      .sort((left, right) => comparePriority(left.incident, right.incident));

    const markers = buildVenueIncidentMarkers(
      packages,
      undefined,
      "incident-aisle-spill",
    );

    expect(markers).toHaveLength(VENUE_INCIDENT_MARKER_LIMIT);
    expect(markers.some((marker) => marker.incidentId === "incident-aisle-spill")).toBe(true);
    expect(markers.some((marker) => marker.locationId === "section-204")).toBe(true);
    expect(new Set(markers.map((marker) => marker.incidentId)).size).toBe(3);
  });

  it("does not add a misleading marker when the selected incident has no schematic coordinates", () => {
    const packages = DEMO_INCIDENT_POOL.slice(0, 4)
      .map(localStorageIncidentToPackage)
      .sort((left, right) => comparePriority(left.incident, right.incident));

    const markers = buildVenueIncidentMarkers(
      packages,
      undefined,
      "incident-freezer-alarm",
    );

    expect(markers).toHaveLength(VENUE_INCIDENT_MARKER_LIMIT);
    expect(markers.some((marker) => marker.incidentId === "incident-freezer-alarm")).toBe(
      false,
    );
    expect(new Set(markers.map((marker) => marker.incidentId)).size).toBe(3);
  });

  it("keeps incident markers inside the venue schematic viewBox", () => {
    const demo = buildDemoState();
    const markers = buildVenueIncidentMarkers(demo.incidentPackages, demo.timeline);

    for (const marker of markers) {
      expect(
        isAnchorInsideViewBox(marker),
        `marker ${marker.incidentId} inside viewBox`,
      ).toBe(true);
    }
  });
});
