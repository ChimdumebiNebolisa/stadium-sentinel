import { describe, expect, it } from "vitest";

import {
  SEED_INDEX_REQUIREMENTS,
  resolveSeedHealth,
} from "@/lib/elastic/seed-health";

describe("elastic seed health", () => {
  it("defines required operations indices with minimum document counts", () => {
    expect(SEED_INDEX_REQUIREMENTS.length).toBe(8);

    const activeIncidents = SEED_INDEX_REQUIREMENTS.find(
      (requirement) => requirement.defaultName === "stadium_active_incidents",
    );

    expect(activeIncidents?.minimumRequired).toBe(8);
  });

  it("returns graceful unconfigured health without throwing", async () => {
    const health = await resolveSeedHealth();

    expect(health.ready).toBe(false);
    expect(health.indices).toHaveLength(8);
    expect(health.indices.every((index) => index.exists === false)).toBe(true);
    expect(health.indices.every((index) => index.documentCount === null)).toBe(
      true,
    );
  });
});
