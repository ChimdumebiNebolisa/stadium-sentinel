import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  createSpeechRecognitionSession,
  extractFinalTranscript,
  isSpeechRecognitionSupported,
  normalizeVoiceTranscript,
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

  it("skips interim results and extracts only final ones", () => {
    expect(
      extractFinalTranscript([
        { isFinal: false, 0: { transcript: "uh..." } },
        { isFinal: true, 0: { transcript: "Show me the evidence." } },
      ]),
    ).toBe("Show me the evidence.");
  });

  describe("normalizeVoiceTranscript — dedup key generation", () => {
    // normalizeVoiceTranscript produces the signature key used by command-center's
    // dedup check (normalized transcript + incident ID, 1.5 s window).
    // The full ref+window dedup is covered by the e2e demo-flow voice test.
    it("lowercases and strips punctuation", () => {
      expect(normalizeVoiceTranscript("Show me the evidence!")).toBe(
        "show me the evidence",
      );
    });

    it("collapses whitespace", () => {
      expect(normalizeVoiceTranscript("  dispatch   the team  ")).toBe(
        "dispatch the team",
      );
    });

    it("produces identical keys for semantically duplicate transcripts", () => {
      const a = normalizeVoiceTranscript("Show me the evidence.");
      const b = normalizeVoiceTranscript("Show me the evidence!");
      expect(a).toBe(b);
    });

    it("produces different keys for different commands", () => {
      const a = normalizeVoiceTranscript("Show me the evidence.");
      const b = normalizeVoiceTranscript("Draft a report.");
      expect(a).not.toBe(b);
    });
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

  describe("hardened voice lifecycle", () => {
    // Use fake timers so the 8-second listen timeout never fires unexpectedly
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    function createManualMockRecognition() {
      const listeners: {
        onresult: SpeechRecognitionLike["onresult"];
        onerror: SpeechRecognitionLike["onerror"];
        onend: SpeechRecognitionLike["onend"];
      } = { onresult: null, onerror: null, onend: null };

      const recognition: SpeechRecognitionLike = {
        continuous: false,
        interimResults: false,
        lang: "en-US",
        get onresult() { return listeners.onresult; },
        set onresult(v) { listeners.onresult = v; },
        get onerror() { return listeners.onerror; },
        set onerror(v) { listeners.onerror = v; },
        get onend() { return listeners.onend; },
        set onend(v) { listeners.onend = v; },
        start: vi.fn(),
        stop: vi.fn(),
        abort: vi.fn(),
      };

      const win = {
        SpeechRecognition: class {
          constructor() { return recognition; }
        },
      } as unknown as SentinelVoiceWindow;

      return { recognition, listeners, win };
    }

    it("final result → onTranscript called once, ready on end", () => {
      const { listeners, win } = createManualMockRecognition();
      const onTranscript = vi.fn();
      const onStatusChange = vi.fn();
      const session = createSpeechRecognitionSession({ win, onTranscript, onStatusChange });

      session.start();
      listeners.onresult?.({
        results: [{ isFinal: true, 0: { transcript: "Show me the evidence." } }],
      });
      listeners.onend?.();

      expect(onTranscript).toHaveBeenCalledOnce();
      expect(onTranscript).toHaveBeenCalledWith("Show me the evidence.");
      const calls = onStatusChange.mock.calls;
      expect(calls[calls.length - 1]).toEqual(["ready", "Push-to-talk ready."]);
    });

    it("no result → error on end with no-transcript message", () => {
      const { listeners, win } = createManualMockRecognition();
      const onTranscript = vi.fn();
      const onStatusChange = vi.fn();
      const session = createSpeechRecognitionSession({ win, onTranscript, onStatusChange });

      session.start();
      listeners.onend?.();

      expect(onTranscript).not.toHaveBeenCalled();
      expect(onStatusChange).toHaveBeenCalledWith(
        "error",
        "No speech detected. Try asking again.",
      );
    });

    it("interim-only result → no transcript emitted, error on end", () => {
      const { listeners, win } = createManualMockRecognition();
      const onTranscript = vi.fn();
      const onStatusChange = vi.fn();
      const session = createSpeechRecognitionSession({ win, onTranscript, onStatusChange });

      session.start();
      listeners.onresult?.({
        results: [{ isFinal: false, 0: { transcript: "uh..." } }],
      });
      listeners.onend?.();

      expect(onTranscript).not.toHaveBeenCalled();
      expect(onStatusChange).toHaveBeenCalledWith(
        "error",
        expect.stringContaining("could not be confirmed"),
      );
    });

    it.each([
      ["no-speech", "No speech detected. Try asking again."],
      ["audio-capture", "Microphone unavailable. Check your device and try again."],
      ["not-allowed", "Microphone access denied. Check browser permissions and try again."],
    ])("onerror '%s' → friendly message", (errorCode, expectedMessage) => {
      const { listeners, win } = createManualMockRecognition();
      const onTranscript = vi.fn();
      const onStatusChange = vi.fn();
      const session = createSpeechRecognitionSession({ win, onTranscript, onStatusChange });

      session.start();
      listeners.onerror?.({ error: errorCode });

      expect(onTranscript).not.toHaveBeenCalled();
      expect(onStatusChange).toHaveBeenCalledWith("error", expectedMessage);
    });
  });
});
