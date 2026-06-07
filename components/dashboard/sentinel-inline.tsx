"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import type { SentinelRecommendedAction } from "@/lib/agent/sentinel-schema";
import { isSentinelAgentEnabled, isSentinelVoiceEnabled } from "@/lib/feature-flags";
import {
  answerSentinelQuestion,
  buildSuggestedSentinelQuestions,
  type CommandState,
} from "@/lib/sentinel-command-agent";
import { askSentinel } from "@/lib/sentinel-agent-client";
import { SENTINEL_MOCK_VOICE_QUESTION } from "@/lib/sentinel-voice-shell";
import {
  createSpeechRecognitionSession,
  isSpeechSynthesisSupported,
  speakSentinelAnswer,
  type SpeechRecognitionStatus,
} from "@/lib/sentinel-voice";
import type { EvidenceResult } from "@/lib/types";

type SentinelInlineProps = {
  commandState: CommandState;
  onApplyRecommendation?: (recommendation: SentinelRecommendedAction) => void;
};

const MAX_SUGGESTED_QUESTIONS = 3;

export function SentinelInline({
  commandState,
  onApplyRecommendation,
}: SentinelInlineProps) {
  const [open, setOpen] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceResult[]>([]);
  const [citations, setCitations] = useState<
    Array<{ sourceId: string; title: string; excerpt: string; index: string }>
  >([]);
  const [recommendedAction, setRecommendedAction] =
    useState<SentinelRecommendedAction | null>(null);
  const [loading, setLoading] = useState(false);
  const [metaLine, setMetaLine] = useState<string | null>(null);
  const [voiceStatus, setVoiceStatus] = useState<SpeechRecognitionStatus>("ready");
  const [voiceStatusMessage, setVoiceStatusMessage] = useState<string | null>(null);
  const voiceSessionRef = useRef<ReturnType<typeof createSpeechRecognitionSession> | null>(
    null,
  );

  const voiceEnabled = isSentinelVoiceEnabled();
  const readAloudSupported =
    typeof window !== "undefined" && isSpeechSynthesisSupported();

  const incidentId = commandState.selectedIncidentPackage?.incident.id ?? "";
  const suggestedQuestions = buildSuggestedSentinelQuestions(commandState).slice(
    0,
    MAX_SUGGESTED_QUESTIONS,
  );
  const trackedIncidentId = useRef<string | null>(null);

  useEffect(() => {
    if (trackedIncidentId.current === null) {
      trackedIncidentId.current = incidentId;
      return;
    }

    if (trackedIncidentId.current === incidentId) {
      return;
    }

    trackedIncidentId.current = incidentId;
    setOpen(false);
    setQuestionInput("");
    setAnswer(null);
    setEvidence([]);
    setCitations([]);
    setRecommendedAction(null);
    setMetaLine(null);
  }, [incidentId]);

  async function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || !commandState.selectedIncidentPackage) return;

    setQuestionInput(trimmed);
    setLoading(true);
    setRecommendedAction(null);
    setEvidence([]);
    setCitations([]);
    setMetaLine(null);

    if (isSentinelAgentEnabled()) {
      try {
        const response = await askSentinel({
          question: trimmed,
          incidentId: commandState.selectedIncidentPackage.incident.id,
          context: {
            incidentPackage: commandState.selectedIncidentPackage,
            timeline: commandState.timeline.filter(
              (entry) =>
                entry.incidentId === commandState.selectedIncidentPackage?.incident.id,
            ),
            queueTitles: commandState.incidentPackages
              .slice(0, 5)
              .map(({ incident }) => incident.title),
            sourceMode: commandState.sourceMode,
            pullStatus: commandState.pullStatus,
          },
        });

        if (response.meta.geminiMode === "live" && response.answer) {
          setAnswer(response.answer);
          setEvidence(response.evidence);
          setCitations(response.citations);
          setRecommendedAction(response.recommendedAction);
          setMetaLine(
            `Retrieved from ${response.meta.retrievalMode === "elastic" ? "Elastic" : "local context"} · Gemini live`,
          );
          setLoading(false);
          return;
        }
      } catch {
        // Fall through to deterministic fallback.
      }
    }

    const fallback = answerSentinelQuestion(trimmed, commandState);
    setAnswer(fallback.answer);
    setEvidence(commandState.selectedIncidentPackage.evidence);
    setCitations(
      commandState.selectedIncidentPackage.evidence.map((item) => ({
        sourceId: item.sourceId,
        title: item.title,
        excerpt: item.excerpt,
        index: "local",
      })),
    );
    setMetaLine("Local fallback");
    setLoading(false);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitQuestion(questionInput);
  }

  function handleMockVoice() {
    setQuestionInput(SENTINEL_MOCK_VOICE_QUESTION);
  }

  function getVoiceSession() {
    if (typeof window === "undefined") {
      return {
        isSupported: false,
        start: () => {},
        stop: () => {},
      };
    }

    if (!voiceSessionRef.current) {
      voiceSessionRef.current = createSpeechRecognitionSession({
        onTranscript: (text) => setQuestionInput(text),
        onStatusChange: (status, message) => {
          setVoiceStatus(status);
          setVoiceStatusMessage(message);
        },
      });
    }

    return voiceSessionRef.current;
  }

  function handlePushToTalkStart() {
    getVoiceSession().start();
  }

  function handlePushToTalkStop() {
    getVoiceSession().stop();
  }

  function handleReadAloud() {
    if (!answer) return;
    speakSentinelAnswer(answer);
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        data-testid="sentinel-control"
        aria-expanded={open}
        aria-controls={incidentId ? `sentinel-panel-${incidentId}` : undefined}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/8 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.04em] text-violet-900 transition-colors hover:bg-violet-500/12"
      >
        <span
          className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-violet-600 text-[0.6rem] font-bold text-white"
          aria-hidden="true"
        >
          S
        </span>
        Ask Sentinel
      </button>

      {open ? (
        <div
          id={incidentId ? `sentinel-panel-${incidentId}` : undefined}
          data-testid="sentinel-panel"
          className="mt-2 rounded-md border border-violet-500/20 bg-violet-500/5 p-2.5"
        >
          <p className="text-xs font-semibold text-violet-800">Ask about this incident</p>
          <p className="mt-0.5 text-xs text-slate-500">
            Sentinel reads the current command state.
          </p>

          {loading ? (
            <p className="mt-2 text-sm text-slate-600" data-testid="sentinel-loading">
              Sentinel is reviewing retrieved context…
            </p>
          ) : null}

          {answer ? (
            <p
              className="mt-2 line-clamp-4 text-sm leading-5 text-slate-700"
              data-testid="sentinel-answer"
            >
              {answer}
            </p>
          ) : null}

          {voiceEnabled && voiceStatusMessage ? (
            <p className="mt-1 text-[0.7rem] text-slate-500" data-testid="sentinel-voice-status">
              {voiceStatusMessage}
            </p>
          ) : null}

          {metaLine ? (
            <p className="mt-1 text-[0.7rem] text-slate-500" data-testid="sentinel-meta">
              {metaLine}
            </p>
          ) : null}

          {evidence.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5" data-testid="sentinel-evidence">
              {evidence.slice(0, 3).map((item) => (
                <span
                  key={item.sourceId}
                  className="rounded-full border border-violet-500/20 bg-white px-2 py-0.5 text-[0.65rem] text-violet-900"
                  title={item.excerpt}
                >
                  {item.title}
                </span>
              ))}
            </div>
          ) : null}

          {citations.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5" data-testid="sentinel-citations">
              {citations.slice(0, 3).map((item) => (
                <span
                  key={item.sourceId}
                  className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[0.65rem] text-slate-700"
                  title={`${item.index}: ${item.excerpt}`}
                >
                  {item.title}
                </span>
              ))}
            </div>
          ) : null}

          {recommendedAction && recommendedAction.actionIndex !== undefined ? (
            <div className="mt-2">
              <p className="text-xs text-slate-600">
                Recommended: {recommendedAction.label}
              </p>
              <button
                type="button"
                data-testid="sentinel-apply-recommendation"
                onClick={() => onApplyRecommendation?.(recommendedAction)}
                className="mt-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[0.7rem] font-semibold text-emerald-900 transition-colors hover:bg-emerald-500/15"
              >
                Apply Sentinel recommendation
              </button>
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-1.5">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                data-testid="sentinel-suggested-question"
                onClick={() => void submitQuestion(question)}
                className="rounded-full border border-violet-500/25 bg-white px-2 py-0.5 text-[0.7rem] text-violet-900 transition-colors hover:border-violet-500/40 hover:bg-violet-500/5"
              >
                {question}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-2 flex flex-wrap gap-1.5">
            {voiceEnabled ? (
              <>
                <button
                  type="button"
                  data-testid="sentinel-push-to-talk"
                  aria-label="Push to talk"
                  onMouseDown={handlePushToTalkStart}
                  onMouseUp={handlePushToTalkStop}
                  onMouseLeave={handlePushToTalkStop}
                  onTouchStart={handlePushToTalkStart}
                  onTouchEnd={handlePushToTalkStop}
                  disabled={voiceStatus === "unsupported"}
                  className="shrink-0 rounded-md border border-violet-500/30 bg-white px-2 py-1 text-[0.7rem] font-medium text-violet-900 transition-colors hover:bg-violet-500/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {voiceStatus === "listening" ? "Listening…" : "Push to talk"}
                </button>
                {answer && readAloudSupported ? (
                  <button
                    type="button"
                    data-testid="sentinel-read-aloud"
                    onClick={handleReadAloud}
                    className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[0.7rem] font-medium text-slate-600 transition-colors hover:border-violet-500/30 hover:text-violet-900"
                  >
                    Read aloud
                  </button>
                ) : null}
              </>
            ) : (
              <button
                type="button"
                data-testid="sentinel-mock-voice"
                aria-label="Insert mock voice question"
                onClick={handleMockVoice}
                className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-[0.7rem] font-medium text-slate-600 transition-colors hover:border-violet-500/30 hover:text-violet-900"
              >
                Mock voice
              </button>
            )}
            <input
              type="text"
              value={questionInput}
              onChange={(event) => setQuestionInput(event.target.value)}
              placeholder="Ask about this incident…"
              data-testid="sentinel-question-input"
              className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-800 placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={loading}
              className="shrink-0 rounded-md border border-violet-500/30 bg-violet-600 px-2.5 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.03em] text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Ask
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
