import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { loadSeedSets } from "@/lib/elastic/bootstrap";
import { SEED_INDEX_REQUIREMENTS } from "@/lib/elastic/seed-health";

function readSeedCount(filename: string): number {
  const filePath = path.join(process.cwd(), "data", "elastic", filename);
  const documents = JSON.parse(readFileSync(filePath, "utf8")) as unknown[];
  return documents.length;
}

const SEED_FILE_BY_INDEX: Record<string, string> = {
  stadium_active_incidents: "stadium_active_incidents.json",
  stadium_guest_assistance: "stadium_guest_assistance.json",
  stadium_facility_status: "stadium_facility_status.json",
  stadium_gate_flow_logs: "stadium_gate_flow_logs.json",
  stadium_staff_roster: "stadium_staff_roster.json",
  stadium_policies: "stadium_policies.json",
  stadium_radio_transcripts: "stadium_radio_transcripts.json",
  stadium_dispatch_timeline: "stadium_dispatch_timeline.json",
  stadium_evidence: "stadium_evidence.json",
};

describe("elastic bootstrap seed counts", () => {
  it("ships local seed files that meet seed-health minimum document counts", () => {
    for (const requirement of SEED_INDEX_REQUIREMENTS) {
      const filename = SEED_FILE_BY_INDEX[requirement.defaultName];
      expect(filename, requirement.defaultName).toBeTruthy();
      const count = readSeedCount(filename!);
      expect(
        count,
        `${requirement.defaultName} has ${count} docs; need ${requirement.minimumRequired}`,
      ).toBeGreaterThanOrEqual(requirement.minimumRequired);
    }
  });

  it("loads seed sets with enriched active incidents including details", async () => {
    process.env.ELASTICSEARCH_URL = "https://example.elastic.cloud";
    process.env.ELASTICSEARCH_API_KEY = "test-api-key";

    const seedSets = await loadSeedSets();
    const activeSet = seedSets.find(
      (set) => set.indexName === "stadium_active_incidents",
    );

    expect(activeSet?.documents).toHaveLength(8);
    for (const document of activeSet?.documents ?? []) {
      expect(document.details).toBeDefined();
    }
  });
});
