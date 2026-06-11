import { describe, expect, it } from "vitest";

import { buildSentinelUserPrompt } from "@/lib/agent/sentinel-prompt";
import { INCIDENT_DETAILS_SEED } from "@/lib/incident-details-seed";
import type { SentinelAskRequest } from "@/lib/agent/sentinel-schema";
import type { IncidentPackage } from "@/lib/types";

function buildRequest(incidentPackage: IncidentPackage): SentinelAskRequest {
  return {
    question: "Who is handling this incident?",
    context: {
      incidentPackage,
      queueTitles: [incidentPackage.incident.title],
    },
  };
}

describe("sentinel operational context", () => {
  it("includes roster, source records, and citation hints in the user prompt", () => {
    const details = INCIDENT_DETAILS_SEED["incident-section-112"];
    const incidentPackage: IncidentPackage = {
      incident: {
        id: "incident-section-112",
        rawText: "Guest near Section 112 needs wheelchair access.",
        title: "Section 112 assist",
        incidentType: "accessibility-assist",
        category: "guest-assistance",
        locationId: "section-112",
        locationLabel: "Section 112",
        priority: "Immediate",
        status: "new",
        assumptions: [],
        evidenceIds: [],
        recommendedActions: ["Dispatch Guest Services"],
        approvedActionIds: [],
        assignedRole: "Guest Services",
        details,
      },
      evidence: [],
      staffUpdate: "Guest Services to Section 112.",
      assignedStaff: [
        {
          callSign: "GS-1",
          team: "Guest Services",
          displayName: "Guest Services Lead",
          zone: "Lower bowl",
        },
      ],
    };

    const prompt = buildSentinelUserPrompt({
      request: buildRequest(incidentPackage),
      retrieval: {
        evidence: [],
        playbooks: [],
        locations: [],
        incidentExamples: [],
      },
    });

    expect(prompt).toContain("GS-1");
    expect(prompt).toContain("GS-REQ-2026-0412");
    expect(prompt).toContain("Guest Services intake");
    expect(prompt).not.toContain("CRM");
    expect(prompt).not.toContain("ticketing");
  });
});
