import { NextResponse } from "next/server";

import { resolveIngestionPathStatus } from "@/lib/ingestion-fallback";
import { isElasticConfigured } from "@/lib/elastic/client";
import { resolveSeedHealth } from "@/lib/elastic/seed-health";

export async function GET() {
  const elasticConfigured = isElasticConfigured();
  const seedHealth = elasticConfigured ? await resolveSeedHealth() : undefined;
  const status = resolveIngestionPathStatus(elasticConfigured, seedHealth);

  return NextResponse.json({
    demoFallbackAvailable: status.demoFallbackAvailable,
    elasticConfigured: status.elasticConfigured,
    activePath: status.activePath,
    statusLine: status.statusLine,
    detailLine: status.detailLine,
    seedHealth,
  });
}
