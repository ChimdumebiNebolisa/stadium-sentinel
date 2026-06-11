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
      className="ops-subpanel mt-1 flex flex-col"
      data-testid="operations-timeline"
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 px-3 py-2">
        <div className="min-w-0">
          <h3 className="text-[0.8125rem] font-semibold tracking-tight text-[#07111c]">
            Operations timeline
          </h3>
          <p
            className="mt-0.5 truncate text-[0.7rem] text-slate-600"
            data-testid="operations-timeline-selected"
          >
            {incident.title} · {locationSummary}
          </p>
        </div>
        <span className="shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[0.68rem] font-medium text-slate-600">
          {incident.priority}
        </span>
      </div>

      <div className="response-timeline-compact px-3 py-2.5">
        <div className="grid gap-1.5 md:grid-cols-5">
          {stages.map((stage) => (
            <article
              key={stage.id}
              className="rounded border border-slate-200/80 bg-[var(--panel-inset)] px-2 py-1.5"
              data-testid={`operations-timeline-stage-${stage.id}`}
              data-state={stage.state}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${getStageMarkerClass(stage.state)}`}
                  aria-hidden="true"
                />
                <p
                  className={`text-[0.65rem] font-semibold uppercase tracking-wider ${getStageTextClass(stage.state)}`}
                >
                  {stage.label}
                </p>
              </div>
              <p className={`mt-1 text-[0.75rem] leading-5 ${getStageTextClass(stage.state)}`}>
                {stage.statusText}
              </p>
              <p className="mt-1 text-[0.65rem] font-medium text-slate-500">{stage.time}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
