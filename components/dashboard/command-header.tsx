export function CommandHeader() {
  return (
    <header
      className="ops-panel ops-strip flex min-h-[3.5rem] items-center gap-3"
      data-testid="command-bar"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-x-5 gap-y-2 text-sm">
        <span className="text-[1.05rem] font-semibold tracking-tight text-[#07111c]">
          Stadium Sentinel
        </span>
        <span className="hidden text-slate-300 md:inline">|</span>
        <span className="text-sm text-slate-600">Riverside Stadium</span>
        <span className="hidden text-slate-300 md:inline">|</span>
        <span className="inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Live operations
        </span>
      </div>
    </header>
  );
}
