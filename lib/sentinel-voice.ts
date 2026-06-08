export type SpeechRecognitionStatus =
  | "unsupported"
  | "ready"
  | "listening"
  | "error";

type SpeechRecognitionResult = { isFinal?: boolean; 0: { transcript: string } };

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: {
    resultIndex?: number;
    results: ArrayLike<SpeechRecognitionResult>;
  }) => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

export type SentinelVoiceWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  speechSynthesis?: SpeechSynthesis;
};

export function getSpeechRecognitionConstructor(
  win: SentinelVoiceWindow = window as SentinelVoiceWindow,
): (new () => SpeechRecognitionLike) | null {
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(
  win: SentinelVoiceWindow = window as SentinelVoiceWindow,
): boolean {
  return getSpeechRecognitionConstructor(win) !== null;
}

export function isSpeechSynthesisSupported(
  win: SentinelVoiceWindow = window as SentinelVoiceWindow,
): boolean {
  return typeof win.speechSynthesis?.speak === "function";
}

export function extractFinalTranscript(
  results: ArrayLike<{ isFinal?: boolean; 0: { transcript: string } }>,
  resultIndex?: number,
): string {
  const parts: string[] = [];
  const start = resultIndex ?? 0;

  for (let index = start; index < results.length; index += 1) {
    const result = results[index];
    // Skip interim results; undefined isFinal is treated as final for backward compat
    if (result.isFinal === false) continue;
    const transcript = result[0]?.transcript?.trim();
    if (transcript) {
      parts.push(transcript);
    }
  }

  return parts.join(" ").trim();
}

export function normalizeVoiceTranscript(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function mapSpeechError(error?: string): string {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access denied. Use Type instead.";
    case "no-speech":
      return "No speech detected. Use Type instead.";
    case "audio-capture":
      return "Microphone unavailable. Use Type instead.";
    default:
      return "Voice input unavailable. Use Type instead.";
  }
}

export function createSpeechRecognitionSession(input: {
  win?: SentinelVoiceWindow;
  onTranscript: (text: string) => void;
  onStatusChange?: (status: SpeechRecognitionStatus, message: string) => void;
}): {
  isSupported: boolean;
  start: () => void;
  stop: () => void;
} {
  const win = input.win ?? (window as SentinelVoiceWindow);
  const Recognition = getSpeechRecognitionConstructor(win);

  if (!Recognition) {
    input.onStatusChange?.(
      "unsupported",
      "Speech recognition is not supported in this browser.",
    );
    return {
      isSupported: false,
      start: () => {},
      stop: () => {},
    };
  }

  let recognition: SpeechRecognitionLike | null = null;

  // Closure-level tracking vars — survive across repeated start/stop on the same session
  let hadFinalTranscript = false;
  let hadAnyResult = false;
  let timeoutFired = false;
  let listeningTimeout: ReturnType<typeof setTimeout> | null = null;

  function clearListenTimeout() {
    if (listeningTimeout !== null) {
      clearTimeout(listeningTimeout);
      listeningTimeout = null;
    }
  }

  function ensureRecognition(): SpeechRecognitionLike {
    if (!Recognition) {
      throw new Error("Speech recognition is unavailable.");
    }

    if (!recognition) {
      recognition = new Recognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        hadAnyResult = true;
        const transcript = extractFinalTranscript(event.results, event.resultIndex);
        if (transcript) {
          hadFinalTranscript = true;
          clearListenTimeout();
          input.onTranscript(transcript);
          // Do not call onStatusChange here — command-center transitions state
          // via handleVoiceTranscript → submitSentinelQuestion
        }
        // Interim-only results: wait for a final result or onend
      };

      recognition.onerror = (event) => {
        clearListenTimeout();
        const msg = mapSpeechError(event.error);
        input.onStatusChange?.("error", msg);
      };

      recognition.onend = () => {
        clearListenTimeout();
        if (timeoutFired) {
          // Timeout already fired onStatusChange("error", ...) — avoid double-fire
          timeoutFired = false;
        } else if (!hadFinalTranscript) {
          const msg = hadAnyResult
            ? "Speech detected but could not be confirmed. Use Type instead."
            : "Voice input unavailable. Use Type instead.";
          input.onStatusChange?.("error", msg);
        } else {
          input.onStatusChange?.("ready", "Push-to-talk ready.");
        }
        hadFinalTranscript = false;
        hadAnyResult = false;
      };
    }

    return recognition;
  }

  return {
    isSupported: true,
    start: () => {
      hadFinalTranscript = false;
      hadAnyResult = false;
      timeoutFired = false;
      clearListenTimeout();
      const active = ensureRecognition();
      input.onStatusChange?.("listening", "Listening… release to review transcript.");
      // Safety net: directly escape the UI if the browser never fires onend
      listeningTimeout = setTimeout(() => {
        timeoutFired = true;
        input.onStatusChange?.("error", "Voice input unavailable. Use Type instead.");
        active.stop();
      }, 8000);
      active.start();
    },
    stop: () => {
      clearListenTimeout();
      recognition?.stop();
    },
  };
}

export function speakSentinelAnswer(
  text: string,
  win: SentinelVoiceWindow = window as SentinelVoiceWindow,
): boolean {
  if (!text.trim() || !isSpeechSynthesisSupported(win)) {
    return false;
  }

  const Utterance =
    typeof SpeechSynthesisUtterance !== "undefined"
      ? SpeechSynthesisUtterance
      : null;

  if (!Utterance) {
    return false;
  }

  win.speechSynthesis?.cancel();
  const utterance = new Utterance(text.trim());
  utterance.rate = 1;
  win.speechSynthesis?.speak(utterance);
  return true;
}

export function cancelSentinelSpeech(
  win: SentinelVoiceWindow = window as SentinelVoiceWindow,
): void {
  win.speechSynthesis?.cancel();
}
