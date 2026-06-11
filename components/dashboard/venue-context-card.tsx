"use client";

import { useMemo } from "react";

import {
  buildVenueSchematicModel,
  getActiveLabelPlacement,
  VENUE_SCHEMATIC_VIEWBOX,
  type VenueSchematicAnchor,
} from "@/lib/venue-schematic";

type VenueContextCardProps = {
  selectedLocationId?: string | null;
};

function SchematicAnchorDot({
  anchor,
  isSelected,
}: {
  anchor: VenueSchematicAnchor;
  isSelected: boolean;
}) {
  if (!isSelected) {
    return (
      <g data-testid={`venue-anchor-${anchor.id}`} data-selected="false" aria-label={anchor.label}>
        <circle cx={anchor.x} cy={anchor.y} r={1.2} fill="#94a3b8" />
      </g>
    );
  }

  const { rectX, rectY, labelX, labelY } = getActiveLabelPlacement(anchor);

  return (
    <g
      data-testid={`venue-anchor-${anchor.id}`}
      data-selected="true"
      aria-label={anchor.label}
    >
      <circle
        cx={anchor.x}
        cy={anchor.y}
        r={6}
        fill="none"
        stroke="#ef4444"
        strokeWidth={1.2}
        opacity={0.28}
        className="animate-pulse"
      />
      <circle cx={anchor.x} cy={anchor.y} r={3.4} fill="#ef4444" />
      <rect x={rectX} y={rectY} width={36} height={7} rx={1.5} fill="#ef4444" />
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        className="fill-white text-[3px] font-bold uppercase tracking-wider"
      >
        ACTIVE
      </text>
    </g>
  );
}

export function VenueContextCard({
  selectedLocationId = null,
}: VenueContextCardProps) {
  const model = useMemo(() => buildVenueSchematicModel(), []);
  const viewBox = `${VENUE_SCHEMATIC_VIEWBOX.minX} ${VENUE_SCHEMATIC_VIEWBOX.minY} ${VENUE_SCHEMATIC_VIEWBOX.width} ${VENUE_SCHEMATIC_VIEWBOX.height}`;

  return (
    <article
      className="ops-subpanel flex min-h-0 flex-col p-2.5"
      data-testid="venue-context-card"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3 className="text-[0.8125rem] font-semibold tracking-tight text-[#07111c]">
          Venue Context
        </h3>
        <div className="flex items-center gap-2 text-[0.65rem] text-slate-500">
          <span>Elevators</span>
          <span className="text-slate-300">·</span>
          <span>Sections</span>
        </div>
      </div>

      <div className="venue-context-schematic-wrap">
        <svg
          viewBox={viewBox}
          role="img"
          aria-label="Venue context schematic"
          data-testid="venue-context-schematic"
        >
          <path
            d="M22,12 L78,12 A13,13 0 0,1 91,25 L91,39 A13,13 0 0,1 78,52 L22,52 A13,13 0 0,1 9,39 L9,25 A13,13 0 0,1 22,12 Z"
            fill="#94a3b8"
            stroke="#cbd5e1"
            strokeWidth="0.6"
            opacity="0.95"
          />
          <path
            d="M26,20 L74,20 A9,9 0 0,1 83,29 L83,35 A9,9 0 0,1 74,44 L26,44 A9,9 0 0,1 17,35 L17,29 A9,9 0 0,1 26,20 Z"
            fill="#cbd5e1"
            stroke="#e2e8f0"
            strokeWidth="0.6"
          />
          <rect
            x="34"
            y="26"
            width="32"
            height="12"
            rx="2"
            fill="#f8fafc"
            stroke="#e2e8f0"
            strokeWidth="0.6"
          />
          <circle cx="50" cy="32" r="1.4" fill="#94a3b8" />

          <text
            x="14"
            y="32"
            className="fill-white font-bold text-[3px] uppercase tracking-wider"
            transform="rotate(-90 14,32)"
          >
            GATES A
          </text>
          <text
            x="86"
            y="32"
            className="fill-white font-bold text-[3px] uppercase tracking-wider"
            transform="rotate(90 86,32)"
          >
            GATES B
          </text>

          <text x="28" y="18" className="fill-white font-bold text-[3px]">
            A
          </text>
          <text x="72" y="18" className="fill-white font-bold text-[3px]">
            B
          </text>
          <text x="28" y="48" className="fill-white font-bold text-[3px]">
            C
          </text>
          <text x="72" y="48" className="fill-white font-bold text-[3px]">
            D
          </text>

          {model.anchors.map((anchor) => (
            <SchematicAnchorDot
              key={anchor.id}
              anchor={anchor}
              isSelected={anchor.id === selectedLocationId}
            />
          ))}
        </svg>
      </div>
    </article>
  );
}
