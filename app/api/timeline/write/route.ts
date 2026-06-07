import { NextResponse } from "next/server";

import {
  buildTimelineEntryFromApproval,
  writeApprovedActionToElastic,
} from "@/lib/elastic/timeline-write";
import type { IncidentPackage } from "@/lib/types";

type TimelineWriteRequest = {
  incidentId?: string;
  actionIndex?: number;
  actionLabel?: string;
  actor?: string;
  sentinelRecommendationId?: string;
  incidentPackage?: IncidentPackage;
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as TimelineWriteRequest;

  if (
    !body.incidentId ||
    typeof body.actionIndex !== "number" ||
    !body.actionLabel?.trim() ||
    !body.incidentPackage
  ) {
    return NextResponse.json(
      { error: "incidentId, actionIndex, actionLabel, and incidentPackage are required." },
      { status: 400 },
    );
  }

  const input = {
    incidentId: body.incidentId,
    actionIndex: body.actionIndex,
    actionLabel: body.actionLabel.trim(),
    actor: body.actor?.trim() || "Operations Lead",
    sentinelRecommendationId: body.sentinelRecommendationId,
    incidentPackage: body.incidentPackage,
  };

  const { elasticWritten, result } = await writeApprovedActionToElastic(input);
  const fallbackResult = buildTimelineEntryFromApproval(input);

  return NextResponse.json({
    timelineEntry: result.timelineEntry ?? fallbackResult.timelineEntry,
    memoryWritten: elasticWritten,
    elasticWritten,
    sourceAuditSummary: elasticWritten
      ? `Elastic write-back recorded for ${input.incidentId}.`
      : `Local approval recorded; Elastic write-back unavailable for ${input.incidentId}.`,
  });
}
