import { NextResponse } from "next/server";

import { isElasticConfigured } from "@/lib/elastic/client";
import { retrieveOperationalEvidenceWithContext } from "@/lib/evidence";
import { resolveIngestionFallbackMessage } from "@/lib/ingestion-fallback";
import type { PriorityLevel } from "@/lib/types";

type EvidenceReadRequest = {
  incidentTitle?: string;
  incidentCategory?: string;
  locationName?: string;
  priority?: PriorityLevel;
  reportText?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as EvidenceReadRequest;
  const elasticConfigured = isElasticConfigured();

  if (!body.incidentTitle || !body.locationName || !body.priority) {
    return NextResponse.json(
      { error: "incidentTitle, locationName, and priority are required." },
      { status: 400 },
    );
  }

  try {
    const context = await retrieveOperationalEvidenceWithContext({
      incidentTitle: body.incidentTitle,
      incidentCategory: body.incidentCategory ?? "guest-assistance",
      locationName: body.locationName,
      priority: body.priority,
      reportText: body.reportText ?? body.incidentTitle,
    });

    return NextResponse.json({
      evidence: context.evidence,
      retrievalMode: context.mode,
      elasticConfigured,
      fallbackMessage:
        context.mode === "local" && elasticConfigured
          ? resolveIngestionFallbackMessage(
              "elastic",
              "Elastic returned no matches; showing local knowledge.",
            )
          : context.mode === "local" && !elasticConfigured
            ? resolveIngestionFallbackMessage("elastic")
            : null,
    });
  } catch (error) {
    return NextResponse.json({
      evidence: [],
      retrievalMode: "local",
      elasticConfigured,
      fallbackMessage: resolveIngestionFallbackMessage(
        "elastic",
        error instanceof Error ? error.message : "Elastic read failed.",
      ),
    });
  }
}
