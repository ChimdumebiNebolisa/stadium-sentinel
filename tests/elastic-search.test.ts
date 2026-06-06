import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { searchElasticAgentContext } from "@/lib/elastic/search";

describe("searchElasticAgentContext", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      ELASTICSEARCH_URL: "https://elastic.example.com",
      ELASTICSEARCH_API_KEY: "elastic-key",
      ELASTICSEARCH_PLAYBOOKS_INDEX: "stadium_playbooks",
      ELASTICSEARCH_LOCATIONS_INDEX: "stadium_locations",
      ELASTICSEARCH_INCIDENT_EXAMPLES_INDEX: "stadium_incident_examples",
      ELASTICSEARCH_EVIDENCE_INDEX: "stadium_evidence",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("queries each Elastic index and groups the responses", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes("/stadium_playbooks/_search")) {
        return new Response(
          JSON.stringify({
            hits: {
              hits: [
                {
                  _source: {
                    id: "playbook-1",
                    title: "Gate B crowd-flow relief",
                    procedureType: "crowd-flow-procedure",
                    incidentTypes: ["queue-congestion"],
                    locationIds: ["gate-b"],
                    teams: ["Security"],
                    riskTags: ["Crowd-flow risk"],
                    excerpt: "Open overflow queue routing.",
                    body: "Dispatch crowd-flow lead immediately.",
                    searchText: "gate b queue overflow",
                  },
                },
              ],
            },
          }),
        );
      }

      if (url.includes("/stadium_locations/_search")) {
        return new Response(
          JSON.stringify({
            hits: {
              hits: [
                {
                  _source: {
                    id: "section-112",
                    label: "Section 112",
                    aliases: ["section 112", "sec 112"],
                    zoneLayer: "Stands",
                    defaultTeams: ["Guest Services"],
                    operationalRisks: ["escort delay"],
                    accessibilityCritical: true,
                    crowdFlowCritical: true,
                    searchText: "section 112 guest services",
                  },
                },
              ],
            },
          }),
        );
      }

      if (url.includes("/stadium_incident_examples/_search")) {
        return new Response(
          JSON.stringify({
            hits: {
              hits: [
                {
                  _source: {
                    id: "example-1",
                    messyReport: "Guest needs wheelchair access near Section 112.",
                    expectedIncidentIds: ["incident-section-112"],
                    expectedSeverities: ["Immediate"],
                    expectedActions: ["Dispatch Guest Services"],
                    expectedTitles: ["Guest needs wheelchair access near Section 112"],
                    searchText: "wheelchair section 112",
                  },
                },
              ],
            },
          }),
        );
      }

      if (url.includes("/stadium_evidence/_search")) {
        return new Response(
          JSON.stringify({
            hits: {
              hits: [
                {
                  _source: {
                    id: "evidence-1",
                    sourceType: "guest_report",
                    locationIds: ["section-112"],
                    incidentHints: ["accessibility-assist"],
                    excerpt: "Guest report captured by host.",
                    body: "Guest needs a wheelchair escort.",
                    searchText: "guest report wheelchair escort",
                  },
                },
              ],
            },
          }),
        );
      }

      throw new Error(`Unexpected Elastic URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const result = await searchElasticAgentContext({
      report:
        "Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.",
      incidents: [
        {
          id: "incident-section-112",
          title: "Guest needs wheelchair access near Section 112",
          category: "guest-assistance",
          locationId: "section-112",
          locationLabel: "Section 112",
          priority: "Immediate",
        },
      ],
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(result.playbooks[0]?.id).toBe("playbook-1");
    expect(result.locations[0]?.id).toBe("section-112");
    expect(result.incidentExamples[0]?.id).toBe("example-1");
    expect(result.evidence[0]?.id).toBe("evidence-1");
  });
});
