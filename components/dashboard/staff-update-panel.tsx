export function StaffUpdatePanel({ staffUpdate }: { staffUpdate: string }) {
  return (
    <section className="h-full pr-2">
      <div className="mb-2">
        <h2 className="ops-heading">Staff update</h2>
        <p className="mt-1 text-sm text-slate-600">
          Ready-to-send operations wording for the selected incident.
        </p>
      </div>
      <div className="py-2 text-sm leading-7 text-slate-700">
        {staffUpdate}
      </div>
    </section>
  );
}
