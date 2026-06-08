import type { ReactNode } from "react";

import type { ReportSummary } from "@/lib/types";

export function PostEventReportPanel({
  reportSummary,
  demoMemoryPanel,
}: {
  reportSummary: ReportSummary;
  demoMemoryPanel?: ReactNode;
}) {
  return (
    <section className="h-full pr-2" data-testid="report-panel">
      <div className="mb-2">
        <h2 className="ops-heading">Post-event report</h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Review the editable report field above, then verify the summary below.
        </p>
      </div>
      <div className="rounded-md border border-slate-200 bg-white px-3 py-2.5">
        <p className="ops-label">Report summary</p>
        <p className="mt-2 text-sm font-semibold text-amber-900" data-testid="report-summary-headline">
          {reportSummary.headline}
        </p>
        {reportSummary.unresolvedItems.length > 0 ? (
          <ul className="mt-2 space-y-1 text-sm leading-6 text-slate-700">
            {reportSummary.unresolvedItems.slice(0, 3).map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm leading-6 text-slate-700">No unresolved items in the current queue.</p>
        )}
      </div>
      {demoMemoryPanel}
    </section>
  );
}
