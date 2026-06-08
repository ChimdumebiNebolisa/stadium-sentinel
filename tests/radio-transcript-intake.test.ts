import { describe, expect, it, vi } from "vitest";

import {
  getPoolIncidentById,
  localStorageIncidentToPackage,
} from "@/lib/demo-incident-pool";
import { buildDemoState } from "@/lib/demo";
import {
  appendTranscriptTimelineEntries,
  buildExtractionStatusMessage,
  buildTranscriptTimelineEntries,
  enrichPackageWithRadioEvidence,
  extractTranscriptIncidents,
  filterSnippetsForActiveQueue,
  getCanonicalActiveIncidentIds,
  loadRadioTranscriptRecord,
  RADIO_TRANSCRIPT_KEY,
  TRANSCRIPT_PRESETS,
} from "@/lib/radio-transcript-intake";

const FORBIDDEN_PATTERN =
  /\bCritical\b|\bLow\b|\bseverity\b|\bconfidence\b|\bscore\b/i;

describe("radio transcript intake", () => {
  it("recognizes the standard preset without adding incidents already in queue", () => {
    const result = extractTranscriptIncidents({
      text: TRANSCRIPT_PRESETS[0]!.text,
      activeIncidentIds: getCanonicalActiveIncidentIds(),
      sourceLabel: "Preset",
      presetId: "standard",
    });

    expect(result.matchedIncidentIds).toHaveLength(3);
    expect(result.addedIds).toHaveLength(0);
    expect(result.record.extractionStatus).toBe("extracted");
    expect(buildExtractionStatusMessage(result.addedIds.length, result.matchedIncidentIds.length)).toBe(
      "Radio transcript processed. 3 reports matched in the current queue.",
    );
  });

  it("adds a restroom incident when it is not already in the queue", () => {
    const result = extractTranscriptIncidents({
      text: TRANSCRIPT_PRESETS[1]!.text,
      activeIncidentIds: getCanonicalActiveIncidentIds(),
      sourceLabel: "Preset",
      presetId: "restroom",
    });

    expect(result.addedIds).toContain("incident-restroom-outage");
    expect(result.matchedIncidentIds).toHaveLength(0);
    expect(result.addedIncidents[0]?.title).toBe("Restroom out of order");
  });

  it("returns empty status and follow-up questions for unknown text", () => {
    const result = extractTranscriptIncidents({
      text: "Weather update only. No operational details.",
      activeIncidentIds: getCanonicalActiveIncidentIds(),
      sourceLabel: "Manual paste",
    });

    expect(result.record.extractionStatus).toBe("empty");
    expect(result.record.followUpQuestions.length).toBeGreaterThan(0);
    expect(buildExtractionStatusMessage(0, 0)).toBe(
      "No reports matched this transcript. Try a preset or add location and team details.",
    );
  });

  it("returns null for malformed transcript localStorage", () => {
    const storage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => {
          storage.set(key, value);
        },
      },
    });

    storage.set(RADIO_TRANSCRIPT_KEY, "{not-valid-json");
    expect(loadRadioTranscriptRecord()).toBeNull();

    storage.set(RADIO_TRANSCRIPT_KEY, JSON.stringify({ id: "broken" }));
    expect(loadRadioTranscriptRecord()).toBeNull();

    vi.unstubAllGlobals();
  });

  it("filters transcript log snippets to active queue incident IDs", () => {
    const filtered = filterSnippetsForActiveQueue(
      [
        {
          incidentId: "incident-gate-b",
          line: "Gate B is backed up.",
          timestamp: "20:20",
        },
        {
          incidentId: "incident-restroom-outage",
          line: "West Concourse restroom is out of order.",
          timestamp: "20:21",
        },
      ],
      new Set(["incident-gate-b"]),
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.incidentId).toBe("incident-gate-b");
  });

  it("enriches matched incidents with radio_log evidence without duplicates", () => {
    const stored = getPoolIncidentById("incident-gate-b");
    expect(stored).toBeDefined();

    const incidentPackage = localStorageIncidentToPackage(stored!);
    const firstPass = enrichPackageWithRadioEvidence(
      incidentPackage,
      "Gate B is backed up.",
    );
    const secondPass = enrichPackageWithRadioEvidence(
      firstPass,
      "Gate B is backed up.",
    );

    expect(firstPass.evidence.some((item) => item.sourceType === "radio_log")).toBe(true);
    // Re-extracting the same matched line must not add a duplicate radio_log entry.
    const matchedExcerpt = "Gate B is backed up.";
    expect(
      secondPass.evidence.filter(
        (item) => item.sourceType === "radio_log" && item.excerpt === matchedExcerpt,
      ),
    ).toHaveLength(1);
    expect(
      secondPass.evidence.filter((item) => item.sourceType === "radio_log").length,
    ).toBe(firstPass.evidence.filter((item) => item.sourceType === "radio_log").length);
    expect(secondPass.incident.id).toBe(incidentPackage.incident.id);
  });

  it("builds idempotent transcript timeline entries on re-extract", () => {
    const demo = buildDemoState();
    const incidentId = "incident-gate-b";
    const line = "Gate B is backed up.";

    const firstEntries = buildTranscriptTimelineEntries(
      incidentId,
      line,
      false,
      demo.timeline,
      demo.timeline.length,
    );
    const secondEntries = buildTranscriptTimelineEntries(
      incidentId,
      line,
      false,
      [...demo.timeline, ...firstEntries],
      demo.timeline.length + firstEntries.length,
    );

    expect(firstEntries.length).toBeGreaterThan(0);
    expect(secondEntries).toHaveLength(0);
  });

  it("includes both added and matched counts in extraction summary", () => {
    const result = extractTranscriptIncidents({
      text: `${TRANSCRIPT_PRESETS[0]!.text}\n${TRANSCRIPT_PRESETS[1]!.text}`,
      activeIncidentIds: getCanonicalActiveIncidentIds(),
      sourceLabel: "Preset",
      presetId: "standard",
    });

    expect(result.addedIds).toContain("incident-restroom-outage");
    expect(result.matchedIncidentIds).toHaveLength(3);
    expect(result.record.extractionSummary).toContain("New reports added:");
    expect(result.record.extractionSummary).toContain("Reports matched in current queue:");
  });

  it("appends transcript timeline entries for active snippets only", () => {
    const demo = buildDemoState();
    const snippets = [
      {
        incidentId: "incident-gate-b",
        line: "Gate B is backed up.",
        timestamp: "20:20",
      },
    ];

    const nextTimeline = appendTranscriptTimelineEntries(
      demo.timeline,
      snippets,
      { "incident-gate-b": "Gate B is backed up." },
      [],
    );

    expect(nextTimeline.some((entry) => entry.message.includes("Radio report received"))).toBe(
      true,
    );
  });

  it("avoids forbidden wording in status and summary text", () => {
    const result = extractTranscriptIncidents({
      text: TRANSCRIPT_PRESETS[0]!.text,
      activeIncidentIds: getCanonicalActiveIncidentIds(),
      sourceLabel: "Preset",
      presetId: "standard",
    });

    const combined = [
      buildExtractionStatusMessage(result.addedIds.length, result.matchedIncidentIds.length),
      result.record.extractionSummary ?? "",
      ...result.record.followUpQuestions,
    ].join(" ");

    expect(combined).not.toMatch(FORBIDDEN_PATTERN);
  });
});
