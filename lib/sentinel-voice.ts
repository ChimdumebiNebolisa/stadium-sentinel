export type SpeechRecognitionStatus =
  | "unsupported"
  | "ready"
  | "listening"
  | "error";

export type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
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
  results: ArrayLike<{ 0: { transcript: string } }>,
): string {
  const parts: string[] = [];

  for (let index = 0; index < results.length; index += 1) {
    const transcript = results[index]?.[0]?.transcript?.trim();
    if (transcript) {
      parts.push(transcript);
    }
  }

  return parts.join(" ").trim();
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
        const transcript = extractFinalTranscript(event.results);
        if (transcript) {
          input.onTranscript(transcript);
          input.onStatusChange?.("ready", "Transcript captured. Review and click Ask.");
        }
      };
      recognition.onerror = (event) => {
        input.onStatusChange?.(
          "error",
          event.error
            ? `Speech recognition error: ${event.error}`
            : "Speech recognition failed.",
        );
      };
      recognition.onend = () => {
        input.onStatusChange?.("ready", "Push-to-talk ready.");
      };
    }

    return recognition;
  }

  return {
    isSupported: true,
    start: () => {
      const active = ensureRecognition();
      input.onStatusChange?.("listening", "Listening… release to review transcript.");
      active.start();
    },
    stop: () => {
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
