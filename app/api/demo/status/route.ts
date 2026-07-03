import { NextResponse } from "next/server";

import { resolveDemoStatus } from "@/lib/demo-status";

export function GET() {
  return NextResponse.json(
    resolveDemoStatus({
      ...process.env,
      NEXT_PUBLIC_REAL_DEMO_FLOW: process.env.NEXT_PUBLIC_REAL_DEMO_FLOW,
      NEXT_PUBLIC_ENABLE_SENTINEL_VOICE:
        process.env.NEXT_PUBLIC_ENABLE_SENTINEL_VOICE,
    }),
  );
}
