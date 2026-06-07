"use client";

import { useState } from "react";

import {
  TRANSCRIPT_PRESETS,
  type RadioTranscriptRecord,
} from "@/lib/radio-transcript-intake";

type RadioTranscriptPanelProps = {
  onExtract: (text: string, presetId?: string) => void;
  extractStatus: string | null;
  latestRecord: RadioTranscriptRecord | null;
};

function TranscriptResultSummary({
  statusText,
  record,
}: {
  statusText: string;
  record: RadioTranscriptRecord | null;
}) {
  const matchedCount = record?.matchedIncidentIds.length ?? 0;
  const addedCount = record?.addedIncidentIds.length ?? 0;

  return (
    <div
      className="rounded-md border border-slate-200 bg-[var(--panel-inset)] px-3 py-2 text-sm text-slate-700"
      data-testid="transcript-extract-summary"
    >
      <p>{statusText}</p>
      {record && (matchedCount > 0 || addedCount > 0) ? (
        <div className="transcript-result-chips">
          {matchedCount > 0 ? (
            <span className="transcript-result-chip transcript-result-chip-matched">
              {matchedCount} matched in queue
            </span>
          ) : null}
          {addedCount > 0 ? (
            <span className="transcript-result-chip transcript-result-chip-added">
              {addedCount} new report{addedCount === 1 ? "" : "s"} added
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function RadioTranscriptPanel({
  onExtract,
  extractStatus,
  latestRecord,
}: RadioTranscriptPanelProps) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [activePresetId, setActivePresetId] = useState<string | undefined>();

  function applyPreset(presetId: string) {
    const preset = TRANSCRIPT_PRESETS.find((item) => item.id === presetId);
    if (!preset) {
      return;
    }

    setText(preset.text);
    setActivePresetId(presetId);
    setOpen(true);
  }

  function handleExtract() {
    onExtract(text.trim(), activePresetId);
  }

  const summaryText =
    extractStatus ?? (latestRecord?.extractionSummary ? "Last radio extract ready." : null);

  return (
    <section className="border-t border-slate-200 pt-2" data-testid="radio-transcript-panel">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-600"
          data-testid="radio-transcript-toggle"
          aria-expanded={open}
        >
          {open ? "Hide radio transcript" : "Add radio transcript"}
        </button>
        {!open && summaryText ? (
          <span className="text-xs text-slate-500">{summaryText}</span>
        ) : null}
      </div>

      {open ? (
        <div className="mt-2 space-y-2">
          <p className="text-xs text-slate-500">
            Add operations radio lines or use a preset.
          </p>

          <div className="flex flex-wrap gap-1.5">
            {TRANSCRIPT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-slate-300"
                data-testid={`transcript-preset-${preset.id}`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={3}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-[#07111c]"
            placeholder="Paste radio lines..."
            data-testid="radio-transcript-input"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExtract}
              disabled={text.trim().length === 0}
              className="rounded-md border border-blue-500/40 bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
              data-testid="extract-transcript"
            >
              Extract reports
            </button>
          </div>

          {summaryText ? (
            <TranscriptResultSummary statusText={summaryText} record={latestRecord} />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
