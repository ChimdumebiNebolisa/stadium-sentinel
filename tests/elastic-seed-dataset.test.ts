import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ALLOWED_PRIORITIES = new Set([
  "Immediate",
  "High",
  "Moderate",
  "Monitor",
]);

/** Expected locationId / locationLabel pairs for all eight Elastic active incidents. */
const ACTIVE_INCIDENT_LOCATIONS: Array<{
  id: string;
  locationId: string;
  locationLabel: string;
  narrativeHint: RegExp;
}> = [
  {
    id: "incident-section-112",
    locationId: "section-112",
    locationLabel: "Section 112",
    narrativeHint: /section 112/i,
  },
  {
    id: "incident-elevator-4",
    locationId: "elevator-4",
    locationLabel: "Elevator 4",
    narrativeHint: /elevator 4/i,
  },
  {
    id: "incident-gate-b",
    locationId: "gate-b",
    locationLabel: "Gate B",
    narrativeHint: /gate b/i,
  },
  {
    id: "incident-restroom-outage",
    locationId: "west-concourse",
    locationLabel: "West Concourse",
    narrativeHint: /west concourse/i,
  },
  {
    id: "incident-aisle-spill",
    locationId: "section-204",
    locationLabel: "Section 204",
    narrativeHint: /section 204/i,
  },
  {
    id: "incident-lost-child",
    locationId: "screening-east",
    locationLabel: "East Screening",
    narrativeHint: /north gate|screening/i,
  },
  {
    id: "incident-north-concourse",
    locationId: "north-concourse",
    locationLabel: "North Concourse",
    narrativeHint: /north concourse/i,
  },
  {
    id: "incident-medical-assist",
    locationId: "section-318",
    locationLabel: "Section 318",
    narrativeHint: /section 318/i,
  },
];

const GUEST_ASSISTANCE_LOCATIONS: Array<{
  id: string;
  locationId: string;
  guestLocation: string;
  relatedIncidentId: string;
}> = [
  {
    id: "assist-section-112-1",
    locationId: "section-112",
    guestLocation: "Section 112",
    relatedIncidentId: "incident-section-112",
  },
  {
    id: "assist-lost-child-1",
    locationId: "screening-east",
    guestLocation: "North Gate",
    relatedIncidentId: "incident-lost-child",
  },
  {
    id: "assist-medical-318-1",
    locationId: "section-318",
    guestLocation: "Section 318",
    relatedIncidentId: "incident-medical-assist",
  },
];

const CANONICAL_INCIDENTS = [
  {
    id: "incident-section-112",
    title: "Section 112 assist",
    priority: "Immediate",
    assignedRole: "Guest Services",
  },
  {
    id: "incident-elevator-4",
    title: "Elevator 4 down",
    priority: "High",
    assignedRole: "Facilities",
  },
  {
    id: "incident-gate-b",
    title: "Gate B backed up",
    priority: "High",
    assignedRole: "Security / Crowd Flow",
  },
];

const SEED_FILES = [
  "stadium_active_incidents.json",
  "stadium_guest_assistance.json",
  "stadium_facility_status.json",
  "stadium_gate_flow_logs.json",
  "stadium_staff_roster.json",
  "stadium_policies.json",
  "stadium_radio_transcripts.json",
  "stadium_dispatch_timeline.json",
] as const;

function readSeedFile(filename: string) {
  const filePath = path.join(process.cwd(), "data", "elastic", filename);
  return JSON.parse(readFileSync(filePath, "utf8")) as Array<Record<string, unknown>>;
}

function collectPriorityFields(documents: Array<Record<string, unknown>>): string[] {
  return documents
    .map((document) => document.priority)
    .filter((value): value is string => typeof value === "string");
}

describe("elastic seed dataset", () => {
  it("includes all required seed groups with documents", () => {
    for (const filename of SEED_FILES) {
      const documents = readSeedFile(filename);
      expect(documents.length).toBeGreaterThan(0);
    }
  });

  it("aligns active incident locationId with locationLabel and narrative rawText", () => {
    const activeIncidents = readSeedFile("stadium_active_incidents.json");
    expect(activeIncidents).toHaveLength(8);

    for (const expected of ACTIVE_INCIDENT_LOCATIONS) {
      const incident = activeIncidents.find((document) => document.id === expected.id);
      expect(incident, `missing incident ${expected.id}`).toBeDefined();
      expect(incident?.locationId).toBe(expected.locationId);
      expect(incident?.locationLabel).toBe(expected.locationLabel);

      const rawText =
        typeof incident?.rawText === "string" ? incident.rawText : "";
      expect(rawText).toMatch(expected.narrativeHint);
    }
  });

  it("aligns guest assistance locationId with related incident and guestLocation", () => {
    const activeIncidents = readSeedFile("stadium_active_incidents.json");
    const guestAssistance = readSeedFile("stadium_guest_assistance.json");

    for (const expected of GUEST_ASSISTANCE_LOCATIONS) {
      const record = guestAssistance.find((document) => document.id === expected.id);
      expect(record, `missing guest assistance ${expected.id}`).toBeDefined();
      expect(record?.locationId).toBe(expected.locationId);
      expect(record?.guestLocation).toBe(expected.guestLocation);
      expect(record?.relatedIncidentId).toBe(expected.relatedIncidentId);

      const incident = activeIncidents.find(
        (document) => document.id === expected.relatedIncidentId,
      );
      expect(incident?.locationId).toBe(expected.locationId);
    }
  });

  it("seeds canonical active incidents with required fields", () => {
    const activeIncidents = readSeedFile("stadium_active_incidents.json");
    expect(activeIncidents.length).toBeGreaterThanOrEqual(8);

    for (const canonical of CANONICAL_INCIDENTS) {
      const match = activeIncidents.find((document) => document.id === canonical.id);
      expect(match).toBeDefined();
      expect(match?.title).toBe(canonical.title);
      expect(match?.priority).toBe(canonical.priority);
      expect(match?.assignedRole).toBe(canonical.assignedRole);
      expect(match?.searchText).toBeTruthy();
    }
  });

  it("uses only allowed priority labels across priority-bearing seed docs", () => {
    const priorityDocs = [
      ...readSeedFile("stadium_active_incidents.json"),
      ...readSeedFile("stadium_guest_assistance.json"),
      ...readSeedFile("stadium_gate_flow_logs.json"),
    ];

    for (const priority of collectPriorityFields(priorityDocs)) {
      expect(ALLOWED_PRIORITIES.has(priority)).toBe(true);
    }
  });

  it("avoids forbidden wording in product-facing seed fields", () => {
    const documents = SEED_FILES.flatMap((filename) => readSeedFile(filename));
    const priorityValues = collectPriorityFields(documents);
    const textFields = documents.flatMap((document) =>
      ["title", "excerpt", "rawText", "need", "observation", "body", "label"]
        .map((key) => document[key])
        .filter((value): value is string => typeof value === "string"),
    );

    expect(priorityValues).not.toContain("Critical");
    expect(priorityValues).not.toContain("Low");

    const combinedText = textFields.join(" ").toLowerCase();
    expect(combinedText).not.toContain("severity");
    expect(combinedText).not.toContain("confidence");
    expect(combinedText).not.toMatch(/\bscore\b/);
    expect(combinedText).not.toContain("crm");
    expect(combinedText).not.toContain("ticketing");
  });
});
