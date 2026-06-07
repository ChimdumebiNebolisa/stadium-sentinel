import { NextResponse } from "next/server";

import { runSentinelAgent } from "@/lib/agent/sentinel-agent";
import type { SentinelAskRequest } from "@/lib/agent/sentinel-schema";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as Partial<SentinelAskRequest>;

  const question = body.question?.trim();
  const incidentId = body.incidentId?.trim();
  const incidentPackage = body.context?.incidentPackage;
  const timeline = body.context?.timeline;
  const queueTitles = body.context?.queueTitles;

  if (!question || !incidentId || !incidentPackage || !timeline || !queueTitles) {
    return NextResponse.json(
      { error: "question, incidentId, and context are required." },
      { status: 400 },
    );
  }

  try {
    const response = await runSentinelAgent({
      question,
      incidentId,
      context: {
        incidentPackage,
        timeline,
        queueTitles,
        sourceMode: body.context?.sourceMode ?? null,
        pullStatus: body.context?.pullStatus ?? null,
      },
    });

    return NextResponse.json(response);
  } catch {
    const fallback = await runSentinelAgent({
      question,
      incidentId,
      context: {
        incidentPackage,
        timeline,
        queueTitles,
        sourceMode: body.context?.sourceMode ?? null,
        pullStatus: body.context?.pullStatus ?? null,
      },
    });
    return NextResponse.json(fallback);
  }
}
