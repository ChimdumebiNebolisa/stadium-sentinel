import type { ReportSummary } from "@/lib/types";

export function PostEventReportPanel({
  reportSummary,
}: {
  reportSummary: ReportSummary;
}) {
  return (
    <section className="ops-panel" data-testid="report-panel">
      <div className="mb-4">
        <h2 className="ops-heading">Post-event report</h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
          Live summary and export-ready markdown for the current operations state.
        </p>
      </div>
      <div className="border border-white/8 bg-[#101418] px-4 py-4 md:px-5 md:py-5">
        <p className="ops-label">Preview</p>
        <p className="mt-2 text-sm font-semibold text-amber-100">
          {reportSummary.headline}
        </p>
        <pre className="mt-4 overflow-x-auto whitespace-pre-wrap border-t border-white/8 pt-4 font-mono text-[13px] leading-6 text-slate-200">
          {reportSummary.markdown}
        </pre>
      </div>
    </section>
  );
}
