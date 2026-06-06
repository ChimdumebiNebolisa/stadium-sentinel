import type { IncidentPackage } from "@/lib/types";

type ActionPlanPanelProps = {
  incidentPackage: IncidentPackage;
  onApprove: (incidentId: string, action: string, actionIndex: number) => void;
};

function getActionLabel(
  incidentType: IncidentPackage["incident"]["incidentType"],
  actionIndex: number,
): string {
  switch (incidentType) {
    case "accessibility-assist":
      return ["Dispatch Guest Services", "Route details", "Radio handoff"][
        actionIndex
      ] ?? "Approve action";
    case "facility-outage":
      return ["Send Facilities", "Accessible reroute", "Ops update"][
        actionIndex
      ] ?? "Approve action";
    case "queue-congestion":
      return ["Dispatch Crowd Flow", "Queue routing", "Gate advisory"][
        actionIndex
      ] ?? "Approve action";
    default:
      return "Approve action";
  }
}

export function ActionPlanPanel({
  incidentPackage,
  onApprove,
}: ActionPlanPanelProps) {
  const { incident } = incidentPackage;
  const primaryAction = incident.recommendedActions[0];
  const secondaryActions = incident.recommendedActions.slice(1, 3);

  return (
    <section className="ops-flat-section">
      <p className="ops-label">Dispatch</p>
      {primaryAction ? (
        <button
          type="button"
          disabled={incident.approvedActionIds.includes(`${incident.id}-action-0`)}
          title={primaryAction}
          aria-label={`${incident.approvedActionIds.includes(`${incident.id}-action-0`) ? "Approved" : getActionLabel(incident.incidentType, 0)}: ${primaryAction}`}
          onClick={() => onApprove(incident.id, primaryAction, 0)}
          className={`mt-2.5 w-full rounded-md border px-4 py-3 text-left transition-colors ${
            incident.approvedActionIds.includes(`${incident.id}-action-0`)
              ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100"
              : "border-blue-400/40 bg-blue-500 text-white hover:bg-blue-400 disabled:cursor-not-allowed"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <span className="text-[15px] font-semibold">
              {incident.approvedActionIds.includes(`${incident.id}-action-0`)
                ? "Approved"
                : getActionLabel(incident.incidentType, 0)}
            </span>
            <span className="text-sm opacity-85">1</span>
          </div>
        </button>
      ) : null}

      {secondaryActions.length > 0 ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {secondaryActions.map((action, secondaryIndex) => {
            const actionIndex = secondaryIndex + 1;
            const actionId = `${incident.id}-action-${actionIndex}`;
            const isApproved = incident.approvedActionIds.includes(actionId);
            const label = getActionLabel(incident.incidentType, actionIndex);

            return (
              <button
                key={actionId}
                type="button"
                disabled={isApproved}
                title={action}
                aria-label={`${isApproved ? "Approved" : label}: ${action}`}
                onClick={() => onApprove(incident.id, action, actionIndex)}
                className={`rounded-md border px-3 py-2.5 text-left transition-colors ${
                  isApproved
                    ? "border-emerald-300/30 bg-emerald-400/10 text-emerald-100"
                    : "border-white/10 bg-[#11171d] text-slate-100 hover:border-white/18 hover:bg-[#161d25] disabled:cursor-not-allowed disabled:opacity-80"
                }`}
              >
                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <span className="min-w-0 text-[14px] font-semibold leading-5">
                    {isApproved ? "Approved" : label}
                  </span>
                  <span
                    className={`text-xs ${
                      isApproved ? "text-emerald-100/80" : "text-slate-500"
                    }`}
                  >
                    {actionIndex + 1}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
