"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

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

export type SentinelExchange = {
  question: string;
  answer: string;
  at: number;
};

const EXCHANGE_SNIPPET_MAX = 120;

function truncateExchangeText(text: string, max = EXCHANGE_SNIPPET_MAX): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= max) {
    return normalized;
  }
  return `${normalized.slice(0, max - 1).trimEnd()}…`;
}

type SentinelInlineProps = {
  available: boolean;
  open: boolean;
  voiceEnabled: boolean;
  voiceUnsupported: boolean;
  state: SentinelUiState;
  statusMessage: string | null;
  questionInput: string;
  answer: string | null;
  exchanges: SentinelExchange[];
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

function getOrbStateClass(state: SentinelUiState): string {
  switch (state) {
    case "listening":
      return "sentinel-orb--listening";
    case "speaking":
      return "sentinel-orb--speaking";
    case "thinking":
    case "transcribing":
    case "action_executing":
      return "sentinel-orb--thinking";
    default:
      return "sentinel-orb--idle";
  }
}

function getVoiceControlLabel(state: SentinelUiState): string {
  switch (state) {
    case "listening":
      return "Stop listening";
    case "speaking":
      return "Interrupt";
    default:
      return "Start listening";
  }
}

const PANEL_WIDTH = 224;
const VIEWPORT_MARGIN = 12;

export function SentinelInline({
  available,
  open,
  voiceEnabled,
  voiceUnsupported,
  state,
  statusMessage,
  questionInput,
  answer,
  exchanges,
  canApplyAction,
  onToggle,
  onQuestionChange,
  onSubmit,
  onToggleVoice,
  onMockVoice,
  onApplyAction,
}: SentinelInlineProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelStyle, setPanelStyle] = useState<{
    top: number;
    left: number;
  } | null>(null);

  const isListening = state === "listening";
  const isSpeaking = state === "speaking";
  const voiceControlLabel = getVoiceControlLabel(state);
  const responseLine =
    statusMessage && (isSpeaking || state === "idle" || isListening)
      ? statusMessage
      : answer && !isSpeaking
        ? answer
        : null;

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || !open) {
      return;
    }

    const rect = trigger.getBoundingClientRect();
    const panelWidth = Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2);
    const centerX = rect.left + rect.width / 2;
    const left = Math.min(
      Math.max(centerX - panelWidth / 2, VIEWPORT_MARGIN),
      window.innerWidth - panelWidth - VIEWPORT_MARGIN,
    );
    const top = rect.bottom + 8;

    setPanelStyle({ top, left });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelStyle(null);
      return;
    }

    updatePanelPosition();
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    return () => {
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [open, updatePanelPosition, state]);

  return (
    <div className="relative" data-testid="sentinel-command">
      <button
        ref={triggerRef}
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
          ref={panelRef}
          className="sentinel-orb-panel fixed z-50 rounded-2xl border border-violet-500/20 bg-white p-3 shadow-lg"
          style={{
            top: panelStyle?.top ?? -9999,
            left: panelStyle?.left ?? -9999,
            visibility: panelStyle ? "visible" : "hidden",
            width: Math.min(PANEL_WIDTH, window.innerWidth - VIEWPORT_MARGIN * 2),
          }}
          data-testid="sentinel-panel"
        >
          <div className="flex flex-col items-center gap-2">
            {isSpeaking ? (
              <button
                type="button"
                data-testid="sentinel-orb"
                aria-label="Interrupt Sentinel speech"
                onClick={onToggleVoice}
                className={`sentinel-orb sentinel-orb-button ${getOrbStateClass(state)}`}
              >
                <span className="sentinel-orb-ring" aria-hidden="true" />
                <span className="sentinel-orb-core" aria-hidden="true">
                  S
                </span>
              </button>
            ) : (
              <div
                data-testid="sentinel-orb"
                role="img"
                aria-label={`Sentinel ${getStateLabel(state).toLowerCase()}`}
                className={`sentinel-orb ${getOrbStateClass(state)}`}
              >
                <span className="sentinel-orb-ring" aria-hidden="true" />
                <span className="sentinel-orb-core" aria-hidden="true">
                  S
                </span>
              </div>
            )}

            <p
              className="text-[0.65rem] font-semibold uppercase tracking-[0.06em] text-violet-700"
              data-testid="sentinel-state"
            >
              {getStateLabel(state)}
            </p>

            {responseLine ? (
              <p className="max-w-full px-1 text-center text-xs leading-5 text-slate-600">
                {responseLine}
              </p>
            ) : null}

            {questionInput.trim() ? (
              <p
                className="max-w-full truncate rounded-md border border-violet-500/15 bg-violet-500/5 px-2 py-1 text-center text-[0.7rem] text-slate-600"
                data-testid="sentinel-transcript-preview"
                title={questionInput}
              >
                Heard: {questionInput}
              </p>
            ) : null}

            {exchanges.length > 0 ? (
              <div
                className="sentinel-exchange-history w-full"
                data-testid="sentinel-exchange-history"
              >
                {exchanges.map((exchange) => (
                  <div
                    key={exchange.at}
                    className="sentinel-exchange-pair"
                    data-testid="sentinel-exchange-pair"
                  >
                    <p className="sentinel-exchange-line">
                      <span className="sentinel-exchange-label">You:</span>{" "}
                      {truncateExchangeText(exchange.question)}
                    </p>
                    <p className="sentinel-exchange-line">
                      <span className="sentinel-exchange-label">Sentinel:</span>{" "}
                      {truncateExchangeText(exchange.answer)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}

          </div>

          {voiceEnabled ? (
            <div className="sr-only" data-testid="sentinel-voice-first">
              <button
                type="button"
                data-testid="sentinel-push-to-talk"
                aria-label={voiceControlLabel}
                aria-pressed={isListening}
                onClick={onToggleVoice}
                disabled={voiceUnsupported}
              >
                {voiceControlLabel}
              </button>
            </div>
          ) : (
            <div className="mt-2 flex justify-center">
              <button
                type="button"
                data-testid="sentinel-mock-voice"
                aria-label="Insert voice example"
                onClick={onMockVoice}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[0.7rem] font-medium text-slate-600 transition-colors hover:border-violet-500/30 hover:text-violet-900"
              >
                Voice example
              </button>
            </div>
          )}

          {canApplyAction ? (
            <button
              type="button"
              data-testid="sentinel-apply-action"
              onClick={onApplyAction}
              className="mt-2 w-full rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-semibold text-emerald-900 transition-colors hover:bg-emerald-500/15"
            >
              Apply action
            </button>
          ) : null}

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
