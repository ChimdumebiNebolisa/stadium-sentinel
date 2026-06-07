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
        statusLine: "Seeded mock operations data ready in Elastic",
        detailLine:
          "Elastic seed indices meet minimum counts. Demo/local fallback remains active for page load and Pull until R3.",
      };
    }

    return {
      demoFallbackAvailable,
      elasticConfigured: true,
      activePath: "elastic-ready",
      statusLine: "Elastic configured · seed indices incomplete",
      detailLine:
        "Run npm run index:elastic to load seeded mock operations data. Demo/local fallback remains active.",
    };
  }

  return {
    demoFallbackAvailable,
    elasticConfigured: false,
    activePath: "elastic-unavailable",
    statusLine: "Operating on demo/local data",
    detailLine:
      "Elastic credentials are not configured. Demo pull, manual report, and transcript intake remain available.",
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
