type ReportInputProps = {
  report: string;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
};

export function ReportInput({
  report,
  isSubmitting,
  onChange,
  onSubmit,
}: ReportInputProps) {
  return (
    <section className="h-full pr-2">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="ops-heading">Event report</h2>
          <p className="mt-1 text-sm text-slate-300">
            Paste the incoming call or report, then refresh the operations board.
          </p>
        </div>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={onSubmit}
          className="shrink-0 rounded-md border border-amber-500/35 bg-amber-500/8 px-3 py-1.5 text-xs font-medium text-amber-100 transition-colors hover:bg-amber-500/14 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Refreshing board..." : "Process report"}
        </button>
      </div>
      <textarea
        data-testid="report-input"
        value={report}
        onChange={(event) => onChange(event.target.value)}
        className="h-40 w-full rounded-md border border-white/10 bg-[#101418] px-4 py-3 text-sm leading-7 text-slate-100 placeholder:text-slate-500"
      />
      <p className="mt-3 text-xs leading-5 text-slate-500">
        The queue, workspace, and utility drawer will refresh to match the latest report.
      </p>
    </section>
  );
}
