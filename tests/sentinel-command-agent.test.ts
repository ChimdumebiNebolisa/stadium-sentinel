import { describe, expect, it } from "vitest";

import { buildChangeSummary } from "@/lib/demo-agent-workflow";
import { buildDemoState } from "@/lib/demo";
import { getPoolIncidentById } from "@/lib/demo-incident-pool";
import {
  extractTranscriptIncidents,
  getCanonicalActiveIncidentIds,
  TRANSCRIPT_PRESETS,
} from "@/lib/radio-transcript-intake";
import { buildResponseTimeline } from "@/lib/response-timeline";
import {
  answerSentinelQuestion,
  buildDefaultSentinelBrief,
  buildSuggestedSentinelQuestions,
  type CommandState,
} from "@/lib/sentinel-command-agent";

function buildCommandState(overrides: Partial<CommandState> = {}): CommandState {
  const demo = buildDemoState();
  const selected = demo.incidentPackages[0];

  return {
    incidentPackages: demo.incidentPackages,
    selectedIncidentPackage: selected,
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
    selectedResponseStages: selected
      ? buildResponseTimeline({
          incidentPackage: selected,
          timeline: demo.timeline,
        })
      : [],
    sourceMode: null,
    lastIngestionSummary: null,
    sourceAuditExcerpts: [],
    ...overrides,
  };
}

function buildMatchedTranscriptState() {
  const demo = buildDemoState();
  const extraction = extractTranscriptIncidents({
    text: TRANSCRIPT_PRESETS[0]!.text,
    activeIncidentIds: getCanonicalActiveIncidentIds(),
    sourceLabel: "Preset",
    presetId: "standard",
  });
  const selected = demo.incidentPackages[0]!;

  return buildCommandState({
    latestTranscript: extraction.record,
    transcriptAddedTitles: [],
    transcriptMatchedTitles: extraction.matchedIncidentIds.map(
      (id) =>
        demo.incidentPackages.find(({ incident }) => incident.id === id)?.incident.title ??
        getPoolIncidentById(id)?.title ??
        id,
    ),
    selectedResponseStages: buildResponseTimeline({
      incidentPackage: selected,
      timeline: demo.timeline,
      transcriptLine: extraction.record.matchedLines[selected.incident.id] ?? null,
    }),
  });
}

function buildMixedTranscriptState() {
  const demo = buildDemoState();
  const extraction = extractTranscriptIncidents({
    text: `${TRANSCRIPT_PRESETS[0]!.text}\n${TRANSCRIPT_PRESETS[1]!.text}`,
    activeIncidentIds: getCanonicalActiveIncidentIds(),
    sourceLabel: "Preset",
    presetId: "standard",
  });

  return buildCommandState({
    latestTranscript: extraction.record,
    transcriptAddedTitles: extraction.addedIncidents.map((incident) => incident.title),
    transcriptMatchedTitles: extraction.matchedIncidentIds.map(
      (id) => getPoolIncidentById(id)?.title ?? id,
    ),
  });
}

describe("sentinel command agent", () => {
  it("builds a short default brief from selected incident", () => {
    const state = buildCommandState();
    const brief = buildDefaultSentinelBrief(state);

    expect(brief).toContain(state.selectedIncidentPackage!.incident.title);
    expect(brief).toContain(state.selectedIncidentPackage!.incident.priority);
    expect(brief.split(".").length).toBeLessThanOrEqual(3);
  });

  it("returns 3 to 5 suggested questions", () => {
    const state = buildCommandState();
    const questions = buildSuggestedSentinelQuestions(state);

    expect(questions.length).toBeGreaterThanOrEqual(3);
    expect(questions.length).toBeLessThanOrEqual(5);
    expect(questions).toContain("What should I do first?");
    expect(questions).toContain("Why this priority?");
  });

  it("includes transcript questions when a radio transcript is extracted", () => {
    const state = buildMatchedTranscriptState();
    const questions = buildSuggestedSentinelQuestions(state);

    expect(questions).toContain("What did the radio log add?");
    expect(questions).toContain("What should I ask the radio operator?");
    expect(questions.length).toBeLessThanOrEqual(5);
  });

  it("includes change question when change summary exists", () => {
    const demo = buildDemoState();
    const next = [...demo.incidentPackages].reverse();
    const changeSummary = buildChangeSummary(demo.incidentPackages, next);
    const state = buildCommandState({ changeSummary, incidentPackages: next });

    expect(buildSuggestedSentinelQuestions(state)).toContain(
      "What changed after the latest pull?",
    );
  });

  it("answers what should I do first with recommended action", () => {
    const state = buildCommandState();
    const { answer } = answerSentinelQuestion("What should I do first?", state);

    expect(answer).toContain(
      state.selectedIncidentPackage!.incident.recommendedActions[0]!,
    );
    expect(answer).toContain(state.selectedIncidentPackage!.incident.assignedRole);
  });

  it("answers evidence question with evidence excerpt", () => {
    const state = buildCommandState();
    const { answer } = answerSentinelQuestion("What evidence supports this?", state);
    const excerpt = state.selectedIncidentPackage!.evidence[0]?.excerpt;

    expect(excerpt).toBeTruthy();
    expect(answer).toContain(excerpt!);
  });

  it("answers what changed using change summary lines", () => {
    const demo = buildDemoState();
    const next = [...demo.incidentPackages].reverse();
    const changeSummary = buildChangeSummary(demo.incidentPackages, next);
    const state = buildCommandState({ changeSummary, incidentPackages: next });
    const { answer } = answerSentinelQuestion("What changed?", state);

    expect(answer).toContain(changeSummary.lines[0]!);
  });

  it("answers draft a radio update with dispatch message", () => {
    const state = buildCommandState();
    const { answer } = answerSentinelQuestion("Draft a radio update.", state);

    expect(answer).toContain(state.selectedIncidentPackage!.incident.assignedRole);
    expect(answer).toContain(state.selectedIncidentPackage!.incident.locationLabel);
  });

  it("answers transcript-added with matched-only language", () => {
    const state = buildMatchedTranscriptState();
    const { answer } = answerSentinelQuestion("What did the radio log add?", state);

    expect(answer).toContain("recognized");
    expect(answer).toContain("matched reports already in the current queue");
    expect(answer).not.toContain("added Restroom");
  });

  it("answers transcript-added with mixed added and matched language", () => {
    const state = buildMixedTranscriptState();
    const { answer } = answerSentinelQuestion("What did the radio log add?", state);

    expect(answer).toContain("added");
    expect(answer).toContain("matched");
    expect(answer).toContain("Restroom out of order");
  });

  it("answers transcript-operator with follow-up questions", () => {
    const state = buildCommandState();
    const { answer } = answerSentinelQuestion("What should I ask the radio operator?", state);

    expect(answer).toMatch(/1\./);
  });

  it("answers transcript-missing, queue-first, and timeline-progress intents", () => {
    const matchedState = buildMatchedTranscriptState();
    const missingAnswer = answerSentinelQuestion(
      "Did the transcript mention anything missing from the queue?",
      matchedState,
    ).answer;
    const queueAnswer = answerSentinelQuestion(
      "Which report needs action first?",
      matchedState,
    ).answer;
    const timelineAnswer = answerSentinelQuestion(
      "What stage is this incident?",
      matchedState,
    ).answer;

    expect(missingAnswer).toContain("represented in the current queue");
    expect(queueAnswer).toContain("needs action first");
    expect(timelineAnswer).toMatch(/active stage|pending stage|complete/i);
  });

  it("avoids forbidden wording in answers", () => {
    const matchedState = buildMatchedTranscriptState();
    const prompts = [
      "What should I do first?",
      "Why this priority?",
      "What evidence supports this?",
      "Draft a radio update.",
      "Show me the current incident summary.",
      "What did the radio log add?",
      "What should I ask the radio operator?",
      "Which report needs action first?",
      "What stage is this incident?",
      "Is anything from the transcript unresolved?",
      "Turn this into a staff update.",
    ];

    for (const prompt of prompts) {
      const { answer } = answerSentinelQuestion(prompt, matchedState);
      expect(answer).not.toMatch(/\bCritical\b/);
      expect(answer).not.toMatch(/\bseverity\b/i);
      expect(answer).not.toMatch(/\bconfidence\b/i);
      expect(answer).not.toMatch(/\bscore\b/i);
    }
  });
});
