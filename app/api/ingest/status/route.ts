import { NextResponse } from "next/server";

import { resolveIngestionPathStatus } from "@/lib/ingestion-fallback";

export async function GET() {
  const status = resolveIngestionPathStatus();

  return NextResponse.json({
    demoFallbackAvailable: status.demoFallbackAvailable,
    elasticConfigured: status.elasticConfigured,
    activePath: status.activePath,
    statusLine: status.statusLine,
    detailLine: status.detailLine,
  });
}
