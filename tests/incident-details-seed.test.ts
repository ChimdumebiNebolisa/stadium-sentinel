import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { INCIDENT_DETAILS_SEED } from "@/lib/incident-details-seed";

const ELASTIC_INCIDENT_IDS = [
  "incident-section-112",
  "incident-elevator-4",
  "incident-gate-b",
  "incident-restroom-outage",
  "incident-aisle-spill",
  "incident-lost-child",
  "incident-north-concourse",
  "incident-medical-assist",
] as const;

function readLocationIds(): Set<string> {
  const filePath = path.join(process.cwd(), "data", "locations.json");
  const locations = JSON.parse(readFileSync(filePath, "utf8")) as Array<{ id: string }>;
  return new Set(locations.map((location) => location.id));
}

describe("incident details seed enrichment", () => {
  it("covers all eight Elastic incidents with operational enrichment fields", () => {
    for (const incidentId of ELASTIC_INCIDENT_IDS) {
      const details = INCIDENT_DETAILS_SEED[incidentId];
      expect(details, incidentId).toBeDefined();
      expect(details?.sourceRecords?.length).toBeGreaterThan(0);
      expect(details?.commandCenterNotes?.length).toBeGreaterThan(0);
      expect(details?.operationsUpdates?.length).toBeGreaterThan(0);
      expect(details?.staffFieldReports?.length).toBeGreaterThan(0);
      expect(details?.mediaMetadata?.length).toBeGreaterThan(0);
      expect(details?.dispatchHandoff).toBeDefined();
    }
  });

  it("uses operational source-system framing without forbidden product language", () => {
    const serialized = JSON.stringify(INCIDENT_DETAILS_SEED).toLowerCase();
    expect(serialized).not.toContain("crm");
    expect(serialized).not.toContain("ticketing");
    expect(serialized).not.toContain("customer account");
    expect(serialized).not.toContain("analytics dashboard");
    expect(serialized).not.toContain("severity");
    expect(serialized).not.toContain("confidence");
    expect(serialized).not.toMatch(/\bscore\b/);
    expect(serialized).not.toContain("venue map");
    expect(serialized).not.toContain("seat map");
  });

  it("uses location registry IDs introduced in Batch 1A", () => {
    const locationIds = readLocationIds();
    for (const locationId of ["section-204", "section-318", "north-concourse"]) {
      expect(locationIds.has(locationId)).toBe(true);
    }
  });
});
