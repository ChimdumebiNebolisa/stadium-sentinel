"use client";

import { useMemo } from "react";

import {
  buildVenueIncidentMarkers,
  getActiveLabelPlacement,
  VENUE_SCHEMATIC_REFERENCE_DOTS,
  VENUE_SCHEMATIC_VIEWBOX,
  type VenueIncidentMarker,
} from "@/lib/venue-schematic";
import type { IncidentPackage, TimelineEntry } from "@/lib/types";

type VenueContextCardProps = {
  incidentPackages: IncidentPackage[];
  selectedIncidentId: string | null;
  onSelectIncident: (incidentId: string) => void;
  timeline?: TimelineEntry[];
};

function VenueReferenceDot({ x, y, id }: { x: number; y: number; id: string }) {
  return (
    <circle
      cx={x}
      cy={y}
      r={0.7}
      fill="#cbd5e1"
      opacity={0.65}
      data-testid={`venue-reference-dot-${id}`}
      data-venue-reference="true"
      pointerEvents="none"
    />
  );
}

function VenueIncidentMarkerDot({
  marker,
  isSelected,
  onSelect,
}: {
  marker: VenueIncidentMarker;
  isSelected: boolean;
  onSelect: (incidentId: string) => void;
}) {
  const handleActivate = () => onSelect(marker.incidentId);

  if (!isSelected) {
    return (
      <g
        role="button"
        tabIndex={0}
        data-testid={`venue-anchor-${marker.locationId}`}
        data-venue-incident-marker="true"
        data-venue-marker-incident-id={marker.incidentId}
        data-selected="false"
        data-completed={marker.isCompleted ? "true" : "false"}
        aria-label={marker.label}
        className="cursor-pointer outline-none"
        onClick={handleActivate}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleActivate();
          }
        }}
      >
        <circle
          cx={marker.x}
          cy={marker.y}
          r={marker.isCompleted ? 1.6 : 2.2}
          fill={marker.isCompleted ? "#94a3b8" : "#64748b"}
          opacity={marker.isCompleted ? 0.75 : 0.95}
        />
      </g>
    );
  }

  const { rectX, rectY, labelX, labelY } = getActiveLabelPlacement(marker);
  const accent = marker.isCompleted ? "#64748b" : "#ef4444";
  const labelText = marker.isCompleted ? marker.shortLabel.toUpperCase() : "ACTIVE";

  return (
    <g
      role="button"
      tabIndex={0}
      data-testid={`venue-anchor-${marker.locationId}`}
      data-venue-incident-marker="true"
      data-venue-marker-incident-id={marker.incidentId}
      data-selected="true"
      data-completed={marker.isCompleted ? "true" : "false"}
      aria-label={marker.label}
      className="cursor-pointer outline-none"
      onClick={handleActivate}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleActivate();
        }
      }}
    >
      {!marker.isCompleted ? (
        <circle
          cx={marker.x}
          cy={marker.y}
          r={6}
          fill="none"
          stroke={accent}
          strokeWidth={1.2}
          opacity={0.28}
          className="animate-pulse"
        />
      ) : null}
      <circle cx={marker.x} cy={marker.y} r={3.4} fill={accent} />
      <rect x={rectX} y={rectY} width={36} height={7} rx={1.5} fill={accent} />
      <text
        x={labelX}
        y={labelY}
        textAnchor="middle"
        className="fill-white text-[3px] font-bold uppercase tracking-wider"
      >
        {labelText}
      </text>
    </g>
  );
}

export function VenueContextCard({
  incidentPackages,
  selectedIncidentId,
  onSelectIncident,
  timeline,
}: VenueContextCardProps) {
  const markers = useMemo(
    () => buildVenueIncidentMarkers(incidentPackages, timeline),
    [incidentPackages, timeline],
  );
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
          <VenueReferenceDot x={50} y={32} id="center" />

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

          {VENUE_SCHEMATIC_REFERENCE_DOTS.map((dot) => (
            <VenueReferenceDot key={dot.id} x={dot.x} y={dot.y} id={dot.id} />
          ))}

          {markers.map((marker) => (
            <VenueIncidentMarkerDot
              key={marker.incidentId}
              marker={marker}
              isSelected={marker.incidentId === selectedIncidentId}
              onSelect={onSelectIncident}
            />
          ))}
        </svg>
      </div>
    </article>
  );
}
