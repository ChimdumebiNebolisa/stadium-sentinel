import { NextResponse } from "next/server";

import { resolveElasticBootstrap } from "@/lib/elastic/bootstrap";
import { isElasticConfigured } from "@/lib/elastic/client";

export async function POST() {
  const result = await resolveElasticBootstrap();

  return NextResponse.json({
    outcome: result.outcome,
    skipped: result.skipped ?? false,
    elasticConfigured: isElasticConfigured(),
    seedHealth: result.seedHealth,
    indexedCounts: result.indexedCounts,
    errorSummary: result.errorSummary,
  });
}
