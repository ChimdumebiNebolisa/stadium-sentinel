import { describe, expect, it } from "vitest";

import {
  buildSentinelResponseSchema,
  validateSentinelAgentResponse,
  validateSentinelAskResponse,
} from "@/lib/agent/sentinel-schema";
import { runSentinelAgent } from "@/lib/agent/sentinel-agent";
import { buildDemoState } from "@/lib/demo";

describe("sentinel agent", () => {
  it("validates successful sentinel response schema", () => {
    const validated = validateSentinelAgentResponse({
      answer: "Dispatch Guest Services to Section 112 and confirm the accessible route.",
      recommendedAction: {
        label: "Dispatch Guest Services",
        actionIndex: 0,
        rationale: "Guest assistance is Immediate priority at Section 112.",
      },
      citations: [
        {
          sourceId: "policy-wheelchair-assist",
          title: "Guest Mobility Assistance Standard",
          excerpt: "Guests requesting wheelchair access require direct acknowledgement.",
          index: "stadium_policies",
        },
      ],
    });

    expect(validated.answer).toContain("Dispatch Guest Services");
    expect(validated.citations).toHaveLength(1);
    expect(buildSentinelResponseSchema().type).toBe("OBJECT");
  });

  it("returns fallback when agent backend is disabled", async () => {
    const demo = buildDemoState();
    const selected = demo.incidentPackages[0]!;

    const response = await runSentinelAgent({
      question: "What should I do first?",
      incidentId: selected.incident.id,
      context: {
        incidentPackage: selected,
        timeline: demo.timeline,
        queueTitles: demo.incidentPackages.map(({ incident }) => incident.title),
        sourceMode: null,
        pullStatus: null,
      },
    });

    expect(response.meta.geminiMode).toBe("fallback");
    expect(response.answer.length).toBeGreaterThan(0);
    expect(validateSentinelAskResponse(response).answer).toBe(response.answer);
  });
});
