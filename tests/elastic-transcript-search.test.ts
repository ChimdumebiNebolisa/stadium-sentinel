import { describe, expect, it, vi, beforeEach } from "vitest";

import * as client from "@/lib/elastic/client";
import {
  isRadioTranscriptQuestion,
  mergeRadioTranscriptCitations,
  searchElasticRadioTranscripts,
} from "@/lib/elastic/transcript-search";

vi.mock("@/lib/elastic/client", () => ({
  isElasticConfigured: vi.fn(),
  getElasticConfig: vi.fn(),
  elasticFetch: vi.fn(),
}));

describe("elastic transcript search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects radio transcript questions", () => {
    expect(isRadioTranscriptQuestion("What did the radio log add?")).toBe(true);
    expect(isRadioTranscriptQuestion("What should I do first?")).toBe(false);
  });

  it("returns radio transcript citations from elastic search hits", async () => {
    vi.mocked(client.isElasticConfigured).mockReturnValue(true);
    vi.mocked(client.getElasticConfig).mockReturnValue({
      url: "http://elastic",
      apiKey: "key",
      radioTranscriptsIndex: "stadium_radio_transcripts",
      playbooksIndex: "",
      locationsIndex: "",
      incidentExamplesIndex: "",
      evidenceIndex: "",
      incidentMemoryIndex: "",
      activeIncidentsIndex: "",
      guestAssistanceIndex: "",
      facilityStatusIndex: "",
      gateFlowLogsIndex: "",
      staffRosterIndex: "",
      policiesIndex: "",
      dispatchTimelineIndex: "",
    });

    vi.mocked(client.elasticFetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        hits: {
          hits: [
            {
              _source: {
                id: "transcript-standard-ops",
                label: "Standard ops preset",
                lines: ["Gate B is backed up."],
                excerpt: "Gate B queue pressure.",
                recordedAt: "2026-06-07T11:37:00.000Z",
                matchedIncidentHints: ["gate-b"],
                relatedIncidentIds: ["incident-gate-b"],
                searchText: "gate b radio",
              },
            },
          ],
        },
      }),
    } as Response);

    const transcripts = await searchElasticRadioTranscripts({
      queryText: "What did the radio log add?",
      incidentId: "incident-gate-b",
    });

    expect(transcripts).toHaveLength(1);
    const citations = mergeRadioTranscriptCitations(
      transcripts,
      "stadium_radio_transcripts",
      new Set(),
    );
    expect(citations[0]?.index).toBe("stadium_radio_transcripts");
    expect(citations[0]?.title).toBe("Standard ops preset");
  });
});
