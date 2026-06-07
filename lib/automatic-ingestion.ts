import { normalizeDemoBatch } from "@/lib/command-state-normalizer";
import {
  generateDemoIncidentBatch,
  localStorageIncidentToPackage,
  saveDemoIncidentBatch,
} from "@/lib/demo-incident-pool";
import { isElasticConfigured } from "@/lib/elastic/client";
import { resolveIngestionFallbackMessage } from "@/lib/ingestion-fallback";
import type { NormalizedIngestionResult } from "@/lib/source-mode";
import { rebuildTimelineFromPersistedState, sortIncidentPackages } from "@/lib/radio-transcript-intake";
import type { RadioTranscriptRecord } from "@/lib/radio-transcript-intake";
import { buildPostEventReport } from "@/lib/report";

export type AutomaticIngestionGate = {
  enabled: boolean;
  reason: string;
};

export function evaluateAutomaticIngestionGate(
  sourcesConnected: boolean,
  elasticConfigured: boolean = isElasticConfigured(),
): AutomaticIngestionGate {
  if (!sourcesConnected) {
    return {
      enabled: false,
      reason: "Connect demo sources before enabling automatic ingest.",
    };
  }

  if (!elasticConfigured) {
    return {
      enabled: false,
      reason:
        "Automatic ingest prototype stays gated until Elastic is configured. Demo pull remains available.",
    };
  }

  return {
    enabled: true,
    reason:
      "Prototype only: runs a gated demo batch refresh and records an automatic ingest audit event.",
  };
}

export function runAutomaticIngestionPrototype(input: {
  transcriptRecord: RadioTranscriptRecord | null;
}): NormalizedIngestionResult | { error: string; fallbackMessage: string } {
  const gate = evaluateAutomaticIngestionGate(true, isElasticConfigured());

  if (!gate.enabled) {
    return {
      error: gate.reason,
      fallbackMessage: resolveIngestionFallbackMessage("automatic", gate.reason),
    };
  }

  const batch = generateDemoIncidentBatch();
  saveDemoIncidentBatch(batch);
  const packages = sortIncidentPackages(
    batch.incidents.map(localStorageIncidentToPackage),
  );
  const timeline = rebuildTimelineFromPersistedState(
    packages,
    [],
    input.transcriptRecord,
  );
  const reportSummary = buildPostEventReport(packages, timeline);

  return normalizeDemoBatch(packages, timeline, reportSummary);
}
