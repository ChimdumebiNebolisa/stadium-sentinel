"use client";

import { useMemo } from "react";
import {
  buildVenueSchematicModel,
  formatZoneLayerLabel,
  resolveOrientationSelection,
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
  // Hide inactive anchors to keep it focused on the selected incident only
  if (!isSelected) {
    return (
      <g data-testid={`venue-anchor-${anchor.id}`} aria-label={anchor.label}>
        <circle cx={anchor.x} cy={anchor.y} r={1.5} fill="#94a3b8" />
      </g>
    );
  }

  return (
    <g
      data-testid={`venue-anchor-${anchor.id}`}
      data-selected="true"
      aria-label={anchor.label}
    >
      {/* Incident pulsing ring effect */}
      <circle
        cx={anchor.x}
        cy={anchor.y}
        r={7}
        fill="none"
        stroke="#ef4444"
        strokeWidth={1}
        opacity={0.3}
        className="animate-pulse"
      />
      <circle
        cx={anchor.x}
        cy={anchor.y}
        r={4.5}
        fill="none"
        stroke="#ef4444"
        strokeWidth={1.5}
        opacity={0.8}
      />
      <circle cx={anchor.x} cy={anchor.y} r={2.5} fill="#ef4444" />

      {/* Incident Location Label Box */}
      <rect
        x={anchor.x - 22}
        y={anchor.y - 12}
        width={44}
        height={8}
        rx={1.5}
        fill="#ef4444"
      />
      <text
        x={anchor.x}
        y={anchor.y - 6}
        textAnchor="middle"
        className="fill-white text-[3.5px] font-bold uppercase tracking-wider"
      >
        INCIDENT LOCATION
      </text>
    </g>
  );
}

export function VenueContextCard({
  selectedLocationId = null,
}: VenueContextCardProps) {
  const model = useMemo(() => buildVenueSchematicModel(), []);
  const { selectedAnchor } = useMemo(
    () => resolveOrientationSelection(selectedLocationId, [], model),
    [selectedLocationId, model]
  );

  return (
    <article className="ops-subpanel p-4 flex flex-col" data-testid="venue-context-card">
      <div className="mb-2">
        <h3 className="text-sm font-semibold tracking-tight text-[#07111c]">
          Venue Context
        </h3>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-[160px] bg-slate-100 rounded-md border border-slate-200/60 p-2 relative overflow-hidden">
        {/* Elevator info panel to the right, as seen in the mockup */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3">
            <div className="text-center">
                <span className="block text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mb-1">Elevators</span>
                <div className="flex items-center gap-1.5 justify-center border border-slate-200 bg-white rounded-sm px-1.5 py-1 shadow-sm">
                    <span className="text-[0.65rem] font-bold text-slate-700">↑↓</span>
                    <span className="text-[0.65rem] font-medium text-slate-600">North</span>
                </div>
                <div className="flex items-center gap-1.5 justify-center border border-slate-200 bg-white rounded-sm px-1.5 py-1 shadow-sm mt-1">
                    <span className="text-[0.65rem] font-bold text-slate-700">↑↓</span>
                    <span className="text-[0.65rem] font-medium text-slate-600">South</span>
                </div>
            </div>
            <div className="text-center">
                <span className="block text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest mb-1">Sections</span>
                <div className="flex items-center gap-1.5 justify-center border border-slate-200 bg-white rounded-sm px-1.5 py-1 shadow-sm">
                    <span className="text-[0.65rem] font-bold text-slate-700">☰</span>
                </div>
            </div>
        </div>

        <svg
          viewBox="0 0 100 62"
          role="img"
          aria-label="Venue context schematic"
          className="w-full h-full max-w-[200px]"
          data-testid="venue-context-schematic"
        >
          {/* Base shape */}
          <path
            d="M20,10 L80,10 A15,15 0 0,1 95,25 L95,37 A15,15 0 0,1 80,52 L20,52 A15,15 0 0,1 5,37 L5,25 A15,15 0 0,1 20,10 Z"
            fill="#94a3b8"
            stroke="#cbd5e1"
            strokeWidth="0.5"
            opacity="0.9"
          />
          {/* Inner ring */}
          <path
            d="M25,18 L75,18 A10,10 0 0,1 85,28 L85,34 A10,10 0 0,1 75,44 L25,44 A10,10 0 0,1 15,34 L15,28 A10,10 0 0,1 25,18 Z"
            fill="#cbd5e1"
            stroke="#e2e8f0"
            strokeWidth="0.5"
          />
          {/* Pitch */}
          <rect
            x="32"
            y="24"
            width="36"
            height="14"
            rx="2"
            fill="#f1f5f9"
            stroke="#e2e8f0"
            strokeWidth="0.5"
          />

          <text x="12" y="32" className="fill-white font-bold text-[3px] uppercase tracking-wider" transform="rotate(-90 12,32)">Gates A</text>
          <text x="88" y="32" className="fill-white font-bold text-[3px] uppercase tracking-wider" transform="rotate(90 88,32)">Gates B</text>

          <text x="25" y="16" className="fill-white font-bold text-[3px]">A</text>
          <text x="75" y="16" className="fill-white font-bold text-[3px]">B</text>
          <text x="25" y="48" className="fill-white font-bold text-[3px]">C</text>
          <text x="75" y="48" className="fill-white font-bold text-[3px]">D</text>

          {/* Just render the dots. Highlight selected anchor. */}
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
