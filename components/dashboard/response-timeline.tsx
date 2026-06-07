import { buildResponseTimeline } from "@/lib/response-timeline";
import type { IncidentPackage, TimelineEntry } from "@/lib/types";

type ResponseTimelineProps = {
  incidentPackage: IncidentPackage;
  timeline: TimelineEntry[];
  poolTimeline?: string[] | null;
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
      return "text-slate-800";
    case "active":
      return "text-[#07111c] font-medium";
    case "pending":
    default:
      return "text-slate-500";
  }
}

export function ResponseTimeline({
  incidentPackage,
  timeline,
  poolTimeline,
}: ResponseTimelineProps) {
  const stages = buildResponseTimeline({
    incidentPackage,
    timeline,
    poolTimeline,
    transcriptLine: null,
  });

  return (
    <article className="ops-subpanel p-5" data-testid="response-timeline">
      <div className="mb-4 flex items-center gap-3">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-blue-600/85 text-sm font-semibold text-white">
          C
        </span>
        <h3 className="text-[1.05rem] font-semibold tracking-tight text-[#07111c]">
          Response timeline
        </h3>
      </div>
      <div className="space-y-4">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className="grid grid-cols-[auto_1fr_auto] items-start gap-4"
            data-testid={`response-timeline-stage-${stage.id}`}
            data-state={stage.state}
          >
            <span
              className={`mt-1 inline-flex h-3 w-3 rounded-full ${getStageMarkerClass(stage.state)}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${getStageTextClass(stage.state)}`}>
                {stage.label}
              </p>
              <p className={`mt-1 text-sm ${getStageTextClass(stage.state)}`}>
                {stage.statusText}
              </p>
            </div>
            <span className="text-sm text-slate-500">{stage.time}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
