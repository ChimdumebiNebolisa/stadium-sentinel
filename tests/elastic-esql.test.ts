import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeBoundedEsql } from "@/lib/elastic/esql";
import * as client from "@/lib/elastic/client";
import type { BoundedEsqlOperation } from "@/lib/types";

vi.mock("@/lib/elastic/client", () => ({
  getElasticConfig: vi.fn(),
  elasticFetch: vi.fn(),
}));

describe("Elastic ES|QL Operations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should append properly bounded queries", async () => {
    vi.mocked(client.getElasticConfig).mockReturnValue({
      incidentMemoryIndex: "test_memory_index",
      url: "http://elastic",
      apiKey: "123",
      playbooksIndex: "",
      locationsIndex: "",
      evidenceIndex: "",
      incidentExamplesIndex: "",
    });

    vi.mocked(client.elasticFetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ hits: [] }),
    } as unknown as Response);

    await executeBoundedEsql("count_by_priority");

    expect(client.elasticFetch).toHaveBeenCalledWith(
      "/_query?format=json",
      expect.objectContaining({
        method: "POST",
      })
    );

    const callArgs = vi.mocked(client.elasticFetch).mock.calls[0];
    const bodyObj = JSON.parse((callArgs[1] as RequestInit).body as string);
    expect(bodyObj.query).toBe("FROM test_memory_index | STATS count = COUNT() BY priority");
  });

  it("should structurally reject invalid enums at runtime", async () => {
    vi.mocked(client.getElasticConfig).mockReturnValue({
      incidentMemoryIndex: "test_memory_index",
      url: "http://elastic",
      apiKey: "123",
      playbooksIndex: "",
      locationsIndex: "",
      evidenceIndex: "",
      incidentExamplesIndex: "",
    });

    // We pass an invalid operation as type coercion to test real runtime boundary
    await expect(
      executeBoundedEsql("DROP TABLE memory" as unknown as BoundedEsqlOperation),
    ).rejects.toThrow("Unsupported ES|QL operation");
  });
});
