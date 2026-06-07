type ReportInputProps = {
  report: string;
  isSubmitting: boolean;
  queueNonEmpty: boolean;
  onChange: (value: string) => void;
  onSubmit: (options?: { confirmedReplace?: boolean }) => void;
};

export function ReportInput({
  report,
  isSubmitting,
  queueNonEmpty,
  onChange,
  onSubmit,
}: ReportInputProps) {
  function handleProcessClick() {
    if (queueNonEmpty) {
      return;
    }

    onSubmit();
  }

  return (
    <section className="h-full pr-2">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="ops-heading">Event report</h2>
          <p className="mt-1 text-sm text-slate-600">
            Paste the incoming call or report, then refresh the operations board.
          </p>
        </div>
        <button
          type="button"
          disabled={isSubmitting || queueNonEmpty}
          onClick={handleProcessClick}
          className="shrink-0 rounded-md border border-amber-500/35 bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-900 transition-colors hover:bg-amber-500/15 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Refreshing board..." : "Process report"}
        </button>
      </div>
      <textarea
        data-testid="report-input"
        value={report}
        onChange={(event) => onChange(event.target.value)}
        className="h-40 w-full rounded-md border border-slate-200 bg-[var(--panel-inset)] px-4 py-3 text-sm leading-7 text-slate-800 placeholder:text-slate-400"
      />
      {queueNonEmpty ? (
        <div
          className="mt-3 rounded-md border border-amber-500/25 bg-amber-500/5 px-3 py-2.5"
          data-testid="manual-ingest-confirm"
        >
          <p className="text-xs font-semibold text-amber-950">
            Replace current dispatch queue?
          </p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Processing this report will replace the active incident queue. Review
            the text above, then confirm to refresh the board.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSubmitting}
              data-testid="manual-ingest-confirm-replace"
              onClick={() => onSubmit({ confirmedReplace: true })}
              className="rounded-md border border-amber-500/35 bg-amber-600 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.03em] text-white transition-colors hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              Replace queue
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              data-testid="manual-ingest-confirm-cancel"
              onClick={() => onChange(report)}
              className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-[0.7rem] font-medium text-slate-600 transition-colors hover:border-slate-300"
            >
              Keep current queue
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-slate-500">
          The queue, workspace, and utility drawer will refresh to match the latest
          report.
        </p>
      )}
    </section>
  );
}
