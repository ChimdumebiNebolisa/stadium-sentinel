import { VenueMapSchematic } from "@/components/dashboard/venue-map-schematic";
import { getLocationRecord, locationRecords } from "@/lib/data";
import type { IncidentPackage } from "@/lib/types";

type VenueMapProps = {
  incidentPackages: IncidentPackage[];
  selectedIncidentId: string;
  onSelect: (incidentId: string) => void;
};

export function VenueMap({
  incidentPackages,
  selectedIncidentId,
  onSelect,
}: VenueMapProps) {
  return (
    <section className="ops-panel flex h-full min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between gap-3 border-b border-white/8 pb-2">
        <div>
          <h2 className="ops-heading">Venue map</h2>
          <p className="mt-0.5 text-[11px] uppercase tracking-[0.14em] text-slate-500">
            Perimeter / Concourse / Bowl / Restricted
          </p>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border border-white/8 bg-[#0f141a]">
        <div className="relative h-full w-full">
          <VenueMapSchematic />
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 h-full w-full"
          >
            <g id="incident-markers">
              {incidentPackages.map(({ incident }) => {
                const location = getLocationRecord(incident.locationId);

                if (!location) {
                  return null;
                }

                const isSelected = incident.id === selectedIncidentId;
                const stroke =
                  incident.priority === "Immediate"
                    ? "#fb7185"
                    : incident.priority === "High"
                      ? "#fbbf24"
                      : incident.priority === "Moderate"
                        ? "#7dd3fc"
                        : "#94a3b8";

                return (
                  <g key={incident.id} transform={`translate(${location.mapX} ${location.mapY})`}>
                    {isSelected ? (
                      <circle r="3.5" fill={stroke} fillOpacity="0.18" />
                    ) : null}
                    <circle
                      r="1.15"
                      fill={stroke}
                      stroke="#081018"
                      strokeWidth="0.45"
                    />
                    <circle
                      r="2.25"
                      fill="none"
                      stroke={stroke}
                      strokeOpacity={isSelected ? "1" : "0.65"}
                      strokeWidth={isSelected ? "0.45" : "0.3"}
                    />
                  </g>
                );
              })}
            </g>
          </svg>
          {incidentPackages.map(({ incident }, index) => {
            const location = locationRecords.find(
              (item) => item.id === incident.locationId,
            );

            if (!location) {
              return null;
            }

            const isSelected = incident.id === selectedIncidentId;
            const priority = incident.priority;
            const markerTone =
              priority === "Immediate"
                ? "border-rose-100 bg-rose-500"
                : priority === "High"
                  ? "border-amber-100 bg-amber-400"
                  : priority === "Moderate"
                    ? "border-sky-100 bg-sky-300"
                    : "border-slate-200 bg-slate-400";

            return (
              <button
                key={incident.id}
                type="button"
                data-testid="map-marker"
                onClick={() => onSelect(incident.id)}
                className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 cursor-pointer"
                style={{ left: `${location.mapX}%`, top: `${location.mapY}%` }}
                aria-label={`${location.name} ${priority} incident`}
                aria-pressed={isSelected}
              >
                {isSelected ? (
                  <span className="absolute left-1/2 top-1/2 h-9 w-9 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/10 motion-safe:animate-ping" />
                ) : null}
                <span
                  className={`relative flex h-8 w-8 items-center justify-center rounded-full border-2 text-sm font-bold text-[#071018] transition-transform group-hover:scale-110 ${markerTone} ${
                    isSelected
                      ? "ring-2 ring-white/60 ring-offset-2 ring-offset-[#0f141a] scale-110"
                      : "ring-1 ring-black/40"
                  }`}
                >
                  {index + 1}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
