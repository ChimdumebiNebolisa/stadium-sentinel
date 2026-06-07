import type { SeedHealth } from "@/lib/elastic/seed-health";
import type { BootstrapOutcome } from "@/lib/elastic/bootstrap";

export type IngestBootstrapResponse = {
  outcome: BootstrapOutcome;
  skipped: boolean;
  elasticConfigured: boolean;
  seedHealth?: SeedHealth;
  indexedCounts?: Array<{ indexName: string; count: number }>;
  errorSummary?: string;
};

export async function fetchIngestBootstrap(): Promise<IngestBootstrapResponse> {
  const response = await fetch("/api/ingest/bootstrap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Bootstrap request failed with status ${response.status}.`);
  }

  return (await response.json()) as IngestBootstrapResponse;
}
