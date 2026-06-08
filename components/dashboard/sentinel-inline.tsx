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
      return "Action executing";
    case "action_complete":
      return "Action complete";
    case "action_failed":
      return "Action review";
    case "speaking":
      return "Sentinel speaking";
    default:
      return "Idle";
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
  evidence,
  actionTrace,
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
          className="absolute right-0 z-20 mt-2 w-[min(28rem,calc(100vw-3rem))] rounded-xl border border-violet-500/20 bg-white p-3 shadow-lg"
          data-testid="sentinel-panel"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[#07111c]">Sentinel command</p>
              <p className="mt-0.5 text-xs text-slate-500" data-testid="sentinel-state">
                {getStateLabel(state)}
              </p>
            </div>
            {statusMessage ? (
              <p className="max-w-[18rem] text-right text-xs text-slate-500">
                {statusMessage}
              </p>
            ) : null}
          </div>

          {isSpeaking ? (
            <div
              className="mt-3 flex items-center justify-between gap-2 rounded-md border border-violet-500/20 bg-violet-500/5 px-3 py-2"
              data-testid="sentinel-speaking-banner"
            >
              <p className="text-xs font-medium text-violet-800">Sentinel speaking…</p>
              <button
                type="button"
                onClick={onStopSpeech}
                data-testid="sentinel-stop-speech"
                className="shrink-0 rounded-md border border-violet-500/25 px-2 py-1 text-[0.7rem] font-medium text-violet-700 hover:bg-violet-500/8"
              >
                Stop
              </button>
            </div>
          ) : null}

          {voiceEnabled ? (
            <div className="mt-3 space-y-2" data-testid="sentinel-voice-first">
              <button
                type="button"
                data-testid="sentinel-push-to-talk"
                aria-label={isListening ? "Stop listening" : "Push to talk"}
                aria-pressed={isListening}
                onClick={onToggleVoice}
                disabled={voiceUnsupported}
                className="w-full rounded-md border border-violet-500/40 bg-violet-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isListening ? "Stop listening" : "Push to talk"}
              </button>

              {questionInput.trim() ? (
                <p
                  className="rounded-md border border-violet-500/15 bg-violet-500/5 px-2.5 py-1.5 text-sm text-slate-700"
                  data-testid="sentinel-transcript-preview"
                >
                  {questionInput}
                </p>
              ) : null}

              <details className="rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
                <summary className="cursor-pointer text-[0.75rem] font-medium text-slate-600">
                  Type instead
                </summary>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {!voiceEnabled ? (
                    <button
                      type="button"
                      data-testid="sentinel-mock-voice"
                      aria-label="Insert voice example"
                      onClick={onMockVoice}
                      className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[0.7rem] font-medium text-slate-600 transition-colors hover:border-violet-500/30 hover:text-violet-900"
                    >
                      Voice example
                    </button>
                  ) : null}
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
                    className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-800 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    disabled={!questionInput.trim()}
                    onClick={onSubmit}
                    data-testid="sentinel-ask"
                    className="shrink-0 rounded-md border border-violet-500/30 bg-violet-600 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.03em] text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Ask
                  </button>
                </div>
              </details>
            </div>
          ) : (
            <div className="mt-3 flex flex-wrap gap-1.5">
              <button
                type="button"
                data-testid="sentinel-mock-voice"
                aria-label="Insert voice example"
                onClick={onMockVoice}
                className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[0.7rem] font-medium text-slate-600 transition-colors hover:border-violet-500/30 hover:text-violet-900"
              >
                Voice example
              </button>
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
                className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-800 placeholder:text-slate-400"
              />
              <button
                type="button"
                disabled={!questionInput.trim()}
                onClick={onSubmit}
                data-testid="sentinel-ask"
                className="shrink-0 rounded-md border border-violet-500/30 bg-violet-600 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.03em] text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Ask
              </button>
            </div>
          )}

          {answer ? (
            <p
              className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-700"
              data-testid="sentinel-answer"
            >
              {answer}
            </p>
          ) : null}

          {evidence.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5" data-testid="sentinel-evidence">
              {evidence.slice(0, 3).map((item) => (
                <span
                  key={item.sourceId}
                  className="rounded-full border border-violet-500/20 bg-violet-500/5 px-2 py-0.5 text-[0.7rem] text-violet-900"
                  title={item.excerpt}
                >
                  {item.title}
                </span>
              ))}
            </div>
          ) : null}

          {actionTrace ? (
            <div
              className="mt-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
              data-testid="sentinel-action-trace"
            >
              <p>
                <span className="font-semibold text-slate-900">Command:</span>{" "}
                {actionTrace.interpretedCommand}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-900">Action:</span>{" "}
                {actionTrace.selectedAction}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-900">Target:</span>{" "}
                {actionTrace.target}
              </p>
              <p className="mt-1">
                <span className="font-semibold text-slate-900">Result:</span>{" "}
                {actionTrace.result}
              </p>
              {actionTrace.writebackStatus ? (
                <p className="mt-1">
                  <span className="font-semibold text-slate-900">Write-back:</span>{" "}
                  {actionTrace.writebackStatus}
                </p>
              ) : null}
            </div>
          ) : null}

          {canApplyAction ? (
            <button
              type="button"
              data-testid="sentinel-apply-action"
              onClick={onApplyAction}
              className="mt-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-500/15"
            >
              Apply action
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
