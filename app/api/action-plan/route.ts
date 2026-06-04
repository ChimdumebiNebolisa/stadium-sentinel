import { NextResponse } from "next/server";

import { runStadiumAgent } from "@/lib/agent/stadium-agent";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    report?: string;
    incidentId?: string;
  };
  const report = body.report?.trim();

  if (!report) {
    return NextResponse.json(
      { error: "report is required" },
      { status: 400 },
    );
  }

  const { incidentPackages, meta } = await runStadiumAgent(report);
  const packages = body.incidentId
    ? incidentPackages.filter(({ incident }) => incident.id === body.incidentId)
    : incidentPackages;

  return NextResponse.json({
    meta,
    actionPlans: packages.map(({ incident, staffUpdate }) => ({
      incidentId: incident.id,
      recommendedActions: incident.recommendedActions,
      assignedRole: incident.assignedRole,
      staffUpdate,
    })),
  });
}
