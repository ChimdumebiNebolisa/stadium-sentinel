import type { IncidentPackage, ReportSummary, TimelineEntry } from "@/lib/types";

export type SourceMode =
  | "demo"
  | "manual"
  | "transcript"
  | "elastic"
  | "automatic";

export type IngestionOutcome = "success" | "fallback" | "failed";

export type IngestionContract = {
  mode: SourceMode;
  label: string;
  requiresConfirmationWhenQueueNonEmpty: boolean;
};

export const INGESTION_CONTRACTS: Record<SourceMode, IngestionContract> = {
  demo: {
    mode: "demo",
    label: "Demo pull",
    requiresConfirmationWhenQueueNonEmpty: false,
  },
  manual: {
    mode: "manual",
    label: "Manual report",
    requiresConfirmationWhenQueueNonEmpty: true,
  },
  transcript: {
    mode: "transcript",
    label: "Radio transcript",
    requiresConfirmationWhenQueueNonEmpty: false,
  },
  elastic: {
    mode: "elastic",
    label: "Elastic evidence",
    requiresConfirmationWhenQueueNonEmpty: false,
  },
  automatic: {
    mode: "automatic",
    label: "Automatic ingest",
    requiresConfirmationWhenQueueNonEmpty: true,
  },
};

export type NormalizedIngestionResult = {
  incidentPackages: IncidentPackage[];
  timeline: TimelineEntry[];
  reportSummary: ReportSummary;
  sourceMode: SourceMode;
  ingestionSummary: string;
  outcome: IngestionOutcome;
};

export type ManualIngestionInput = {
  reportText: string;
  confirmedReplace: boolean;
  queueNonEmpty: boolean;
};

export function manualIngestionRequiresConfirmation(
  queueNonEmpty: boolean,
  confirmedReplace: boolean,
): boolean {
  return (
    queueNonEmpty &&
    !confirmedReplace &&
    INGESTION_CONTRACTS.manual.requiresConfirmationWhenQueueNonEmpty
  );
}
