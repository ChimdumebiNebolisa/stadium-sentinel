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
    extractStatus ??
    (latestRecord?.extractionSummary ?? null);

  return (
    <section className="border-t border-slate-200 pt-3" data-testid="radio-transcript-panel">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="text-sm font-semibold text-blue-700 transition-colors hover:text-blue-600"
        data-testid="radio-transcript-toggle"
        aria-expanded={open}
      >
        {open ? "Hide radio transcript" : "Add radio transcript"}
      </button>

      {open ? (
        <div className="mt-3 space-y-3">
          <p className="text-sm text-slate-500">
            Simulated radio log — paste or edit lines from ops channels.
          </p>

          <div className="flex flex-wrap gap-2">
            {TRANSCRIPT_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset.id)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-slate-300"
                data-testid={`transcript-preset-${preset.id}`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={4}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-[#07111c]"
            placeholder="Paste radio lines from ops channels..."
            data-testid="radio-transcript-input"
          />

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleExtract}
              disabled={text.trim().length === 0}
              className="rounded-md border border-blue-500/40 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-45"
              data-testid="extract-transcript"
            >
              Extract reports
            </button>
          </div>

          {summaryText ? (
            <div
              className="rounded-md border border-slate-200 bg-[var(--panel-inset)] px-3 py-2 text-sm text-slate-700"
              data-testid="transcript-extract-summary"
            >
              {summaryText}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
