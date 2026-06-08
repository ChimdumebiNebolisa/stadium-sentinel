import { buildResponseTimeline } from "@/lib/response-timeline";
import type { IncidentPackage, TimelineEntry } from "@/lib/types";

type OperationsTimelineProps = {
  incidentPackage: IncidentPackage;
  timeline: TimelineEntry[];
};

function getStageMarkerClass(state: "done" | "active" | "pending"): string {
  switch (state) {
    case "done":
      return "bg-emerald-500";
    case "active":
      return "bg-rose-500";
    case "pending":
    default:
      return "bg-slate-300";
  }
}

function getStageTextClass(state: "done" | "active" | "pending"): string {
  switch (state) {
    case "done":
      return "text-slate-700";
    case "active":
      return "text-[#07111c]";
    case "pending":
    default:
      return "text-slate-500";
  }
}

export function OperationsTimeline({ incidentPackage, timeline }: OperationsTimelineProps) {
  const { incident } = incidentPackage;
  const stages = buildResponseTimeline({
    incidentPackage,
    timeline,
  });
  const locationSummary = `${incident.locationLabel} · ${incident.assignedRole}`;

  return (
    <section
      className="ops-subpanel mt-3 flex min-h-[260px] flex-1 flex-col overflow-hidden"
      data-testid="operations-timeline"
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 bg-slate-50/50 px-4 py-2.5">
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-[#07111c]">
            Operations timeline
          </h3>
          <p className="mt-0.5 text-xs text-slate-600" data-testid="operations-timeline-selected">
            Selected queue item: {incident.title} · {locationSummary}
          </p>
        </div>
        <span className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">
          {incident.priority}
        </span>
      </div>

      <div
        className="flex-1 px-4 py-4"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(124, 146, 170, 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(124, 146, 170, 0.08) 1px, transparent 1px)",
          backgroundSize: "2rem 2rem",
        }}
      >
        <div className="rounded-xl border border-slate-200 bg-white/95 p-3 shadow-sm">
          <div className="grid gap-2 md:grid-cols-5">
            {stages.map((stage) => (
              <article
                key={stage.id}
                className="rounded-lg border border-slate-200 bg-[var(--panel-inset)] p-3"
                data-testid={`operations-timeline-stage-${stage.id}`}
                data-state={stage.state}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${getStageMarkerClass(stage.state)}`}
                    aria-hidden="true"
                  />
                  <p className={`text-xs font-semibold uppercase tracking-wider ${getStageTextClass(stage.state)}`}>
                    {stage.label}
                  </p>
                </div>
                <p className={`mt-2 text-sm leading-6 ${getStageTextClass(stage.state)}`}>
                  {stage.statusText}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-500">{stage.time}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
