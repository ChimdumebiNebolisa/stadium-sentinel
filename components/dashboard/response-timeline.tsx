import { buildResponseTimeline } from "@/lib/response-timeline";
import type { IncidentPackage, TimelineEntry } from "@/lib/types";

type ResponseTimelineProps = {
  incidentPackage: IncidentPackage;
  timeline: TimelineEntry[];
  poolTimeline?: string[] | null;
  transcriptLine?: string | null;
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

export function ResponseTimeline({
  incidentPackage,
  timeline,
  poolTimeline,
  transcriptLine = null,
}: ResponseTimelineProps) {
  const stages = buildResponseTimeline({
    incidentPackage,
    timeline,
    poolTimeline,
    transcriptLine,
  });

  return (
    <article
      className="ops-subpanel response-timeline-compact p-4"
      data-testid="response-timeline"
    >
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-600/85 text-xs font-semibold text-white">
          C
        </span>
        <h3 className="text-sm font-semibold tracking-tight text-[#07111c]">
          Response timeline
        </h3>
      </div>
      <div>
        {stages.map((stage) => (
          <div
            key={stage.id}
            className="response-timeline-row"
            data-testid={`response-timeline-stage-${stage.id}`}
            data-state={stage.state}
          >
            <span
              className={`response-timeline-marker ${getStageMarkerClass(stage.state)}`}
              aria-hidden="true"
            />
            <div className="min-w-0">
              <p className={`response-timeline-label ${getStageTextClass(stage.state)}`}>
                {stage.label}
              </p>
              <p className={`response-timeline-detail ${getStageTextClass(stage.state)}`}>
                {stage.statusText}
              </p>
            </div>
            <span className="response-timeline-time">{stage.time}</span>
          </div>
        ))}
      </div>
    </article>
  );
}
