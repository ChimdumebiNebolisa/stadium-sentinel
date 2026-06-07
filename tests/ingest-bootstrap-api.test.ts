import { describe, expect, it, vi, beforeEach } from "vitest";

import { POST } from "@/app/api/ingest/bootstrap/route";
import * as bootstrapModule from "@/lib/elastic/bootstrap";
import * as clientModule from "@/lib/elastic/client";

vi.mock("@/lib/elastic/bootstrap", () => ({
  resolveElasticBootstrap: vi.fn(),
}));

vi.mock("@/lib/elastic/client", () => ({
  isElasticConfigured: vi.fn(),
}));

describe("ingest bootstrap api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unconfigured outcome without exposing secrets", async () => {
    vi.mocked(clientModule.isElasticConfigured).mockReturnValue(false);
    vi.mocked(bootstrapModule.resolveElasticBootstrap).mockResolvedValue({
      outcome: "unconfigured",
    });

    const response = await POST();
    expect(response.status).toBe(200);

    const payload = (await response.json()) as Record<string, unknown>;
    expect(payload.outcome).toBe("unconfigured");
    expect(payload.elasticConfigured).toBe(false);
    expect(payload).not.toHaveProperty("apiKey");
    expect(payload).not.toHaveProperty("url");
  });

  it("returns ready outcome with skipped true when seed is already ready", async () => {
    vi.mocked(clientModule.isElasticConfigured).mockReturnValue(true);
    vi.mocked(bootstrapModule.resolveElasticBootstrap).mockResolvedValue({
      outcome: "ready",
      skipped: true,
      seedHealth: {
        ready: true,
        indices: [],
      },
    });

    const response = await POST();
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      outcome: string;
      skipped: boolean;
      seedHealth?: { ready: boolean };
    };
    expect(payload.outcome).toBe("ready");
    expect(payload.skipped).toBe(true);
    expect(payload.seedHealth?.ready).toBe(true);
  });

  it("returns seeded outcome after bootstrap run", async () => {
    vi.mocked(clientModule.isElasticConfigured).mockReturnValue(true);
    vi.mocked(bootstrapModule.resolveElasticBootstrap).mockResolvedValue({
      outcome: "seeded",
      seedHealth: {
        ready: true,
        indices: [{ name: "stadium_active_incidents", envKey: "x", documentCount: 8, minimumRequired: 8, exists: true }],
      },
      indexedCounts: [{ indexName: "stadium_active_incidents", count: 8 }],
    });

    const response = await POST();
    expect(response.status).toBe(200);

    const payload = (await response.json()) as { outcome: string; indexedCounts?: unknown[] };
    expect(payload.outcome).toBe("seeded");
    expect(payload.indexedCounts).toHaveLength(1);
  });

  it("returns failed outcome with safe error summary", async () => {
    vi.mocked(clientModule.isElasticConfigured).mockReturnValue(true);
    vi.mocked(bootstrapModule.resolveElasticBootstrap).mockResolvedValue({
      outcome: "failed",
      seedHealth: { ready: false, indices: [] },
      errorSummary: "Bulk indexing failed for stadium_active_incidents with status 500.",
    });

    const response = await POST();
    expect(response.status).toBe(200);

    const payload = (await response.json()) as {
      outcome: string;
      errorSummary?: string;
    };
    expect(payload.outcome).toBe("failed");
    expect(payload.errorSummary).toContain("Bulk indexing failed");
  });
});
