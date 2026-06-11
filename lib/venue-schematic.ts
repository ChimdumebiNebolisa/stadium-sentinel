import { getLocationRecord, locationRecords } from "@/lib/data";
import { isIncidentCompleted } from "@/lib/incident-completion";
import type { IncidentPackage, LocationRecord, TimelineEntry, ZoneLayer } from "@/lib/types";

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

export type VenueIncidentMarker = {
  incidentId: string;
  locationId: string;
  label: string;
  shortLabel: string;
  x: number;
  y: number;
  isCompleted: boolean;
};

/** Deterministic schematic coordinates for canonical venue locations. */
export const VENUE_SCHEMATIC_LOCATION_COORDS: Record<string, { x: number; y: number }> = {
  "screening-east": { x: 22, y: 20 },
  "section-112": { x: 70, y: 45 },
  "section-204": { x: 42, y: 44 },
  "section-318": { x: 58, y: 30 },
  "north-concourse": { x: 50, y: 22 },
  "gate-b": { x: 13, y: 32 },
  "west-concourse": { x: 84, y: 36 },
  "elevator-4": { x: 87, y: 32 },
};

export const VENUE_SCHEMATIC_REFERENCE_DOTS = [
  { id: "ref-a", x: 28, y: 18 },
  { id: "ref-b", x: 72, y: 18 },
  { id: "ref-c", x: 28, y: 48 },
  { id: "ref-d", x: 72, y: 48 },
] as const;

export const VENUE_INCIDENT_MARKER_LIMIT = 3;

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

export function isAnchorInsideViewBox(anchor: { x: number; y: number }): boolean {
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
export function getActiveLabelPlacement(anchor: { x: number; y: number }): ActiveLabelPlacement {
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

export function getSchematicCoordsForLocation(
  locationId: string,
): { x: number; y: number } | undefined {
  const explicit = VENUE_SCHEMATIC_LOCATION_COORDS[locationId];
  if (explicit) {
    return explicit;
  }

  const location = getLocationRecord(locationId);
  if (!location) {
    return undefined;
  }

  return normalizeSchematicCoords(location.mapX, location.mapY);
}

export function buildVenueIncidentMarkers(
  incidentPackages: IncidentPackage[],
  timeline?: TimelineEntry[],
  maxMarkers: number = VENUE_INCIDENT_MARKER_LIMIT,
): VenueIncidentMarker[] {
  return incidentPackages.slice(0, maxMarkers).flatMap((incidentPackage) => {
    const { incident } = incidentPackage;
    const coords = getSchematicCoordsForLocation(incident.locationId);
    if (!coords) {
      return [];
    }

    const location = getLocationRecord(incident.locationId);

    return [
      {
        incidentId: incident.id,
        locationId: incident.locationId,
        label: `${incident.title} · ${location?.displayName ?? incident.locationLabel}`,
        shortLabel: location?.name ?? incident.locationLabel,
        x: coords.x,
        y: coords.y,
        isCompleted: isIncidentCompleted({ incident, timeline }),
      },
    ];
  });
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
