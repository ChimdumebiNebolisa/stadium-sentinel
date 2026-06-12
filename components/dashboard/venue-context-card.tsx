"use client";

import { useMemo } from "react";

import { VenueSchematicArt } from "@/components/dashboard/venue-schematic-art";
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
      r={0.55}
      fill="#b8c5d6"
      opacity={0.45}
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
          r={3.1}
          fill="none"
          stroke={marker.isCompleted ? "#94a3b8" : "#94a3b8"}
          strokeWidth={0.35}
          opacity={0.55}
        />
        <circle
          cx={marker.x}
          cy={marker.y}
          r={marker.isCompleted ? 1.5 : 2.1}
          fill={marker.isCompleted ? "#94a3b8" : "#475569"}
          stroke="#f8fafc"
          strokeWidth={0.45}
          opacity={marker.isCompleted ? 0.72 : 0.95}
        />
      </g>
    );
  }

  const { rectX, rectY, labelX, labelY } = getActiveLabelPlacement(marker);
  const accent = marker.isCompleted ? "#64748b" : "#dc2626";
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
      filter={marker.isCompleted ? undefined : "url(#venue-marker-glow)"}
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
          r={6.2}
          fill="none"
          stroke={accent}
          strokeWidth={0.9}
          opacity={0.3}
          className="animate-pulse"
        />
      ) : null}
      <circle cx={marker.x} cy={marker.y} r={3.5} fill={accent} stroke="#ffffff" strokeWidth={0.55} />
      <rect
        x={rectX}
        y={rectY}
        width={36}
        height={7}
        rx={1.8}
        fill={accent}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={0.25}
      />
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
    () => buildVenueIncidentMarkers(incidentPackages, timeline, selectedIncidentId),
    [incidentPackages, timeline, selectedIncidentId],
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
          className="venue-context-schematic"
        >
          <VenueSchematicArt />
          <VenueReferenceDot x={50} y={32} id="center" />

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
