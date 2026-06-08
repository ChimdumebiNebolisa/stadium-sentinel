"use client";

import type { EvidenceResult } from "@/lib/types";

export type SentinelUiState =
  | "idle"
  | "listening"
  | "transcribing"
  | "thinking"
  | "action_proposed"
  | "action_executing"
  | "action_complete"
  | "action_failed"
  | "speaking";

export type SentinelActionTrace = {
  interpretedCommand: string;
  selectedAction: string;
  target: string;
  result: string;
  writebackStatus?: string | null;
};

type SentinelInlineProps = {
  available: boolean;
  open: boolean;
  voiceEnabled: boolean;
  voiceUnsupported: boolean;
  state: SentinelUiState;
  statusMessage: string | null;
  questionInput: string;
  answer: string | null;
  evidence: EvidenceResult[];
  actionTrace: SentinelActionTrace | null;
  canApplyAction: boolean;
  onToggle: () => void;
  onQuestionChange: (value: string) => void;
  onSubmit: () => void;
  onToggleVoice: () => void;
  onMockVoice: () => void;
  onApplyAction: () => void;
  onStopSpeech: () => void;
};

function getStateLabel(state: SentinelUiState): string {
  switch (state) {
    case "listening":
      return "Listening";
    case "transcribing":
      return "Transcribing";
    case "thinking":
      return "Thinking";
    case "action_proposed":
      return "Action proposed";
    case "action_executing":
      return "Applying";
    case "action_complete":
      return "Done";
    case "action_failed":
      return "Review";
    case "speaking":
      return "Speaking";
    default:
      return "Ready";
  }
}

export function SentinelInline({
  available,
  open,
  voiceEnabled,
  voiceUnsupported,
  state,
  statusMessage,
  questionInput,
  answer,
  canApplyAction,
  onToggle,
  onQuestionChange,
  onSubmit,
  onToggleVoice,
  onMockVoice,
  onApplyAction,
  onStopSpeech,
}: SentinelInlineProps) {
  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const voiceButtonLabel = isListening
    ? "Stop listening"
    : isSpeaking
      ? "Interrupt"
      : "Start listening";

  return (
    <div className="relative" data-testid="sentinel-command">
      <button
        type="button"
        data-testid="sentinel-control"
        aria-expanded={open}
        onClick={onToggle}
        disabled={!available}
        className="inline-flex items-center gap-1.5 rounded-md border border-violet-500/30 bg-white px-3 py-1.5 text-sm font-semibold text-violet-900 transition-colors hover:bg-violet-500/8 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-violet-600 text-[0.65rem] font-bold text-white"
          aria-hidden="true"
        >
          S
        </span>
        Ask Sentinel
      </button>

      {open ? (
        <div
          className="absolute right-0 z-20 mt-2 w-[min(22rem,calc(100vw-3rem))] rounded-xl border border-violet-500/20 bg-white p-3 shadow-lg"
          data-testid="sentinel-panel"
        >
          {/* Header: state label */}
          <div className="flex items-center gap-2">
            <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.04em] text-violet-700" data-testid="sentinel-state">
              {getStateLabel(state)}
              {isSpeaking ? (
                <span className="ml-1 italic font-normal normal-case tracking-normal text-violet-500" data-testid="sentinel-speaking-banner">
                  …
                </span>
              ) : null}
            </p>
          </div>
          {/* Intro / status line — shown prominently when Sentinel is speaking/idle */}
          {statusMessage && (isSpeaking || state === "idle") ? (
            <p className="mt-1.5 text-xs leading-5 text-slate-600">
              {statusMessage}
            </p>
          ) : null}

          {answer && !isSpeaking ? (
            <p
              className="mt-1.5 truncate text-xs leading-5 text-slate-700"
              data-testid="sentinel-answer"
              title={answer}
            >
              {answer}
            </p>
          ) : null}

          {/* Voice controls */}
          {voiceEnabled ? (
            <div className="mt-2.5 space-y-2" data-testid="sentinel-voice-first">
              <button
                type="button"
                data-testid="sentinel-push-to-talk"
                aria-label={voiceButtonLabel}
                aria-pressed={isListening}
                onClick={onToggleVoice}
                disabled={voiceUnsupported}
                className="w-full rounded-md border border-violet-500/40 bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {voiceButtonLabel}
              </button>

              {/* Latest-heard transcript — one compact line */}
              {questionInput.trim() ? (
                <p
                  className="truncate rounded-md border border-violet-500/15 bg-violet-500/5 px-2.5 py-1.5 text-xs text-slate-600"
                  data-testid="sentinel-transcript-preview"
                  title={questionInput}
                >
                  Heard: {questionInput}
                </p>
              ) : null}
            </div>
          ) : (
            /* Voice-disabled: mock button only (typed input is in sr-only below) */
            <div className="mt-2.5 flex gap-1.5">
              <button
                type="button"
                data-testid="sentinel-mock-voice"
                aria-label="Insert voice example"
                onClick={onMockVoice}
                className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[0.7rem] font-medium text-slate-600 transition-colors hover:border-violet-500/30 hover:text-violet-900"
              >
                Voice example
              </button>
            </div>
          )}

          {/* Apply action — only when confirmation is needed */}
          {canApplyAction ? (
            <button
              type="button"
              data-testid="sentinel-apply-action"
              onClick={onApplyAction}
              className="mt-2.5 w-full rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-500/15"
            >
              Apply action
            </button>
          ) : null}

          {/* Visually hidden typed input — always mounted so Playwright tests can fill it.
              NOT inside a <details> to ensure it is always focusable/fillable. */}
          <div className="sr-only">
            <input
              type="text"
              value={questionInput}
              onChange={(event) => onQuestionChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && questionInput.trim()) {
                  event.preventDefault();
                  onSubmit();
                }
              }}
              placeholder="Ask about this incident..."
              data-testid="sentinel-question-input"
              tabIndex={-1}
              aria-hidden="true"
            />
            <button
              type="button"
              disabled={!questionInput.trim()}
              onClick={onSubmit}
              data-testid="sentinel-ask"
              tabIndex={-1}
              aria-hidden="true"
            >
              Ask
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
