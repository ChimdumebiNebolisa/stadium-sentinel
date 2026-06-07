import { NextResponse } from "next/server";

import { normalizeFromElasticPull } from "@/lib/command-state-normalizer";
import { pullLatestReportsFromElastic } from "@/lib/elastic/pull";
import type { IngestPullRequest } from "@/lib/elastic/pull-types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as IngestPullRequest | null;

  if (body !== null && typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const includeTimeline = body?.includeTimeline !== false;
  const response = await pullLatestReportsFromElastic(includeTimeline);
  const normalized = normalizeFromElasticPull(response);

  return NextResponse.json({
    sourceMode: response.sourceMode,
    outcome: response.outcome,
    ingestionSummary: normalized.ingestionSummary,
    incidentPackages: normalized.incidentPackages,
    timeline: normalized.timeline,
    reportSummary: normalized.reportSummary,
    meta: response.meta,
  });
}
