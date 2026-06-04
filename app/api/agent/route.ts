import { NextResponse } from "next/server";

import { runStadiumAgent } from "@/lib/agent/stadium-agent";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { report?: string };
  const report = body.report?.trim();

  if (!report) {
    return NextResponse.json({ error: "report is required" }, { status: 400 });
  }

  return NextResponse.json(await runStadiumAgent(report));
}
