import { getLocationRecord, locationRecords } from "@/lib/data";
import type { LocationRecord, ZoneLayer } from "@/lib/types";

export type VenueSchematicAnchor = {
  id: string;
  label: string;
  shortLabel: string;
  zoneLayer: ZoneLayer;
  x: number;
  y: number;
};

export type VenueSchematicModel = {
  anchors: VenueSchematicAnchor[];
  zoneLayers: ZoneLayer[];
};

const ORIENTATION_ANCHOR_TYPES = new Set<LocationRecord["type"]>([
  "gate",
  "elevator",
  "section",
  "circulation",
  "first-aid",
  "restroom",
]);

const ZONE_LAYER_ORDER: ZoneLayer[] = [
  "perimeter",
  "concourse",
  "bowl",
  "restricted",
];

function toAnchor(location: LocationRecord): VenueSchematicAnchor {
  return {
    id: location.id,
    label: location.displayName,
    shortLabel: location.name,
    zoneLayer: location.zoneLayer,
    x: location.mapX,
    y: location.mapY,
  };
}

export function buildVenueSchematicModel(): VenueSchematicModel {
  const anchors = locationRecords
    .filter((location) => ORIENTATION_ANCHOR_TYPES.has(location.type))
    .map(toAnchor)
    .sort((left, right) => left.label.localeCompare(right.label));

  return {
    anchors,
    zoneLayers: ZONE_LAYER_ORDER,
  };
}

export function getSchematicAnchorForLocation(
  locationId: string,
  model: VenueSchematicModel = buildVenueSchematicModel(),
): VenueSchematicAnchor | undefined {
  return (
    model.anchors.find((anchor) => anchor.id === locationId) ??
    (() => {
      const location = getLocationRecord(locationId);
      return location && ORIENTATION_ANCHOR_TYPES.has(location.type)
        ? toAnchor(location)
        : undefined;
    })()
  );
}

export function formatZoneLayerLabel(zoneLayer: ZoneLayer): string {
  switch (zoneLayer) {
    case "perimeter":
      return "Perimeter";
    case "concourse":
      return "Concourse";
    case "bowl":
      return "Bowl";
    case "restricted":
      return "Restricted";
    default:
      return zoneLayer;
  }
}
