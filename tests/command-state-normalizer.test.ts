import { describe, expect, it } from "vitest";

import {
  normalizeDemoBatch,
  normalizeFromAgentRun,
  normalizeFromDemoState,
} from "@/lib/command-state-normalizer";
import { buildDemoState } from "@/lib/demo";
import {
  INGESTION_CONTRACTS,
  manualIngestionRequiresConfirmation,
} from "@/lib/source-mode";

describe("source mode contracts", () => {
  it("requires confirmation for manual ingest when queue is non-empty", () => {
    expect(INGESTION_CONTRACTS.manual.requiresConfirmationWhenQueueNonEmpty).toBe(
      true,
    );
    expect(manualIngestionRequiresConfirmation(true, false)).toBe(true);
    expect(manualIngestionRequiresConfirmation(true, true)).toBe(false);
    expect(manualIngestionRequiresConfirmation(false, false)).toBe(false);
  });

  it("does not require confirmation for demo pull", () => {
    expect(INGESTION_CONTRACTS.demo.requiresConfirmationWhenQueueNonEmpty).toBe(
      false,
    );
  });
});

describe("command state normalizer", () => {
  it("normalizes agent run results into incident packages and timeline", () => {
    const demo = buildDemoState();
    const normalized = normalizeFromAgentRun({
      report: demo.report,
      incidentPackages: demo.incidentPackages,
      timeline: demo.timeline,
      reportSummary: demo.reportSummary,
      meta: { retrievalMode: "local", geminiMode: "fallback", elasticMcpMode: "unused" },
    });

    expect(normalized.sourceMode).toBe("manual");
    expect(normalized.incidentPackages).toHaveLength(3);
    expect(normalized.timeline.length).toBeGreaterThan(0);
    expect(normalized.outcome).toBe("success");
  });

  it("normalizes demo fallback state with fallback outcome", () => {
    const normalized = normalizeFromDemoState(
      "Gate B is backed up and Elevator 4 is down.",
    );

    expect(normalized.outcome).toBe("fallback");
    expect(normalized.incidentPackages.length).toBeGreaterThan(0);
    expect(normalized.ingestionSummary).toContain("Fallback local ingestion");
  });

  it("normalizes demo batch pulls", () => {
    const demo = buildDemoState();
    const normalized = normalizeDemoBatch(
      demo.incidentPackages,
      demo.timeline,
      demo.reportSummary,
    );

    expect(normalized.sourceMode).toBe("demo");
    expect(normalized.outcome).toBe("success");
    expect(normalized.ingestionSummary).toContain("demo ingestion");
  });
});
