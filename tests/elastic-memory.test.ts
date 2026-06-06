import { describe, it, expect, vi, beforeEach } from "vitest";
import { appendIncidentMemory } from "@/lib/elastic/memory";
import * as client from "@/lib/elastic/client";
import type { StadiumIncidentMemoryDocument } from "@/lib/types";

vi.mock("@/lib/elastic/client", () => ({
  getElasticConfig: vi.fn(),
  elasticFetch: vi.fn(),
}));

describe("Elastic Memory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockValidDoc: StadiumIncidentMemoryDocument = {
    timestamp: "2026-06-06T12:00:00.000Z",
    incidentId: "incident-test",
    title: "Test",
    locationId: "loc",
    locationLabel: "Location",
    team: "Security",
    priority: "High",
    status: "actioned",
    summary: "Testing",
    approvedActionIds: [],
    evidenceRefs: [],
    source: "test",
  };

  it("should format and send ndjson correctly", async () => {
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
    } as Response);

    await appendIncidentMemory([mockValidDoc]);

    expect(client.elasticFetch).toHaveBeenCalledWith(
      "/_bulk",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/x-ndjson" },
      })
    );

    const callArgs = vi.mocked(client.elasticFetch).mock.calls[0];
    const bodyStr = (callArgs[1] as RequestInit).body as string;

    const parts = bodyStr.split("\n").filter(Boolean);
    expect(parts).toHaveLength(2);
    expect(JSON.parse(parts[0])).toEqual({ index: { _index: "test_memory_index" } });
    expect(JSON.parse(parts[1]).incidentId).toBe("incident-test");
  });

  it("should swallow rejection cleanly (simulate fetch fail)", async () => {
    vi.mocked(client.getElasticConfig).mockReturnValue({
      incidentMemoryIndex: "test_memory_index",
      url: "http://elastic",
      apiKey: "123",
      playbooksIndex: "",
      locationsIndex: "",
      evidenceIndex: "",
      incidentExamplesIndex: "",
    });

    vi.mocked(client.elasticFetch).mockRejectedValue(new Error("Network fail"));

    // Should not throw
    await expect(appendIncidentMemory([mockValidDoc])).resolves.not.toThrow();
  });

  it("should short-circuit if no config is available", async () => {
    vi.mocked(client.getElasticConfig).mockReturnValue(null);

    await appendIncidentMemory([mockValidDoc]);
    expect(client.elasticFetch).not.toHaveBeenCalled();
  });
});
