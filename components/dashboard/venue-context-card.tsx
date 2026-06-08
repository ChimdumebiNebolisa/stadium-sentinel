"use client";

import { useMemo } from "react";

import {
  buildVenueSchematicModel,
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
      {(() => {
        // Clamp the 36×7 label rect on BOTH axes so it never clips outside the
        // viewBox "6 8 88 48" (x: 6..94, y: 8..56) for any selected anchor.
        const VIEWBOX_MIN_X = 6;
        const VIEWBOX_MAX_X = 94;
        const VIEWBOX_MIN_Y = 8;
        const VIEWBOX_MAX_Y = 56;
        const RECT_W = 36;
        const RECT_H = 7;
        const PAD = 1;
        const rectX = Math.max(
          VIEWBOX_MIN_X + PAD,
          Math.min(anchor.x - RECT_W / 2, VIEWBOX_MAX_X - RECT_W - PAD),
        );
        // Sit the label just above the anchor; clamp top and bottom so the full
        // rect (and its text) stays inside the viewBox even for low anchors.
        const rectY = Math.max(
          VIEWBOX_MIN_Y + PAD,
          Math.min(anchor.y - 11, VIEWBOX_MAX_Y - RECT_H - PAD),
        );
        const labelX = rectX + RECT_W / 2;
        const labelY = rectY + 5;
        return (
          <>
            <rect x={rectX} y={rectY} width={RECT_W} height={7} rx={1.5} fill="#ef4444" />
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              className="fill-white text-[3px] font-bold uppercase tracking-wider"
            >
              ACTIVE
            </text>
          </>
        );
      })()}
    </g>
  );
}

export function VenueContextCard({
  selectedLocationId = null,
}: VenueContextCardProps) {
  const model = useMemo(() => buildVenueSchematicModel(), []);

  return (
    <article className="ops-subpanel flex flex-col p-4" data-testid="venue-context-card">
      <div className="mb-2">
        <h3 className="text-sm font-semibold tracking-tight text-[#07111c]">Venue Context</h3>
      </div>

      <div className="relative flex min-h-[165px] flex-1 items-center justify-center overflow-hidden rounded-md border border-slate-200/60 bg-slate-100 p-3">
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
          <div className="rounded-md border border-slate-200 bg-white/95 px-2 py-1 shadow-sm">
            <span className="block text-[0.6rem] font-bold uppercase tracking-widest text-slate-500">
              Elevators
            </span>
            <div className="mt-1 flex items-center gap-1 text-[0.7rem] text-slate-600">
              <span className="font-semibold text-slate-700">Up / Down</span>
              <span>North</span>
            </div>
            <div className="mt-1 flex items-center gap-1 text-[0.7rem] text-slate-600">
              <span className="font-semibold text-slate-700">Up / Down</span>
              <span>South</span>
            </div>
          </div>
          <div className="rounded-md border border-slate-200 bg-white/95 px-2 py-1 text-center shadow-sm">
            <span className="block text-[0.6rem] font-bold uppercase tracking-widest text-slate-500">
              Sections
            </span>
            <span className="mt-1 block text-[0.8rem] text-slate-700">List</span>
          </div>
        </div>

        <svg
          viewBox="6 8 88 48"
          role="img"
          aria-label="Venue context schematic"
          className="h-[75%] w-[75%]"
          data-testid="venue-context-schematic"
        >
          <path
            d="M20,10 L80,10 A15,15 0 0,1 95,25 L95,37 A15,15 0 0,1 80,52 L20,52 A15,15 0 0,1 5,37 L5,25 A15,15 0 0,1 20,10 Z"
            fill="#94a3b8"
            stroke="#cbd5e1"
            strokeWidth="0.6"
            opacity="0.95"
          />
          <path
            d="M25,18 L75,18 A10,10 0 0,1 85,28 L85,34 A10,10 0 0,1 75,44 L25,44 A10,10 0 0,1 15,34 L15,28 A10,10 0 0,1 25,18 Z"
            fill="#cbd5e1"
            stroke="#e2e8f0"
            strokeWidth="0.6"
          />
          <rect
            x="32"
            y="24"
            width="36"
            height="14"
            rx="2"
            fill="#f8fafc"
            stroke="#e2e8f0"
            strokeWidth="0.6"
          />
          <circle cx="50" cy="31" r="1.4" fill="#94a3b8" />

          <text
            x="12"
            y="32"
            className="fill-white font-bold text-[3px] uppercase tracking-wider"
            transform="rotate(-90 12,32)"
          >
            GATES A
          </text>
          <text
            x="88"
            y="32"
            className="fill-white font-bold text-[3px] uppercase tracking-wider"
            transform="rotate(90 88,32)"
          >
            GATES B
          </text>

          <text x="25" y="16" className="fill-white font-bold text-[3px]">
            A
          </text>
          <text x="75" y="16" className="fill-white font-bold text-[3px]">
            B
          </text>
          <text x="25" y="48" className="fill-white font-bold text-[3px]">
            C
          </text>
          <text x="75" y="48" className="fill-white font-bold text-[3px]">
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
