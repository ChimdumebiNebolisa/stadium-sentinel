import { getLocationRecord, locationRecords } from "@/lib/data";
import type { IncidentPackage, LocationRecord, ZoneLayer } from "@/lib/types";

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
  "screening",
]);

const ZONE_LAYER_ORDER: ZoneLayer[] = [
  "perimeter",
  "concourse",
  "bowl",
  "restricted",
];

/** Venue Context card SVG viewBox (matches venue-context-card.tsx). */
export const VENUE_SCHEMATIC_VIEWBOX = {
  minX: 6,
  minY: 8,
  width: 88,
  height: 48,
} as const;

const MAP_X_MIN = 5;
const MAP_X_MAX = 95;
const MAP_Y_MIN = 10;
const MAP_Y_MAX = 70;

/** Map raw location coordinates into the schematic viewBox with padding. */
export function normalizeSchematicCoords(
  mapX: number,
  mapY: number,
): { x: number; y: number } {
  const padX = 10;
  const padY = 6;
  const innerW = VENUE_SCHEMATIC_VIEWBOX.width - padX * 2;
  const innerH = VENUE_SCHEMATIC_VIEWBOX.height - padY * 2;
  const x =
    VENUE_SCHEMATIC_VIEWBOX.minX +
    padX +
    ((mapX - MAP_X_MIN) / (MAP_X_MAX - MAP_X_MIN)) * innerW;
  const y =
    VENUE_SCHEMATIC_VIEWBOX.minY +
    padY +
    ((mapY - MAP_Y_MIN) / (MAP_Y_MAX - MAP_Y_MIN)) * innerH;
  return {
    x: Math.round(x * 10) / 10,
    y: Math.round(y * 10) / 10,
  };
}

export function isAnchorInsideViewBox(anchor: VenueSchematicAnchor): boolean {
  const maxX = VENUE_SCHEMATIC_VIEWBOX.minX + VENUE_SCHEMATIC_VIEWBOX.width;
  const maxY = VENUE_SCHEMATIC_VIEWBOX.minY + VENUE_SCHEMATIC_VIEWBOX.height;
  const margin = 4;
  return (
    anchor.x >= VENUE_SCHEMATIC_VIEWBOX.minX + margin &&
    anchor.x <= maxX - margin &&
    anchor.y >= VENUE_SCHEMATIC_VIEWBOX.minY + margin &&
    anchor.y <= maxY - margin
  );
}

export type ActiveLabelPlacement = {
  rectX: number;
  rectY: number;
  labelX: number;
  labelY: number;
};

/** Place ACTIVE label above/below marker based on anchor position in schematic space. */
export function getActiveLabelPlacement(anchor: VenueSchematicAnchor): ActiveLabelPlacement {
  const VIEWBOX_MIN_X = VENUE_SCHEMATIC_VIEWBOX.minX;
  const VIEWBOX_MAX_X = VENUE_SCHEMATIC_VIEWBOX.minX + VENUE_SCHEMATIC_VIEWBOX.width;
  const VIEWBOX_MIN_Y = VENUE_SCHEMATIC_VIEWBOX.minY;
  const VIEWBOX_MAX_Y = VENUE_SCHEMATIC_VIEWBOX.minY + VENUE_SCHEMATIC_VIEWBOX.height;
  const RECT_W = 36;
  const RECT_H = 7;
  const PAD = 1.5;
  const midY = VIEWBOX_MIN_Y + VENUE_SCHEMATIC_VIEWBOX.height / 2;

  const labelAbove = anchor.y >= midY;
  const rawRectY = labelAbove ? anchor.y - 12 : anchor.y + 5;

  const rectX = Math.max(
    VIEWBOX_MIN_X + PAD,
    Math.min(anchor.x - RECT_W / 2, VIEWBOX_MAX_X - RECT_W - PAD),
  );
  const rectY = Math.max(
    VIEWBOX_MIN_Y + PAD,
    Math.min(rawRectY, VIEWBOX_MAX_Y - RECT_H - PAD),
  );

  return {
    rectX,
    rectY,
    labelX: rectX + RECT_W / 2,
    labelY: rectY + 5,
  };
}

function toAnchor(location: LocationRecord): VenueSchematicAnchor {
  const { x, y } = normalizeSchematicCoords(location.mapX, location.mapY);
  return {
    id: location.id,
    label: location.displayName,
    shortLabel: location.name,
    zoneLayer: location.zoneLayer,
    x,
    y,
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

export function getActiveLocationIdsFromPackages(
  incidentPackages: IncidentPackage[],
): string[] {
  return [
    ...new Set(
      incidentPackages
        .map(({ incident }) => incident.locationId)
        .filter((locationId) => Boolean(getLocationRecord(locationId))),
    ),
  ];
}

export function resolveOrientationSelection(
  selectedLocationId: string | null | undefined,
  activeLocationIds: string[],
  model: VenueSchematicModel = buildVenueSchematicModel(),
): {
  selectedAnchor: VenueSchematicAnchor | undefined;
  activeAnchorIds: string[];
} {
  const selectedAnchor = selectedLocationId
    ? getSchematicAnchorForLocation(selectedLocationId, model)
    : undefined;
  const activeAnchorIds = activeLocationIds.filter((locationId) =>
    model.anchors.some((anchor) => anchor.id === locationId),
  );

  return { selectedAnchor, activeAnchorIds };
}
