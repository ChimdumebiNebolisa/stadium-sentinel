import type { ReportSummary } from "@/lib/types";

export function PostEventReportPanel({
  reportSummary,
}: {
  reportSummary: ReportSummary;
}) {
  return (
    <section className="h-full pr-2" data-testid="report-panel">
      <div className="mb-3">
        <h2 className="ops-heading">Post-event report</h2>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Live summary and export-ready markdown for the current operations state.
        </p>
      </div>
      <div className="py-1">
        <p className="ops-label">Preview</p>
        <p className="mt-2 text-sm font-semibold text-amber-900">
          {reportSummary.headline}
        </p>
        <pre className="mt-3 overflow-x-auto whitespace-pre-wrap border-t border-slate-200 pt-3 font-mono text-[13px] leading-6 text-slate-700">
          {reportSummary.markdown}
        </pre>
      </div>
    </section>
  );
}
