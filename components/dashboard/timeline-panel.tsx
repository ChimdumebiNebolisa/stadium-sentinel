import { getTimelineTypeLabel } from "@/lib/priority";
import type { TimelineEntry } from "@/lib/types";

export function TimelinePanel({
  timeline,
  incidentId,
}: {
  timeline: TimelineEntry[];
  incidentId?: string;
}) {
  const entries = incidentId
    ? timeline.filter((e) => e.incidentId === incidentId)
    : timeline;

  return (
    <section className="h-full pr-2" data-testid="timeline-panel">
      <div className="mb-2">
        <h2 className="ops-heading">Full incident log</h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Intake, dispatch, and approvals in one log.
        </p>
      </div>
      <div className="divide-y divide-slate-200">
        {entries.length === 0 ? (
          <p className="py-3 text-sm text-slate-500" data-testid="timeline-empty-state">
            No timeline entries for this incident yet.
          </p>
        ) : (
          entries.map((entry) => (
            <article key={entry.id} className="py-3">
              <div className="flex items-center justify-between gap-4 text-xs text-slate-500">
                <span>{entry.timestamp}</span>
                <span>{getTimelineTypeLabel(entry.type)}</span>
              </div>
              <p className="mt-2 text-sm text-[#07111c]">{entry.message}</p>
              <p className="mt-1 text-xs text-slate-500">{entry.actor}</p>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
