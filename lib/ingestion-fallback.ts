import { isElasticConfigured } from "@/lib/elastic/client";

export type IngestionPathStatus = {
  demoFallbackAvailable: boolean;
  elasticConfigured: boolean;
  activePath: "demo-local" | "elastic-ready" | "elastic-unavailable";
  statusLine: string;
  detailLine: string;
};

export function resolveIngestionPathStatus(
  elasticConfigured: boolean = isElasticConfigured(),
): IngestionPathStatus {
  const demoFallbackAvailable = true;

  if (elasticConfigured) {
    return {
      demoFallbackAvailable,
      elasticConfigured: true,
      activePath: "elastic-ready",
      statusLine: "Demo/local fallback active · Elastic configured",
      detailLine:
        "Command center loads from demo/localStorage. Elastic reads are optional and never required for page load.",
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
