import { describe, expect, it, vi } from "vitest";

import {
  createSpeechRecognitionSession,
  extractFinalTranscript,
  isSpeechRecognitionSupported,
  speakSentinelAnswer,
  type SpeechRecognitionLike,
  type SentinelVoiceWindow,
} from "@/lib/sentinel-voice";

function createMockRecognition() {
  const listeners: {
    onresult: SpeechRecognitionLike["onresult"];
    onerror: SpeechRecognitionLike["onerror"];
    onend: SpeechRecognitionLike["onend"];
  } = {
    onresult: null,
    onerror: null,
    onend: null,
  };

  const recognition: SpeechRecognitionLike = {
    continuous: false,
    interimResults: false,
    lang: "en-US",
    get onresult() {
      return listeners.onresult;
    },
    set onresult(value) {
      listeners.onresult = value;
    },
    get onerror() {
      return listeners.onerror;
    },
    set onerror(value) {
      listeners.onerror = value;
    },
    get onend() {
      return listeners.onend;
    },
    set onend(value) {
      listeners.onend = value;
    },
    start: vi.fn(() => {
      listeners.onresult?.({
        results: [{ 0: { transcript: "What should I do first?" } }],
      });
      listeners.onend?.();
    }),
    stop: vi.fn(),
    abort: vi.fn(),
  };

  return { recognition, listeners };
}

describe("sentinel voice", () => {
  it("extracts transcript text from recognition results", () => {
    expect(
      extractFinalTranscript([
        { 0: { transcript: "Gate B is backed up." } },
        { 0: { transcript: "What should I do first?" } },
      ]),
    ).toBe("Gate B is backed up. What should I do first?");
  });

  it("fills input via callback without auto-submitting", () => {
    const { recognition } = createMockRecognition();
    const win = {
      SpeechRecognition: class {
        constructor() {
          return recognition;
        }
      },
    } as unknown as SentinelVoiceWindow;

    const onTranscript = vi.fn();
    const session = createSpeechRecognitionSession({
      win,
      onTranscript,
    });

    session.start();

    expect(onTranscript).toHaveBeenCalledWith("What should I do first?");
    expect(onTranscript).toHaveBeenCalledTimes(1);
  });

  it("reports unsupported browser state", () => {
    const onStatusChange = vi.fn();
    const session = createSpeechRecognitionSession({
      win: {} as SentinelVoiceWindow,
      onTranscript: vi.fn(),
      onStatusChange,
    });

    expect(session.isSupported).toBe(false);
    expect(isSpeechRecognitionSupported({} as SentinelVoiceWindow)).toBe(false);
    expect(onStatusChange).toHaveBeenCalledWith(
      "unsupported",
      expect.stringContaining("not supported"),
    );
  });

  it("uses speech synthesis when available", () => {
    const speak = vi.fn();
    const cancel = vi.fn();
    const win = {
      speechSynthesis: { speak, cancel },
    } as unknown as SentinelVoiceWindow;

    class MockUtterance {
      rate = 1;
      constructor(public text: string) {}
    }

    vi.stubGlobal("SpeechSynthesisUtterance", MockUtterance);

    expect(speakSentinelAnswer("Dispatch Guest Services.", win)).toBe(true);
    expect(speak).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});
