import { describe, expect, it } from "vitest";

import { buildChangeSummary } from "@/lib/demo-agent-workflow";
import { buildDemoState } from "@/lib/demo";
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
    ...overrides,
  };
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

  it("avoids forbidden wording in answers", () => {
    const state = buildCommandState();
    const prompts = [
      "What should I do first?",
      "Why this priority?",
      "What evidence supports this?",
      "Draft a radio update.",
      "Show me the current incident summary.",
    ];

    for (const prompt of prompts) {
      const { answer } = answerSentinelQuestion(prompt, state);
      expect(answer).not.toMatch(/\bCritical\b/);
      expect(answer).not.toMatch(/\bseverity\b/i);
      expect(answer).not.toMatch(/\bconfidence\b/i);
      expect(answer).not.toMatch(/\bscore\b/i);
    }
  });
});
