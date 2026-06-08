import { formatSourceAuditTimestamp, type SourceAuditEvent } from "@/lib/source-audit";
import type { IncidentPackage } from "@/lib/types";

export function SourceLogPanel({
  events,
  incidentPackage,
}: {
  events: SourceAuditEvent[];
  incidentPackage?: IncidentPackage | null;
}) {
  return (
    <section className="h-full pr-2" data-testid="source-log-panel">
      <h2 className="ops-heading">Source log</h2>
      <p className="mt-1 text-sm text-slate-600">
        Recent operations data updates for the current command file.
      </p>
      {incidentPackage ? (
        <p className="mt-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
          Selected incident context: {incidentPackage.incident.title} ·{" "}
          {incidentPackage.incident.locationLabel} · {incidentPackage.incident.assignedRole}
        </p>
      ) : null}

      {events.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500" data-testid="source-log-empty">
          No source updates recorded yet.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-md border border-slate-200 bg-white px-3 py-2"
              data-testid="source-log-entry"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.03em] text-slate-700">
                  {event.label}
                </p>
                <p className="text-[0.7rem] text-slate-500">
                  {formatSourceAuditTimestamp(event.timestamp)}
                </p>
              </div>
              <p className="mt-1 text-sm leading-5 text-slate-700">{event.summary}</p>
              <p className="mt-1 text-xs text-slate-500">
                {event.incidentCount} incident{event.incidentCount === 1 ? "" : "s"} |{" "}
                {event.outcome}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
