import type { IncidentPackage } from "@/lib/types";

type ActionPlanPanelProps = {
  incidentPackage: IncidentPackage;
  onApprove: (incidentId: string, action: string, actionIndex: number) => void;
};

export function ActionPlanPanel({
  incidentPackage,
  onApprove,
}: ActionPlanPanelProps) {
  const { incident } = incidentPackage;

  return (
    <section className="ops-subpanel p-5">
      <p className="ops-label">Recommended response</p>
      <p className="mt-2 max-w-[68ch] text-sm leading-6 text-slate-400">
        Approve the next dispatch step for the selected incident.
      </p>
      <ol className="mt-4 space-y-2.5">
        {incident.recommendedActions.map((action, index) => {
          const actionId = `${incident.id}-action-${index}`;
          const isApproved = incident.approvedActionIds.includes(actionId);
          const isPrimary = index === 0;

          return (
            <li
              key={actionId}
              className={`border bg-[#101418] p-4 ${
                isPrimary ? "border-amber-500/30" : "border-white/8"
              }`}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-start gap-3">
                  <span className="ops-value mt-0.5 text-xs text-slate-500">
                    {index + 1}
                  </span>
                  <p className="max-w-[60ch] text-sm leading-6 text-slate-100">
                    {action}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isApproved}
                  onClick={() => onApprove(incident.id, action, index)}
                  className={`shrink-0 rounded-md px-4 py-2 text-xs font-medium transition-colors ${
                    isApproved
                      ? "border border-emerald-300/30 bg-emerald-400/10 text-emerald-200"
                      : "border border-amber-300/30 bg-amber-400/10 text-amber-100 hover:bg-amber-400/16"
                  }`}
                >
                  {isApproved ? "Approved" : "Approve"}
                </button>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
