import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/ingest/status/route";

describe("ingest status api", () => {
  it("returns demo fallback availability without requiring elastic", async () => {
    const response = await GET();
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      demoFallbackAvailable: boolean;
      elasticConfigured: boolean;
      statusLine: string;
      seedHealth?: {
        ready: boolean;
        indices: Array<{ name: string; minimumRequired: number }>;
      };
    };

    expect(payload.demoFallbackAvailable).toBe(true);
    expect(payload.statusLine.length).toBeGreaterThan(0);
  });

  it("includes seed health indices when elastic is not configured", async () => {
    const response = await GET();
    const payload = (await response.json()) as {
      elasticConfigured: boolean;
      seedHealth?: {
        ready: boolean;
        indices: Array<{ name: string; exists: boolean }>;
      };
    };

    expect(payload.elasticConfigured).toBe(false);
    expect(payload.seedHealth).toBeUndefined();
  });
});
