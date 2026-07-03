import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  buildSpokenSentinelResponse,
  canSpeakSentinelResponse,
  speakSentinelResponse,
  stopSentinelSpeech,
  type SentinelSpeechContext,
} from "@/lib/sentinel-speech-output";
import type { IncidentPackage } from "@/lib/types";

type MockSpeechSynthesis = SpeechSynthesis & {
  speak: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
};

function getSpeechSynthesisMock(win: Window & { speechSynthesis?: SpeechSynthesis }) {
  const speechSynthesis = win.speechSynthesis as MockSpeechSynthesis | undefined;
  if (!speechSynthesis) {
    throw new Error("Expected speechSynthesis to be available");
  }
  return speechSynthesis;
}

// ─── Shared fixture ─────────────────────────────────────────────────────────

function makeWindow(opts: { hasSynthesis?: boolean; hasUtterance?: boolean } = {}) {
  const { hasSynthesis = true, hasUtterance = true } = opts;

  const win: Record<string, unknown> = {};

  if (hasSynthesis) {
    win.speechSynthesis = {
      speak: vi.fn(),
      cancel: vi.fn(),
    };
  }

  if (hasUtterance) {
    vi.stubGlobal(
      "SpeechSynthesisUtterance",
      class MockUtterance {
        rate = 1;
        pitch = 1;
        constructor(public text: string) {}
      },
    );
  } else {
    vi.stubGlobal("SpeechSynthesisUtterance", undefined);
  }

  return win as unknown as Window & { speechSynthesis?: SpeechSynthesis };
}

function makeIncidentPackage(overrides: Partial<IncidentPackage["incident"]> = {}): IncidentPackage {
  return {
    incident: {
      id: "incident-gate-b",
      title: "Gate B backed up",
      rawText: "Gate B ingress queue extending into perimeter lane.",
      priority: "High",
      category: "crowd-flow",
      incidentType: "queue-congestion",
      locationId: "gate-b",
      locationLabel: "Gate B",
      assignedRole: "Security",
      status: "new",
      assumptions: [],
      evidenceIds: [],
      recommendedActions: ["Dispatch Security", "Open overflow route", "Monitor queue"],
      approvedActionIds: [],
      ...overrides,
    },
    evidence: [
      { sourceId: "ev-1", title: "Radio log", sourceType: "radio_log", excerpt: "…", rationale: "…" },
      { sourceId: "ev-2", title: "Staff note", sourceType: "radio_log", excerpt: "…", rationale: "…" },
      { sourceId: "ev-3", title: "Queue standard", sourceType: "policy", excerpt: "…", rationale: "…" },
    ],
    staffUpdate: "Queue staff update.",
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

// ─── canSpeakSentinelResponse ─────────────────────────────────────────────────

describe("canSpeakSentinelResponse", () => {
  it("returns true when speechSynthesis and SpeechSynthesisUtterance are available", () => {
    const win = makeWindow();
    expect(canSpeakSentinelResponse(win)).toBe(true);
  });

  it("returns false when speechSynthesis is absent", () => {
    const win = makeWindow({ hasSynthesis: false });
    expect(canSpeakSentinelResponse(win)).toBe(false);
  });

  it("returns false when SpeechSynthesisUtterance is absent", () => {
    const win = makeWindow({ hasUtterance: false });
    expect(canSpeakSentinelResponse(win)).toBe(false);
  });
});

// ─── stopSentinelSpeech ───────────────────────────────────────────────────────

describe("stopSentinelSpeech", () => {
  it("calls speechSynthesis.cancel()", () => {
    const win = makeWindow();
    stopSentinelSpeech(win);
    expect(getSpeechSynthesisMock(win).cancel).toHaveBeenCalledOnce();
  });

  it("does not throw when speechSynthesis is absent", () => {
    const win = makeWindow({ hasSynthesis: false });
    expect(() => stopSentinelSpeech(win)).not.toThrow();
  });
});

// ─── speakSentinelResponse ────────────────────────────────────────────────────

describe("speakSentinelResponse", () => {
  it("cancels previous utterance then speaks", () => {
    const win = makeWindow();
    speakSentinelResponse("Test", win);
    expect(getSpeechSynthesisMock(win).cancel).toHaveBeenCalled();
    expect(getSpeechSynthesisMock(win).speak).toHaveBeenCalled();
  });

  it("returns true when speech is spoken", () => {
    const win = makeWindow();
    expect(speakSentinelResponse("Test", win)).toBe(true);
  });

  it("returns false and does not speak when synthesis is unavailable", () => {
    const win = makeWindow({ hasSynthesis: false });
    expect(speakSentinelResponse("Test", win)).toBe(false);
  });

  it("returns false for an empty string", () => {
    const win = makeWindow();
    expect(speakSentinelResponse("   ", win)).toBe(false);
    expect(getSpeechSynthesisMock(win).speak).not.toHaveBeenCalled();
  });

  it("cancels in-progress speech before a new call (cancel-then-speak pattern)", () => {
    const win = makeWindow();
    const cancel = vi.fn();
    const speak = vi.fn();
    const speechSynthesis = getSpeechSynthesisMock(win);
    speechSynthesis.cancel = cancel;
    speechSynthesis.speak = speak;

    speakSentinelResponse("First command", win);
    speakSentinelResponse("Second command", win);

    // cancel must be called before each speak
    expect(cancel).toHaveBeenCalledTimes(2);
    expect(speak).toHaveBeenCalledTimes(2);
  });
});

// ─── buildSpokenSentinelResponse ─────────────────────────────────────────────

describe("buildSpokenSentinelResponse", () => {
  it("evidence command mentions the incident title and evidence count", () => {
    const pkg = makeIncidentPackage();
    const text = buildSpokenSentinelResponse({
      commandType: "open_evidence",
      incidentPackage: pkg,
      evidenceCount: pkg.evidence.length,
    });
    expect(text).toMatch(/Evidence is open/i);
    expect(text).toMatch(/3 source signals/i);
    expect(text).toMatch(/Gate B backed up/i);
  });

  it("report command says drafted and mentions the Report tab", () => {
    const text = buildSpokenSentinelResponse({
      commandType: "draft_report",
      incidentPackage: makeIncidentPackage(),
    });
    expect(text).toMatch(/drafted/i);
    expect(text).toMatch(/Report tab/i);
    expect(text).not.toMatch(/\bCritical\b/);
  });

  it("dispatch command (no writeback yet) mentions team and confirm approval", () => {
    const text = buildSpokenSentinelResponse({
      commandType: "dispatch_team",
      incidentPackage: makeIncidentPackage(),
      writebackStatus: null,
    });
    expect(text).toMatch(/Dispatch is prepared/i);
    expect(text).toMatch(/Security/);
  });

  it("dispatch command with write-back status confirms update", () => {
    const text = buildSpokenSentinelResponse({
      commandType: "dispatch_team",
      incidentPackage: makeIncidentPackage(),
      writebackStatus: "Write-back recorded.",
    });
    expect(text).toMatch(/approved/i);
    expect(text).toMatch(/operations memory/i);
  });

  it("intro case includes incident title and guidance prompts", () => {
    const text = buildSpokenSentinelResponse({
      commandType: "intro",
      incidentPackage: makeIncidentPackage(),
    });
    expect(text).toMatch(/Hi, I'm Sentinel/i);
    expect(text).toMatch(/looking at the gate b backed up report/i);
    expect(text).toMatch(/what happened/i);
    expect(text).not.toMatch(/happy to help/i);
  });

  it("intro without title uses generic live-updates copy", () => {
    const text = buildSpokenSentinelResponse({
      commandType: "intro",
      incidentPackage: null,
    });
    expect(text).toMatch(/keep up with live incident updates/i);
  });

  it("thank_you and stop_session use friendly local responses", () => {
    expect(buildSpokenSentinelResponse({ commandType: "thank_you" })).toMatch(
      /You're welcome/i,
    );
    expect(buildSpokenSentinelResponse({ commandType: "stop_session" })).toBe(
      "Got it. I'll stop here.",
    );
  });

  it("mic_check case acknowledges without incident analysis", () => {
    const text = buildSpokenSentinelResponse({
      commandType: "mic_check",
      incidentPackage: makeIncidentPackage(),
    });
    expect(text).toMatch(/Yes.*hear you/i);
    expect(text).not.toMatch(/Dispatched/i);
    expect(text).not.toMatch(/evidence/i);
  });

  it("idle_answer uses spokenAnswer when provided", () => {
    const text = buildSpokenSentinelResponse({
      commandType: "idle_answer",
      incidentPackage: makeIncidentPackage(),
      spokenAnswer: "Gate B is backed up at the entry.",
    });
    expect(text).toBe("Gate B is backed up at the entry.");
  });

  it("idle_answer falls back to generic when spokenAnswer absent", () => {
    const text = buildSpokenSentinelResponse({
      commandType: "idle_answer",
      incidentPackage: makeIncidentPackage(),
    });
    expect(text).toMatch(/Gate B backed up/i);
  });

  it("fallback no longer gives the rigid evidence/report/dispatch menu", () => {
    const text = buildSpokenSentinelResponse({ commandType: "fallback" });
    // Must not be the old menu phrase
    expect(text).not.toMatch(/Try one of those commands/i);
    // Should still be helpful about what Sentinel can answer
    expect(text).toMatch(/questions/i);
  });

  it("spoken responses are short (under 50 words)", () => {
    const contexts: SentinelSpeechContext[] = [
      { commandType: "intro", incidentPackage: makeIncidentPackage() },
      { commandType: "mic_check", incidentPackage: makeIncidentPackage() },
      { commandType: "thank_you", incidentPackage: makeIncidentPackage() },
      { commandType: "stop_session", incidentPackage: makeIncidentPackage() },
      { commandType: "open_evidence", incidentPackage: makeIncidentPackage(), evidenceCount: 3 },
      { commandType: "draft_report", incidentPackage: makeIncidentPackage() },
      { commandType: "dispatch_team", incidentPackage: makeIncidentPackage(), writebackStatus: null },
      { commandType: "fallback" },
    ];
    for (const ctx of contexts) {
      const words = buildSpokenSentinelResponse(ctx).split(/\s+/).length;
      expect(words, `${ctx.commandType} response exceeds 50 words`).toBeLessThanOrEqual(50);
    }
  });

  it("does not contain forbidden wording in spoken output", () => {
    const allTypes: SentinelSpeechContext["commandType"][] = [
      "intro",
      "mic_check",
      "thank_you",
      "stop_session",
      "open_evidence",
      "draft_report",
      "open_report",
      "process_report",
      "dispatch_team",
      "advance_checklist",
      "open_source_log",
      "select_top_incident",
      "recommend_next_action",
      "idle_answer",
      "fallback",
    ];
    for (const commandType of allTypes) {
      const text = buildSpokenSentinelResponse({
        commandType,
        incidentPackage: makeIncidentPackage(),
      });
      expect(text).not.toMatch(/\bCritical\b/);
      expect(text).not.toMatch(/\bseverity\b/i);
      expect(text).not.toMatch(/\bconfidence\b/i);
      expect(text).not.toMatch(/\bscore\b/i);
      expect(text).not.toMatch(/Venue map/i);
      expect(text).not.toMatch(/Seat map/i);
    }
  });
});
