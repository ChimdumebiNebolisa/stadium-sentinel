import { isElasticConfigured } from "@/lib/elastic/client";
import type { SeedHealth } from "@/lib/elastic/seed-health";

export type IngestionPathStatus = {
  demoFallbackAvailable: boolean;
  elasticConfigured: boolean;
  activePath: "demo-local" | "elastic-ready" | "elastic-unavailable";
  statusLine: string;
  detailLine: string;
};

export function resolveIngestionPathStatus(
  elasticConfigured: boolean = isElasticConfigured(),
  seedHealth?: SeedHealth,
): IngestionPathStatus {
  const demoFallbackAvailable = true;

  if (elasticConfigured) {
    if (seedHealth?.ready) {
      return {
        demoFallbackAvailable,
        elasticConfigured: true,
        activePath: "elastic-ready",
        statusLine: "Seeded stadium operations data ready",
        detailLine:
          "Elastic indices meet minimum counts. Pull latest reports to load current incidents.",
      };
    }

    return {
      demoFallbackAvailable,
      elasticConfigured: true,
      activePath: "elastic-ready",
      statusLine: "Elastic configured · operations data not connected",
      detailLine:
        "Connect stadium operations data to load current incidents from Elastic.",
    };
  }

  return {
    demoFallbackAvailable,
    elasticConfigured: false,
    activePath: "elastic-unavailable",
    statusLine: "Operations data not connected",
    detailLine:
      "Connect stadium operations data to load current incidents from Elastic. Local fallback available if Elastic is unavailable.",
  };
}

export function resolveIngestionFallbackMessage(
  attemptedMode: "elastic" | "automatic",
  errorMessage?: string,
): string {
  const base =
    attemptedMode === "elastic"
      ? "Elastic evidence read unavailable."
      : "Automatic ingest unavailable.";

  if (errorMessage) {
    return `${base} Using demo/local fallback. ${errorMessage}`;
  }

  return `${base} Using demo/local fallback.`;
}

export function shouldUseDemoFallbackForIngestion(
  elasticConfigured: boolean,
  attemptedMode: "elastic" | "automatic",
): boolean {
  if (attemptedMode === "elastic" || attemptedMode === "automatic") {
    return !elasticConfigured || process.env.NODE_ENV === "test";
  }

  return true;
}
