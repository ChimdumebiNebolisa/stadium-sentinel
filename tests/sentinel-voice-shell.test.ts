import { describe, expect, it } from "vitest";

import { answerSentinelQuestion } from "@/lib/sentinel-command-agent";
import { SENTINEL_MOCK_VOICE_QUESTION } from "@/lib/sentinel-voice-shell";
import { buildDemoState } from "@/lib/demo";

describe("sentinel voice shell", () => {
  it("uses the deterministic radio operator mock question", () => {
    expect(SENTINEL_MOCK_VOICE_QUESTION).toBe(
      "What should I ask the radio operator?",
    );
  });

  it("mock question is answerable by the existing typed Sentinel agent", () => {
    const demo = buildDemoState();
    const commandState = {
      incidentPackages: demo.incidentPackages,
      selectedIncidentPackage: demo.incidentPackages[0]!,
      timeline: demo.timeline,
      changeSummary: null,
      batchGeneratedAt: null,
      pullStatus: null,
      reportSummary: demo.reportSummary,
      demoReportDraft: {
        headline: "Report draft ready",
        markdown: "# Operations Report Draft",
      },
      demoMemorySummary: {
        headline: "Recent demo memory",
        lines: ["Demo memory line."],
      },
      latestTranscript: null,
      transcriptAddedTitles: [],
      transcriptMatchedTitles: [],
      selectedResponseStages: [],
    };

    const { answer } = answerSentinelQuestion(
      SENTINEL_MOCK_VOICE_QUESTION,
      commandState,
    );

    expect(answer.length).toBeGreaterThan(10);
    expect(answer).not.toMatch(/\bCritical\b/);
    expect(answer).not.toMatch(/\bseverity\b/i);
    expect(answer).not.toMatch(/\bconfidence\b/i);
    expect(answer).not.toMatch(/\bscore\b/i);
  });
});
