import { describe, expect, it } from "vitest";

import { locationRecords } from "@/lib/data";
import { parseIncidentReport } from "@/lib/incident-parser";

describe("parseIncidentReport", () => {
  it("produces exactly three incidents and sorts them by operational priority", () => {
    const incidents = parseIncidentReport(
      "Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.",
      locationRecords,
    );

    expect(incidents).toHaveLength(3);
    expect(incidents.map((incident) => incident.id)).toEqual([
      "incident-section-112",
      "incident-elevator-4",
      "incident-gate-b",
    ]);
    expect(incidents.map((incident) => incident.priority)).toEqual([
      "Immediate",
      "High",
      "High",
    ]);
    expect(Object.keys(incidents[0]).sort()).toEqual([
      "approvedActionIds",
      "assignedRole",
      "assumptions",
      "category",
      "evidenceIds",
      "id",
      "incidentType",
      "locationId",
      "locationLabel",
      "priority",
      "rawText",
      "recommendedActions",
      "status",
      "title",
    ]);
  });

  it("matches incident locations through topology aliases", () => {
    const incidents = parseIncidentReport(
      "Entry Gate B is backed up, Lift 4 is down, and a guest near Sec 112 needs wheelchair access.",
      locationRecords,
    );

    expect(incidents.map((incident) => incident.locationLabel)).toEqual([
      "Section 112",
      "Elevator 4",
      "Gate B",
    ]);
  });
});
