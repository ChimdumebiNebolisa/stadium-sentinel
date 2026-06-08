/** Voice-only phrase routing — handled locally, not sent to Gemini. */

export type SentinelVoicePhraseKind = "mic_check" | "thank_you" | "stop_session" | null;

const MIC_CHECK_PATTERNS =
  /^(hi|hello|hey|testing|test|can you hear me|are you there)\b/i;

const THANK_YOU_PATTERNS =
  /^(thanks?|thank you|that'?s all|cool thanks)\b/i;

const STOP_PATTERNS = /^(stop|stop talking|cancel|never\s?mind)\b/i;

export function classifyVoicePhrase(transcript: string): SentinelVoicePhraseKind {
  const trimmed = transcript.trim();
  if (!trimmed) {
    return null;
  }
  if (MIC_CHECK_PATTERNS.test(trimmed)) {
    return "mic_check";
  }
  if (THANK_YOU_PATTERNS.test(trimmed)) {
    return "thank_you";
  }
  if (STOP_PATTERNS.test(trimmed)) {
    return "stop_session";
  }
  return null;
}

export function formatIncidentReportPhrase(title: string | null | undefined): string | null {
  const cleaned = title?.trim().replace(/[.!?]+$/, "");
  if (!cleaned) {
    return null;
  }
  return `the ${cleaned.toLowerCase()} report`;
}
