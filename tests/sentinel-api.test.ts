import { describe, expect, it, vi, beforeEach } from "vitest";

import { POST } from "@/app/api/sentinel/route";
import * as sentinelAgent from "@/lib/agent/sentinel-agent";
import { buildDemoState } from "@/lib/demo";

vi.mock("@/lib/agent/sentinel-agent", () => ({
  runSentinelAgent: vi.fn(),
}));

describe("sentinel api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns mocked gemini and elastic citations", async () => {
    const demo = buildDemoState();
    const selected = demo.incidentPackages[0]!;

    vi.mocked(sentinelAgent.runSentinelAgent).mockResolvedValue({
      answer: "Dispatch Guest Services to Section 112.",
      evidence: selected.evidence,
      recommendedAction: {
        label: "Dispatch Guest Services",
        actionIndex: 0,
        rationale: "Immediate guest assistance requires acknowledgement.",
      },
      citations: [
        {
          sourceId: "policy-wheelchair-assist",
          title: "Guest Mobility Assistance Standard",
          excerpt: "Acknowledge the guest request immediately.",
          index: "stadium_policies",
        },
      ],
      meta: {
        retrievalMode: "elastic",
        geminiMode: "live",
        elasticMcpMode: "unused",
      },
    });

    const response = await POST(
      new Request("http://localhost/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "What should I do first?",
          incidentId: selected.incident.id,
          context: {
            incidentPackage: selected,
            timeline: demo.timeline,
            queueTitles: demo.incidentPackages.map(({ incident }) => incident.title),
            sourceMode: null,
            pullStatus: null,
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      citations: unknown[];
      meta: { geminiMode: string; retrievalMode: string };
    };
    expect(payload.citations).toHaveLength(1);
    expect(payload.meta.geminiMode).toBe("live");
    expect(payload.meta.retrievalMode).toBe("elastic");
  });

  it("returns 400 when question or incident is missing", async () => {
    const response = await POST(
      new Request("http://localhost/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: "What changed?" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns fallback-friendly response on agent failure", async () => {
    const demo = buildDemoState();
    const selected = demo.incidentPackages[0]!;

    vi.mocked(sentinelAgent.runSentinelAgent)
      .mockRejectedValueOnce(new Error("Gemini unavailable"))
      .mockResolvedValueOnce({
        answer: "Start with the first recommended action for this incident.",
        evidence: selected.evidence,
        recommendedAction: null,
        citations: [],
        meta: {
          retrievalMode: "local",
          geminiMode: "fallback",
          elasticMcpMode: "unused",
        },
      });

    const response = await POST(
      new Request("http://localhost/api/sentinel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "What should I do first?",
          incidentId: selected.incident.id,
          context: {
            incidentPackage: selected,
            timeline: demo.timeline,
            queueTitles: demo.incidentPackages.map(({ incident }) => incident.title),
            sourceMode: null,
            pullStatus: null,
          },
        }),
      }),
    );

    expect(response.status).toBe(200);
    const payload = (await response.json()) as { meta: { geminiMode: string } };
    expect(payload.meta.geminiMode).toBe("fallback");
  });
});
