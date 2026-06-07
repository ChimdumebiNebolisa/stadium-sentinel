import type { IncidentPackage } from "@/lib/types";

export function resolveSelectedIncidentId(
  incidentPackages: IncidentPackage[],
  currentSelection: string,
): string {
  if (
    currentSelection &&
    incidentPackages.some(({ incident }) => incident.id === currentSelection)
  ) {
    return currentSelection;
  }

  return incidentPackages[0]?.incident.id ?? "";
}
