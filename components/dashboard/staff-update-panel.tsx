export function StaffUpdatePanel({ staffUpdate }: { staffUpdate: string }) {
  return (
    <section className="ops-panel">
      <div className="mb-3">
        <h2 className="ops-heading">Staff update</h2>
        <p className="mt-1 text-sm text-slate-300">Ready-to-send operations wording for the selected incident.</p>
      </div>
      <div className="border border-white/10 bg-[#101418] p-4 text-sm leading-7 text-slate-200">
        {staffUpdate}
      </div>
    </section>
  );
}
