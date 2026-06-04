import { NextResponse } from "next/server";

import { runStadiumAgent } from "@/lib/agent/stadium-agent";
import type { TimelineEntry } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    report?: string;
    incidentId?: string;
    action?: string;
    actionIndex?: number;
  };
  const report = body.report?.trim();

  if (!report) {
    return NextResponse.json(
      { error: "report is required" },
      { status: 400 },
    );
  }

  const { timeline, meta } = await runStadiumAgent(report);

  if (!body.incidentId || !body.action) {
    return NextResponse.json({ meta, timeline });
  }

  const approvedEntry: TimelineEntry = {
    id: `${body.incidentId}-approved-${body.actionIndex ?? 0}`,
    incidentId: body.incidentId,
    timestamp: `20:${20 + timeline.length}`,
    type: "approved",
    message: body.action,
    actor: "Operations Lead",
  };

  return NextResponse.json({
    meta,
    timeline: [...timeline, approvedEntry],
  });
}
