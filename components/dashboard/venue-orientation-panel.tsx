"use client";

import { useMemo, useState } from "react";

import {
  buildVenueSchematicModel,
  formatZoneLayerLabel,
  resolveOrientationSelection,
  type VenueSchematicAnchor,
} from "@/lib/venue-schematic";

type VenueOrientationPanelProps = {
  selectedLocationId?: string | null;
  activeLocationIds?: string[];
};

function SchematicAnchorDot({
  anchor,
  isSelected,
  isActive,
}: {
  anchor: VenueSchematicAnchor;
  isSelected: boolean;
  isActive: boolean;
}) {
  const radius = isSelected ? 3.2 : isActive ? 2.4 : 2;
  const fill = isSelected ? "#6d28d9" : isActive ? "#2563eb" : "#64748b";

  return (
    <g
      data-testid={`venue-anchor-${anchor.id}`}
      data-selected={isSelected ? "true" : "false"}
      aria-label={anchor.label}
    >
      {isSelected ? (
        <circle
          cx={anchor.x}
          cy={anchor.y}
          r={5.5}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth={0.8}
          opacity={0.8}
        />
      ) : null}
      <circle cx={anchor.x} cy={anchor.y} r={radius} fill={fill} />
      {isSelected ? (
        <text
          x={anchor.x}
          y={anchor.y - 6}
          textAnchor="middle"
          className="fill-slate-700 text-[3px] font-semibold"
        >
          {anchor.shortLabel}
        </text>
      ) : null}
    </g>
  );
}

export function VenueOrientationPanel({
  selectedLocationId = null,
  activeLocationIds = [],
}: VenueOrientationPanelProps) {
  const [open, setOpen] = useState(false);
  const model = useMemo(() => buildVenueSchematicModel(), []);
  const { selectedAnchor, activeAnchorIds } = useMemo(
    () => resolveOrientationSelection(selectedLocationId, activeLocationIds, model),
    [selectedLocationId, activeLocationIds, model],
  );
  const activeIdSet = useMemo(() => new Set(activeAnchorIds), [activeAnchorIds]);

  return (
    <section className="ops-subpanel px-3 py-2.5" data-testid="venue-orientation-section">
      <button
        type="button"
        data-testid="venue-orientation-toggle"
        aria-expanded={open}
        aria-controls="venue-orientation-panel"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-left transition-colors hover:border-slate-300"
      >
        <span className="text-xs font-semibold uppercase tracking-[0.04em] text-slate-700">
          Venue orientation
        </span>
        <span className="text-[0.7rem] font-medium text-slate-500">
          {open ? "Hide" : "Show location view"}
        </span>
      </button>

      {open ? (
        <div
          id="venue-orientation-panel"
          data-testid="venue-orientation-panel"
          className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2"
        >
          <p className="text-xs leading-5 text-slate-600">
            Not-to-scale schematic for routing context. Operational anchors only —
            not a map product.
          </p>

          {selectedAnchor ? (
            <p
              className="mt-1 text-xs font-medium text-violet-900"
              data-testid="venue-orientation-selected-label"
            >
              Selected: {selectedAnchor.label} ·{" "}
              {formatZoneLayerLabel(selectedAnchor.zoneLayer)}
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Select an incident to highlight its operational anchor.
            </p>
          )}

          <svg
            viewBox="0 0 100 62"
            role="img"
            aria-label="Venue orientation schematic"
            className="mt-2 h-36 w-full rounded-md border border-slate-200 bg-white"
            data-testid="venue-orientation-schematic"
          >
            <rect
              x="4"
              y="6"
              width="92"
              height="50"
              rx="8"
              fill="#f8fafc"
              stroke="#cbd5e1"
              strokeWidth="0.8"
            />
            <rect
              x="12"
              y="14"
              width="76"
              height="34"
              rx="6"
              fill="#eef2ff"
              stroke="#dbeafe"
              strokeWidth="0.6"
            />
            <text x="8" y="11" className="fill-slate-500 text-[3px]">
              Perimeter
            </text>
            <text x="42" y="24" className="fill-slate-500 text-[3px]">
              Concourse
            </text>
            <text x="44" y="40" className="fill-slate-500 text-[3px]">
              Bowl
            </text>
            {model.anchors.map((anchor) => (
              <SchematicAnchorDot
                key={anchor.id}
                anchor={anchor}
                isSelected={anchor.id === selectedLocationId}
                isActive={activeIdSet.has(anchor.id)}
              />
            ))}
          </svg>
        </div>
      ) : null}
    </section>
  );
}
