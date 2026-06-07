import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/ingest/status/route";

describe("ingest status api", () => {
  it("returns demo fallback availability without requiring elastic", async () => {
    const response = await GET();
    const payload = (await response.json()) as {
      demoFallbackAvailable: boolean;
      elasticConfigured: boolean;
      statusLine: string;
    };

    expect(payload.demoFallbackAvailable).toBe(true);
    expect(payload.statusLine.length).toBeGreaterThan(0);
  });
});
