import { comparePriority, derivePriority } from "@/lib/priority";
import type {
  Incident,
  IncidentCategory,
  IncidentType,
  LocationRecord,
} from "@/lib/types";

type ParseTemplate = {
  id: string;
  title: string;
  incidentType: IncidentType;
  category: IncidentCategory;
  locationId: string;
  signalMatcher: RegExp;
  assumptions: string[];
};

const templates: ParseTemplate[] = [
  {
    id: "incident-gate-b",
    title: "Gate B backed up",
    incidentType: "queue-congestion",
    category: "crowd-flow",
    locationId: "gate-b",
    signalMatcher: /\b(backed up|queue(?:d)?|congestion|bottleneck)\b/i,
    assumptions: ["Queue congestion inferred from ingress delay language."],
  },
  {
    id: "incident-elevator-4",
    title: "Elevator 4 down",
    incidentType: "facility-outage",
    category: "facility-outage",
    locationId: "elevator-4",
    signalMatcher: /\b(is down|down|out(?:age)?|offline|stuck)\b/i,
    assumptions: ["Accessibility impact elevated because the failed asset is an elevator."],
  },
  {
    id: "incident-section-112",
    title: "Guest needs wheelchair access near Section 112",
    incidentType: "accessibility-assist",
    category: "guest-assistance",
    locationId: "section-112",
    signalMatcher: /\b(wheelchair access|accessible support|accessibility help|mobility assist)\b/i,
    assumptions: ["Guest location inferred from report phrasing near Section 112."],
  },
];

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesLocationAlias(report: string, location: LocationRecord): boolean {
  return location.aliases.some((alias) =>
    new RegExp(`\\b${escapeRegExp(alias)}\\b`, "i").test(report),
  );
}

export function parseIncidentReport(
  report: string,
  locations: LocationRecord[],
): Incident[] {
  const normalizedReport = report.trim();

  return templates
    .filter((template) => {
      const location = locations.find((item) => item.id === template.locationId);

      if (!location) {
        throw new Error(`Unknown location for template ${template.id}`);
      }

      return (
        template.signalMatcher.test(normalizedReport) &&
        matchesLocationAlias(normalizedReport, location)
      );
    })
    .map((template) => {
      const location = locations.find((item) => item.id === template.locationId);

      if (!location) {
        throw new Error(`Unknown location for template ${template.id}`);
      }

      return {
        id: template.id,
        rawText: normalizedReport,
        title: template.title,
        incidentType: template.incidentType,
        category: template.category,
        locationId: location.id,
        locationLabel: location.name,
        priority: derivePriority({
          incidentType: template.incidentType,
          category: template.category,
          location,
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
