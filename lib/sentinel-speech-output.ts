/**
 * Sentinel talk-back: two-way voice response layer.
 *
 * Provides short, operationally-worded spoken responses after a Sentinel
 * voice command executes. Wraps browser SpeechSynthesis; degrades gracefully
 * when unsupported. Never reads full evidence/report/log content aloud.
 */

import type { IncidentPackage } from "@/lib/types";

import { formatIncidentReportPhrase } from "@/lib/sentinel-voice-phrases";

type SpeechOutputWindow = Window & {
  speechSynthesis?: SpeechSynthesis;
};

// ─── Browser support ─────────────────────────────────────────────────────────

export function canSpeakSentinelResponse(
  win: SpeechOutputWindow = window as SpeechOutputWindow,
): boolean {
  return (
    typeof win.speechSynthesis?.speak === "function" &&
    typeof SpeechSynthesisUtterance !== "undefined"
  );
}

let activeSentinelUtterance: SpeechSynthesisUtterance | null = null;

// ─── Stop ────────────────────────────────────────────────────────────────────

export function stopSentinelSpeech(
  win: SpeechOutputWindow = window as SpeechOutputWindow,
): void {
  if (activeSentinelUtterance) {
    activeSentinelUtterance.onend = null;
    activeSentinelUtterance = null;
  }
  win.speechSynthesis?.cancel();
}

// ─── Speak ───────────────────────────────────────────────────────────────────

export function speakSentinelResponse(
  text: string,
  win: SpeechOutputWindow = window as SpeechOutputWindow,
  onEnd?: () => void,
): boolean {
  if (!text.trim() || !canSpeakSentinelResponse(win)) {
    return false;
  }

  // Cancel any in-progress utterance before starting a new one.
  win.speechSynthesis?.cancel();

  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.rate = 1;
  utterance.pitch = 1;
  if (onEnd) {
    utterance.onend = () => {
      activeSentinelUtterance = null;
      onEnd();
    };
  }
  activeSentinelUtterance = utterance;
  win.speechSynthesis?.speak(utterance);
  return true;
}

// ─── Response builder ────────────────────────────────────────────────────────

export type SentinelSpeechContext = {
  commandType:
    | "intro"
    | "mic_check"
    | "thank_you"
    | "stop_session"
    | "open_evidence"
    | "draft_report"
    | "open_report"
    | "process_report"
    | "dispatch_team"
    | "advance_checklist"
    | "open_source_log"
    | "select_top_incident"
    | "recommend_next_action"
    | "draft_staff_update"
    | "action_proposed"
    | "approval_received"
    | "rejection_received"
    | "idle_answer"
    | "fallback";
  spokenPreview?: string;
  incidentPackage?: IncidentPackage | null;
  evidenceCount?: number;
  writebackStatus?: string | null;
  /** First 1–2 sentences of the Gemini answer; used for natural-question spoken responses. */
  spokenAnswer?: string;
};

/**
 * Build a short, calm, operator-facing spoken response for a Sentinel command.
 * Responses are under 40 words — never reading full evidence/report/log content.
 */
export function buildSpokenSentinelResponse(ctx: SentinelSpeechContext): string {
  const incident = ctx.incidentPackage?.incident;
  const title = incident?.title ?? "the selected incident";
  const reportPhrase = formatIncidentReportPhrase(incident?.title);
  const team = incident?.assignedRole ?? "the assigned team";
  const count = ctx.evidenceCount ?? ctx.incidentPackage?.evidence.length ?? 0;

  switch (ctx.commandType) {
    case "intro":
      if (reportPhrase) {
        return `Hi, I'm Sentinel. I'm looking at ${reportPhrase} now. Ask me what happened, who's on it, what changed, or what needs to happen next.`;
      }
      return `Hi, I'm Sentinel. I help you keep up with live incident updates. Ask me what happened, who's on it, what changed, or what needs to happen next.`;

    case "mic_check":
      return `Yes, I can hear you. Ask me about the incident or tell me what you want done.`;

    case "thank_you":
      return `You're welcome. I'll stay ready if you need another update.`;

    case "stop_session":
      return `Got it. I'll stop here.`;

    case "open_evidence": {
      const countPhrase = count > 0 ? `I found ${count} source signal${count === 1 ? "" : "s"}` : "Evidence is open";
      return `Evidence is open for ${title}. ${countPhrase} for this incident.`;
    }

    case "draft_report":
    case "open_report":
    case "process_report":
      return `I drafted the incident report in the Report tab. Review the text, then approve it when ready.`;

    case "dispatch_team":
    case "advance_checklist":
      if (ctx.writebackStatus) {
        return `Dispatch is approved and ${team} has been updated in operations memory.`;
      }
      return `Dispatch is prepared for ${team}. Confirm approval to write the update back to operations memory.`;

    case "open_source_log":
      return `Source log is open for ${title}.`;

    case "select_top_incident":
      return `${title} is now the active incident.`;

    case "recommend_next_action":
      return `Review the next action in the checklist for ${title}.`;

    case "draft_staff_update":
      return "Staff update saved to the incident record and added to the incident timeline.";

    case "action_proposed":
      if (ctx.spokenPreview?.trim()) {
        return `${ctx.spokenPreview.trim()} Say approve or go ahead when ready.`;
      }
      return `I prepared that update for ${title}. Say approve or go ahead when ready.`;

    case "approval_received":
      return `Approved. Applying that now for ${title}.`;

    case "rejection_received":
      return "Okay, I won't apply that.";

    case "idle_answer":
      // Use the actual Gemini answer (first sentences) when available.
      if (ctx.spokenAnswer?.trim()) {
        return ctx.spokenAnswer.trim();
      }
      return `Review the Sentinel response for ${title}.`;

    case "fallback":
    default:
      return `I can answer questions about this incident or help you take the next step.`;
  }
}
