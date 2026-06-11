/** Voice-only phrase routing — handled locally, not sent to Gemini. */

export type SentinelVoicePhraseKind = "mic_check" | "thank_you" | "stop_session" | null;

const MIC_CHECK_PATTERNS =
  /^(hi|hello|hey|testing|test|can you hear me|are you there)\b/i;

const THANK_YOU_PATTERNS =
  /^(thanks?|thank you|that'?s all|cool thanks)\b/i;

const STOP_PATTERNS =
  /^(stop|stop talking|stop listening(?: please)?|cancel|never\s?mind|alright i'?m done|alright im done|i'?m done|we'?re done)\b/i;

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

const APPROVAL_PATTERNS =
  /^(approve|approved|go ahead|send it|dispatch it|submit it|looks good|do it|apply it|confirm it)\b/i;

const REJECTION_PATTERNS =
  /^(no|nope|cancel that|don't|do not|never mind|not now|stop that)\b/i;

/** Strong approval phrases — only valid when a pending Sentinel action exists. */
export function classifyApprovalPhrase(transcript: string): boolean {
  const trimmed = transcript.trim();
  return trimmed.length > 0 && APPROVAL_PATTERNS.test(trimmed);
}

/** Rejection phrases — only valid when a pending Sentinel action exists. */
export function classifyRejectionPhrase(transcript: string): boolean {
  const trimmed = transcript.trim();
  return trimmed.length > 0 && REJECTION_PATTERNS.test(trimmed);
}

const CASUAL_ACK_PATTERNS = /^(yes|yeah|yep|ok|okay|sure|right|got it)\.?$/i;

/** Bare acknowledgments should not trigger Sentinel commands without a pending action. */
export function isCasualAcknowledgment(transcript: string): boolean {
  return CASUAL_ACK_PATTERNS.test(transcript.trim());
}

export function formatIncidentReportPhrase(title: string | null | undefined): string | null {
  const cleaned = title?.trim().replace(/[.!?]+$/, "");
  if (!cleaned) {
    return null;
  }
  const lower = cleaned.toLowerCase();
  if (lower.endsWith(" report")) {
    return `the ${lower}`;
  }
  return `the ${lower} report`;
}
