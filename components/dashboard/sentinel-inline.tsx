"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import {
  answerSentinelQuestion,
  buildDefaultSentinelBrief,
  buildSuggestedSentinelQuestions,
  type CommandState,
} from "@/lib/sentinel-command-agent";

type SentinelInlineProps = {
  commandState: CommandState;
};

export function SentinelInline({ commandState }: SentinelInlineProps) {
  const [open, setOpen] = useState(false);
  const [questionInput, setQuestionInput] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);

  const incidentId = commandState.selectedIncidentPackage?.incident.id ?? "";
  const brief = buildDefaultSentinelBrief(commandState);
  const suggestedQuestions = buildSuggestedSentinelQuestions(commandState);
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
  }, [incidentId]);

  function submitQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed) return;
    setQuestionInput(trimmed);
    setAnswer(answerSentinelQuestion(trimmed, commandState).answer);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitQuestion(questionInput);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        data-testid="sentinel-control"
        aria-expanded={open}
        aria-controls={incidentId ? `sentinel-panel-${incidentId}` : undefined}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/8 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.05em] text-violet-900 transition-colors hover:bg-violet-500/12"
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
          id={incidentId ? `sentinel-panel-${incidentId}` : undefined}
          data-testid="sentinel-panel"
          className="mt-3 rounded-md border border-violet-500/20 bg-violet-500/5 p-3"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-violet-800">
            Ask about this incident
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Sentinel reads the current command state.
          </p>

          {!answer ? (
            <p className="mt-2 text-sm leading-5 text-slate-700">{brief}</p>
          ) : (
            <p
              className="mt-2 text-sm leading-5 text-slate-700"
              data-testid="sentinel-answer"
            >
              {answer}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                type="button"
                data-testid="sentinel-suggested-question"
                onClick={() => submitQuestion(question)}
                className="rounded-full border border-violet-500/25 bg-white px-2.5 py-1 text-xs text-violet-900 transition-colors hover:border-violet-500/40 hover:bg-violet-500/5"
              >
                {question}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
            <input
              type="text"
              value={questionInput}
              onChange={(event) => setQuestionInput(event.target.value)}
              placeholder="Ask about this incident…"
              data-testid="sentinel-question-input"
              className="min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-800 placeholder:text-slate-400"
            />
            <button
              type="submit"
              className="shrink-0 rounded-md border border-violet-500/30 bg-violet-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.04em] text-white transition-colors hover:bg-violet-700"
            >
              Ask
            </button>
          </form>

          {answer ? (
            <p className="mt-2 text-xs text-slate-500">
              Answers are grounded in the active incident and command file.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
