import type { ReactNode } from "react";

import type { DemoReportDraft } from "@/lib/demo-agent-workflow";
import type { ReportSummary } from "@/lib/types";

export function PostEventReportPanel({
  demoReportDraft,
  demoMemoryPanel,
}: {
  reportSummary: ReportSummary;
  demoReportDraft: DemoReportDraft;
  demoMemoryPanel?: ReactNode;
}) {
  return (
    <section className="h-full pr-2" data-testid="report-panel">
      <div className="mb-2">
        <h2 className="ops-heading">Post-event report</h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Draft from current incidents, evidence, and log.
        </p>
      </div>
      <div className="py-1">
        <p className="ops-label">Report draft</p>
        <p
          className="mt-2 text-sm font-semibold text-amber-900"
          data-testid="report-draft-headline"
        >
          {demoReportDraft.headline}
        </p>
        <pre
          className="mt-3 overflow-x-auto whitespace-pre-wrap border-t border-slate-200 pt-3 font-mono text-[13px] leading-6 text-slate-700"
          data-testid="report-draft-markdown"
        >
          {demoReportDraft.markdown}
        </pre>
      </div>
      {demoMemoryPanel}
    </section>
  );
}
