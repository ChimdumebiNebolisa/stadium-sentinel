import { NextResponse } from "next/server";

import { runStadiumAgent } from "@/lib/agent/stadium-agent";
import { buildPostEventReport } from "@/lib/report";
import { appendIncidentMemory } from "@/lib/elastic/memory";
import type { IncidentPackage, StadiumIncidentMemoryDocument, TimelineEntry } from "@/lib/types";

function applyApprovals(
  incidentPackages: IncidentPackage[],
  approvals: Array<{ incidentId: string; actionIndex: number }> = [],
) {
  return incidentPackages.map((incidentPackage) => {
    const approvedActionIds = approvals
      .filter((approval) => approval.incidentId === incidentPackage.incident.id)
      .map(
        (approval) =>
          `${approval.incidentId}-action-${approval.actionIndex}`,
      );

    if (approvedActionIds.length === 0) {
      return incidentPackage;
    }

    return {
      ...incidentPackage,
      incident: {
        ...incidentPackage.incident,
        status: "actioned" as const,
        approvedActionIds,
      },
    };
  });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    report?: string;
    approvals?: Array<{ incidentId: string; actionIndex: number }>;
    timeline?: TimelineEntry[];
  };
  const report = body.report?.trim();

  if (!report) {
    return NextResponse.json(
      { error: "report is required" },
      { status: 400 },
    );
  }

  const agentState = await runStadiumAgent(report);
  const incidentPackages = applyApprovals(agentState.incidentPackages, body.approvals);
  const timeline = body.timeline ?? agentState.timeline;
  const reportSummary = buildPostEventReport(incidentPackages, timeline);

  const memoryDocs: StadiumIncidentMemoryDocument[] = incidentPackages.map((pkg) => ({
    timestamp: new Date().toISOString(),
    incidentId: pkg.incident.id,
    title: pkg.incident.title,
    locationId: pkg.incident.locationId,
    locationLabel: pkg.incident.locationLabel,
    team: pkg.incident.assignedRole,
    priority: pkg.incident.priority,
    status: pkg.incident.status,
    summary: pkg.incident.rawText,
    approvedActionIds: pkg.incident.approvedActionIds || [],
    evidenceRefs: pkg.evidence.map((e) => e.sourceId),
    source: "api_report_route",
  }));

  await appendIncidentMemory(memoryDocs);

  return NextResponse.json({
    meta: agentState.meta,
    report: reportSummary,
  });
}
