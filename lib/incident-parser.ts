import { comparePriority, derivePriority } from "@/lib/priority";
import type {
  Incident,
  IncidentCategory,
  IncidentType,
  LocationRecord,
} from "@/lib/types";

type ParseTemplate = {
  id: string;
  matcher: RegExp;
  title: string;
  incidentType: IncidentType;
  category: IncidentCategory;
  locationId: string;
  assumptions: string[];
};

const templates: ParseTemplate[] = [
  {
    id: "incident-gate-b",
    matcher: /gate b is backed up/i,
    title: "Gate B backed up",
    incidentType: "queue-congestion",
    category: "crowd-flow",
    locationId: "gate-b",
    assumptions: ["Queue congestion inferred from ingress delay language."],
  },
  {
    id: "incident-elevator-4",
    matcher: /elevator 4 is down/i,
    title: "Elevator 4 down",
    incidentType: "facility-outage",
    category: "facility-outage",
    locationId: "elevator-4",
    assumptions: ["Accessibility impact elevated because the failed asset is an elevator."],
  },
  {
    id: "incident-section-112",
    matcher: /section 112 needs wheelchair access/i,
    title: "Guest needs wheelchair access near Section 112",
    incidentType: "accessibility-assist",
    category: "guest-assistance",
    locationId: "section-112",
    assumptions: ["Guest location inferred from report phrasing near Section 112."],
  },
];

export function parseIncidentReport(
  report: string,
  locations: LocationRecord[],
): Incident[] {
  const normalizedReport = report.trim();

  return templates
    .filter((template) => template.matcher.test(normalizedReport))
    .map((template) => {
      const location = locations.find((item) => item.id === template.locationId);

      if (!location) {
        throw new Error(`Unknown location for template ${template.id}`);
      }

      return {
        id: template.id,
        rawText: normalizedReport.match(template.matcher)?.[0] ?? normalizedReport,
        title: template.title,
        incidentType: template.incidentType,
        category: template.category,
        locationId: location.id,
        locationLabel: location.label,
        priority: derivePriority({
          incidentType: template.incidentType,
          category: template.category,
          locationType: location.type,
        }),
        status: "ready",
        assumptions: template.assumptions,
        evidenceIds: [],
        recommendedActions: [],
        approvedActionIds: [],
        assignedRole: "",
      } satisfies Incident;
    })
    .sort(comparePriority);
}
