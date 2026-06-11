import { describe, expect, it } from "vitest";

import {
  SEED_INDEX_REQUIREMENTS,
  resolveSeedHealth,
} from "@/lib/elastic/seed-health";

describe("elastic seed health", () => {
  it("defines required operations indices with minimum document counts", () => {
    expect(SEED_INDEX_REQUIREMENTS.length).toBe(9);

    const activeIncidents = SEED_INDEX_REQUIREMENTS.find(
      (requirement) => requirement.defaultName === "stadium_active_incidents",
    );
    const dispatchTimeline = SEED_INDEX_REQUIREMENTS.find(
      (requirement) => requirement.defaultName === "stadium_dispatch_timeline",
    );
    const evidence = SEED_INDEX_REQUIREMENTS.find(
      (requirement) => requirement.defaultName === "stadium_evidence",
    );

    expect(activeIncidents?.minimumRequired).toBe(8);
    expect(dispatchTimeline?.minimumRequired).toBe(8);
    expect(evidence?.minimumRequired).toBe(15);
  });

  it("returns graceful unconfigured health without throwing", async () => {
    const health = await resolveSeedHealth();

    expect(health.ready).toBe(false);
    expect(health.indices).toHaveLength(9);
    expect(health.indices.every((index) => index.exists === false)).toBe(true);
    expect(health.indices.every((index) => index.documentCount === null)).toBe(
      true,
    );
  });
});
