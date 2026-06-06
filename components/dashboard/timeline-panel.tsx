import { getTimelineTypeLabel } from "@/lib/priority";
import type { TimelineEntry } from "@/lib/types";

export function TimelinePanel({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <section className="h-full pr-2" data-testid="timeline-panel">
      <div className="mb-2">
        <h2 className="ops-heading">Timeline</h2>
        <p className="mt-1 text-sm text-slate-300">
          Intake, recommendations, and approvals stay in one running incident log.
        </p>
      </div>
      <div className="divide-y divide-white/8">
        {timeline.map((entry) => (
          <article key={entry.id} className="py-3">
            <div className="flex items-center justify-between gap-4 text-xs text-slate-400">
              <span>{entry.timestamp}</span>
              <span>{getTimelineTypeLabel(entry.type)}</span>
            </div>
            <p className="mt-2 text-sm text-white">{entry.message}</p>
            <p className="mt-1 text-xs text-slate-500">
              {entry.actor}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
