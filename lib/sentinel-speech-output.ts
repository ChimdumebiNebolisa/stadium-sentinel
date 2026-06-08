/**
 * Sentinel talk-back: two-way voice response layer.
 *
 * Provides short, operationally-worded spoken responses after a Sentinel
 * voice command executes. Wraps browser SpeechSynthesis; degrades gracefully
 * when unsupported. Never reads full evidence/report/log content aloud.
 */

import type { IncidentPackage } from "@/lib/types";

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

// ─── Stop ────────────────────────────────────────────────────────────────────

export function stopSentinelSpeech(
  win: SpeechOutputWindow = window as SpeechOutputWindow,
): void {
  win.speechSynthesis?.cancel();
}

// ─── Speak ───────────────────────────────────────────────────────────────────

export function speakSentinelResponse(
  text: string,
  win: SpeechOutputWindow = window as SpeechOutputWindow,
): boolean {
  if (!text.trim() || !canSpeakSentinelResponse(win)) {
    return false;
  }

  // Cancel any in-progress utterance before starting a new one.
  win.speechSynthesis?.cancel();

  const utterance = new SpeechSynthesisUtterance(text.trim());
  utterance.rate = 1;
  utterance.pitch = 1;
  win.speechSynthesis?.speak(utterance);
  return true;
}

// ─── Response builder ────────────────────────────────────────────────────────

export type SentinelSpeechContext = {
  commandType:
    | "intro"
    | "mic_check"
    | "open_evidence"
    | "draft_report"
    | "open_report"
    | "process_report"
    | "dispatch_team"
    | "advance_checklist"
    | "open_source_log"
    | "select_top_incident"
    | "recommend_next_action"
    | "idle_answer"
    | "fallback";
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
  const team = incident?.assignedRole ?? "the assigned team";
  const count = ctx.evidenceCount ?? ctx.incidentPackage?.evidence.length ?? 0;

  switch (ctx.commandType) {
    case "intro":
      return `Sentinel online. I'm tracking ${title}. Ask what happened, who is handling it, what changed, or what to do next.`;

    case "mic_check":
      return `Yes, I can hear you. Ask about this incident, who is handling it, what changed, or what to do next.`;

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

    case "idle_answer":
      // Use the actual Gemini answer (first sentences) when available.
      if (ctx.spokenAnswer?.trim()) {
        return ctx.spokenAnswer.trim();
      }
      return `Review the Sentinel response for ${title}.`;

    case "fallback":
    default:
      return `I can answer questions about the selected incident, including what happened, who is handling it, what changed, and what to do next.`;
  }
}
