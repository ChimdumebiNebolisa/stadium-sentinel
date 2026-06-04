import { VenueMapSchematic } from "@/components/dashboard/venue-map-schematic";
import { locationRecords } from "@/lib/data";
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
    <section className="ops-panel flex h-fit flex-col self-start">
      <div className="mb-3">
        <h2 className="ops-heading">Venue map</h2>
        <p className="mt-1 text-sm leading-6 text-slate-300">
          Open incidents pinned to Riverside Stadium. Select a marker to load its brief.
        </p>
      </div>
      <div className="relative h-[35rem] w-full overflow-hidden border border-white/10 bg-[#0f141a] xl:h-[38rem]">
        <div className="relative h-full w-full">
          <VenueMapSchematic />
          {incidentPackages.map(({ incident }) => {
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
                className="group absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${location.mapX}%`, top: `${location.mapY}%` }}
                aria-label={`${location.label} ${priority} incident`}
                aria-pressed={isSelected}
              >
                {isSelected ? (
                  <span className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-300/30 motion-safe:animate-ping" />
                ) : null}
                <span
                  className={`relative flex h-5 w-5 items-center justify-center rounded-full border-2 transition-transform group-hover:scale-110 ${markerTone} ${
                    isSelected
                      ? "ring-2 ring-amber-300 ring-offset-2 ring-offset-[#0f141a] scale-110"
                      : "ring-1 ring-black/40"
                  }`}
                >
                  <span className="h-2 w-2 rounded-full bg-[#0f141a]" />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
