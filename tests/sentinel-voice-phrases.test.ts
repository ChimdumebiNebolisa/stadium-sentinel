import { describe, expect, it } from "vitest";

import {
  classifyApprovalPhrase,
  classifyRejectionPhrase,
  classifyVoicePhrase,
  isCasualAcknowledgment,
  formatIncidentReportPhrase,
} from "@/lib/sentinel-voice-phrases";

describe("classifyVoicePhrase", () => {
  it("routes mic-check phrases locally", () => {
    expect(classifyVoicePhrase("can you hear me")).toBe("mic_check");
    expect(classifyVoicePhrase("hello")).toBe("mic_check");
    expect(classifyVoicePhrase("testing")).toBe("mic_check");
  });

  it("routes thank-you phrases locally", () => {
    expect(classifyVoicePhrase("thank you")).toBe("thank_you");
    expect(classifyVoicePhrase("thanks")).toBe("thank_you");
    expect(classifyVoicePhrase("that's all")).toBe("thank_you");
  });

  it("classifies strong approval phrases only", () => {
    expect(classifyApprovalPhrase("go ahead")).toBe(true);
    expect(classifyApprovalPhrase("dispatch it")).toBe(true);
    expect(classifyApprovalPhrase("yes")).toBe(false);
    expect(classifyApprovalPhrase("ok")).toBe(false);
    expect(classifyApprovalPhrase("sure")).toBe(false);
  });

  it("treats bare acknowledgments as casual", () => {
    expect(isCasualAcknowledgment("yes")).toBe(true);
    expect(isCasualAcknowledgment("ok")).toBe(true);
    expect(isCasualAcknowledgment("go ahead")).toBe(false);
  });

  it("classifies rejection phrases", () => {
    expect(classifyRejectionPhrase("no")).toBe(true);
    expect(classifyRejectionPhrase("cancel that")).toBe(true);
    expect(classifyRejectionPhrase("never mind")).toBe(true);
  });

  it("routes stop phrases locally", () => {
    expect(classifyVoicePhrase("stop")).toBe("stop_session");
    expect(classifyVoicePhrase("stop talking")).toBe("stop_session");
    expect(classifyVoicePhrase("stop listening")).toBe("stop_session");
    expect(classifyVoicePhrase("stop listening please")).toBe("stop_session");
    expect(classifyVoicePhrase("alright I'm done")).toBe("stop_session");
    expect(classifyVoicePhrase("alright im done")).toBe("stop_session");
    expect(classifyVoicePhrase("never mind")).toBe("stop_session");
  });

  it("returns null for incident questions", () => {
    expect(classifyVoicePhrase("what happened")).toBeNull();
    expect(classifyVoicePhrase("who is handling it")).toBeNull();
  });
});

describe("formatIncidentReportPhrase", () => {
  it("formats incident titles for intro copy", () => {
    expect(formatIncidentReportPhrase("Lost child")).toBe("the lost child report");
    expect(formatIncidentReportPhrase("Lost child report")).toBe("the lost child report");
    expect(formatIncidentReportPhrase("Gate B backed up.")).toBe("the gate b backed up report");
  });

  it("returns null for empty titles", () => {
    expect(formatIncidentReportPhrase("")).toBeNull();
    expect(formatIncidentReportPhrase(undefined)).toBeNull();
  });
});
