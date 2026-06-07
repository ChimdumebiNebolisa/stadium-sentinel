import type {
  IncidentCategory,
  IncidentPackage,
  IncidentType,
  PriorityLevel,
} from "@/lib/types";

export const DEMO_INCIDENTS_KEY = "stadium-sentinel-demo-incidents";
export const DEMO_PULL_HISTORY_KEY = "stadium-sentinel-demo-pull-history";

const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  Immediate: 0,
  High: 1,
  Moderate: 2,
  Monitor: 3,
};

export type DemoStoredIncident = {
  id: string;
  title: string;
  priority: PriorityLevel;
  incidentType: IncidentType;
  category: IncidentCategory;
  team: string;
  location: string;
  status: string;
  summary: string;
  evidence: string[];
  timeline: string[];
};

export type DemoIncidentBatch = {
  generatedAt: string;
  incidents: DemoStoredIncident[];
};

type PullHistory = {
  pulls: number[];
};

export const DEMO_INCIDENT_POOL: DemoStoredIncident[] = [
  {
    id: "incident-section-112",
    title: "Section 112 assist",
    priority: "Immediate",
    incidentType: "accessibility-assist",
    category: "guest-assistance",
    team: "Guest Services",
    location: "Section 112",
    status: "new",
    summary: "Guest reported need for wheelchair access near Section 112.",
    evidence: [
      "Guest Services runbook active",
      "Accessibility route via Gate D confirmed",
    ],
    timeline: [
      "11:42 AM: Incident created",
      "11:43 AM: Guest Services notified",
    ],
  },
  {
    id: "incident-elevator-4",
    title: "Elevator 4 down",
    priority: "High",
    incidentType: "facility-outage",
    category: "facility-outage",
    team: "Facilities",
    location: "Elevator 4",
    status: "new",
    summary: "Elevator 4 in the East Stand is out of service.",
    evidence: [
      "Facilities outage runbook active",
      "Accessible reroute via Elevator 3 available",
    ],
    timeline: [
      "11:41 AM: Outage reported",
      "11:42 AM: Facilities dispatched",
    ],
  },
  {
    id: "incident-gate-b",
    title: "Gate B backed up",
    priority: "High",
    incidentType: "queue-congestion",
    category: "crowd-flow",
    team: "Security / Crowd Flow",
    location: "Gate B",
    status: "new",
    summary: "Gate B ingress queue extending into perimeter lane.",
    evidence: [
      "Crowd flow runbook active",
      "Secondary gate routing available",
    ],
    timeline: [
      "11:38 AM: Congestion reported",
      "11:41 AM: Security notified",
    ],
  },
  {
    id: "incident-restroom-outage",
    title: "Restroom out of order",
    priority: "Moderate",
    incidentType: "facility-outage",
    category: "facility-outage",
    team: "Facilities",
    location: "West Concourse",
    status: "new",
    summary: "West Concourse restroom facility is out of service.",
    evidence: [
      "Facilities maintenance runbook active",
      "Nearest alternate restroom at Section 210",
    ],
    timeline: [
      "11:45 AM: Outage reported",
      "11:46 AM: Facilities en route",
    ],
  },
  {
    id: "incident-aisle-spill",
    title: "Spill near aisle",
    priority: "High",
    incidentType: "facility-outage",
    category: "facility-outage",
    team: "Facilities",
    location: "Section 204",
    status: "new",
    summary: "Liquid spill near Section 204 aisle creating slip hazard.",
    evidence: [
      "Hazard response runbook active",
      "Wet floor signage kit available in closet C2",
    ],
    timeline: [
      "11:50 AM: Spill reported by usher",
      "11:51 AM: Cleanup crew dispatched",
    ],
  },
  {
    id: "incident-lost-child",
    title: "Lost child report",
    priority: "Immediate",
    incidentType: "accessibility-assist",
    category: "guest-assistance",
    team: "Security",
    location: "North Gate",
    status: "new",
    summary: "Child separated from guardian near North Gate entrance.",
    evidence: [
      "Lost child protocol active",
      "Family services station at Gate A staffed",
    ],
    timeline: [
      "11:55 AM: Report received",
      "11:56 AM: Security and Guest Services alerted",
    ],
  },
  {
    id: "incident-freezer-alarm",
    title: "Concession freezer alarm",
    priority: "Moderate",
    incidentType: "facility-outage",
    category: "facility-outage",
    team: "Facilities",
    location: "Concession Stand C",
    status: "new",
    summary: "Temperature alarm triggered on freezer unit at Concession Stand C.",
    evidence: [
      "Facilities equipment runbook active",
      "Backup cold storage available in loading dock",
    ],
    timeline: [
      "11:48 AM: Alarm triggered",
      "11:49 AM: Facilities notified",
    ],
  },
  {
    id: "incident-north-concourse",
    title: "North concourse crowding",
    priority: "High",
    incidentType: "queue-congestion",
    category: "crowd-flow",
    team: "Security / Crowd Flow",
    location: "North Concourse",
    status: "new",
    summary: "Crowd density building on North Concourse near Section 300 entry.",
    evidence: [
      "Crowd flow runbook active",
      "Concourse relief route via Service Corridor B available",
    ],
    timeline: [
      "11:44 AM: Congestion flagged",
      "11:45 AM: Crowd flow team en route",
    ],
  },
  {
    id: "incident-medical-assist",
    title: "Guest medical assist",
    priority: "Immediate",
    incidentType: "accessibility-assist",
    category: "guest-assistance",
    team: "Guest Services",
    location: "Section 318",
    status: "new",
    summary: "Guest in Section 318 reporting dizziness. Medical response requested.",
    evidence: [
      "Medical response runbook active",
      "First-aid station at Section 300 concourse staffed",
    ],
    timeline: [
      "11:52 AM: Medical request received",
      "11:53 AM: First aid dispatched",
    ],
  },
  {
    id: "incident-blocked-aisle",
    title: "Radio report: blocked aisle",
    priority: "High",
    incidentType: "queue-congestion",
    category: "crowd-flow",
    team: "Security / Crowd Flow",
    location: "East Concourse",
    status: "new",
    summary: "Radio report of blocked aisle on East Concourse near Exit 7.",
    evidence: [
      "Crowd flow runbook active",
      "Exit 8 available as overflow route",
    ],
    timeline: [
      "11:47 AM: Radio report received",
      "11:48 AM: Security routing to location",
    ],
  },
];

function shuffle<T>(array: T[]): T[] {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickBatch(pool: DemoStoredIncident[]): DemoStoredIncident[] {
  const count = 3 + Math.floor(Math.random() * 3); // 3, 4, or 5
  const shuffled = shuffle(pool);
  let selected = shuffled.slice(0, count);

  const hasImmediate = selected.some((i) => i.priority === "Immediate");
  if (!hasImmediate) {
    const immediates = DEMO_INCIDENT_POOL.filter((i) => i.priority === "Immediate");
    if (immediates.length > 0) {
      selected[selected.length - 1] = immediates[Math.floor(Math.random() * immediates.length)];
    }
  }

  return selected.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]);
}

function sortedIdKey(incidents: DemoStoredIncident[]): string {
  return [...incidents.map((i) => i.id)].sort().join(",");
}

export function generateDemoIncidentBatch(): DemoIncidentBatch {
  const previous = loadDemoIncidentBatch();
  const previousKey = previous ? sortedIdKey(previous.incidents) : null;

  let selected = pickBatch(DEMO_INCIDENT_POOL);
  let attempts = 0;

  while (attempts < 3 && previousKey !== null && sortedIdKey(selected) === previousKey) {
    selected = pickBatch(DEMO_INCIDENT_POOL);
    attempts++;
  }

  return {
    generatedAt: new Date().toISOString(),
    incidents: selected,
  };
}

export function saveDemoIncidentBatch(batch: DemoIncidentBatch): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEMO_INCIDENTS_KEY, JSON.stringify(batch));
  } catch {
    // localStorage unavailable (private browsing quota, etc.) — fail silently
  }
}

export function clearDemoIncidentBatch(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DEMO_INCIDENTS_KEY);
  } catch {
    // fail silently
  }
}

function isValidStoredIncident(value: unknown): value is DemoStoredIncident {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  const validPriorities = ["Immediate", "High", "Moderate", "Monitor"];
  const validTypes = ["queue-congestion", "facility-outage", "accessibility-assist"];
  const validCategories = ["crowd-flow", "facility-outage", "guest-assistance"];

  return (
    typeof v["id"] === "string" &&
    typeof v["title"] === "string" &&
    validPriorities.includes(v["priority"] as string) &&
    validTypes.includes(v["incidentType"] as string) &&
    validCategories.includes(v["category"] as string) &&
    typeof v["team"] === "string" &&
    typeof v["location"] === "string" &&
    typeof v["status"] === "string" &&
    typeof v["summary"] === "string" &&
    Array.isArray(v["evidence"]) &&
    Array.isArray(v["timeline"])
  );
}

function isValidBatch(value: unknown): value is DemoIncidentBatch {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v["generatedAt"] === "string" &&
    Array.isArray(v["incidents"]) &&
    (v["incidents"] as unknown[]).length > 0 &&
    (v["incidents"] as unknown[]).every(isValidStoredIncident)
  );
}

export function loadDemoIncidentBatch(): DemoIncidentBatch | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_INCIDENTS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isValidBatch(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function checkRateLimit(): { allowed: boolean } {
  if (typeof window === "undefined") return { allowed: true };
  try {
    const raw = window.localStorage.getItem(DEMO_PULL_HISTORY_KEY);
    if (!raw) return { allowed: true };
    const history = JSON.parse(raw) as PullHistory;
    const now = Date.now();
    const recent = history.pulls.filter((t) => now - t < 60_000);
    return { allowed: recent.length < 2 };
  } catch {
    return { allowed: true };
  }
}

export function recordPull(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(DEMO_PULL_HISTORY_KEY);
    const history: PullHistory = raw ? (JSON.parse(raw) as PullHistory) : { pulls: [] };
    const now = Date.now();
    const pruned = history.pulls.filter((t) => now - t < 60_000);
    pruned.push(now);
    window.localStorage.setItem(DEMO_PULL_HISTORY_KEY, JSON.stringify({ pulls: pruned }));
  } catch {
    // fail silently
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function actionsForTeam(team: string): string[] {
  const t = team.toLowerCase();
  if (t.includes("guest")) {
    return ["Dispatch Guest Services", "Route details to team", "Radio handoff"];
  }
  if (t.includes("security") || t.includes("crowd")) {
    return ["Dispatch Security", "Monitor crowd flow", "Radio advisory"];
  }
  if (t.includes("facilities")) {
    return ["Dispatch Facilities", "Isolate affected area", "Log maintenance ticket"];
  }
  return ["Dispatch team", "Route details", "Confirm resolution"];
}

function buildAssumptions(stored: DemoStoredIncident): string[] {
  const priorityReason: Record<PriorityLevel, string> = {
    Immediate:
      "Triaged as Immediate. Guest safety or accessibility requires an immediate response.",
    High: "Triaged as High. Operational disruption is affecting multiple guests or a key area.",
    Moderate: "Triaged as Moderate. Localized issue with a known resolution path.",
    Monitor: "Triaged as Monitor. Limited operational impact; continue tracking for escalation.",
  };
  const firstAction = actionsForTeam(stored.team)[0];
  const teamReason = firstAction
    ? `${stored.team} assigned. Best match for this incident type based on the dispatch runbook.`
    : "Operations team assigned as default responder.";
  const evidenceReason = stored.evidence[0]
    ? `Supporting evidence: ${stored.evidence[0]}.`
    : "No supporting evidence on record.";
  const nextAction = firstAction
    ? `Recommended next action: ${firstAction}.`
    : "Awaiting dispatch confirmation.";
  return [priorityReason[stored.priority], teamReason, evidenceReason, nextAction];
}

export function localStorageIncidentToPackage(stored: DemoStoredIncident): IncidentPackage {
  const recommendedActions = actionsForTeam(stored.team);
  return {
    incident: {
      id: stored.id,
      rawText: stored.summary,
      title: stored.title,
      incidentType: stored.incidentType,
      category: stored.category,
      locationId: slugify(stored.location),
      locationLabel: stored.location,
      priority: stored.priority,
      status: stored.status === "actioned" ? "actioned" : stored.status === "ready" ? "ready" : "new",
      assumptions: buildAssumptions(stored),
      evidenceIds: [],
      recommendedActions,
      approvedActionIds: [],
      assignedRole: stored.team,
    },
    evidence: stored.evidence.map((e, index) => ({
      title: e,
      sourceType: "policy" as const,
      excerpt: e,
      rationale: "On-file incident evidence",
      sourceId: `demo-${stored.id}-${index}`,
    })),
    staffUpdate: stored.summary,
  };
}

export function getPoolIncidentById(id: string): DemoStoredIncident | undefined {
  return DEMO_INCIDENT_POOL.find((incident) => incident.id === id);
}

