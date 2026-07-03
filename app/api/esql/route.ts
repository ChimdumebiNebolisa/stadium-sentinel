import { NextResponse } from "next/server";
import { executeBoundedEsql } from "@/lib/elastic/esql";
import type { BoundedEsqlOperation } from "@/lib/types";

const VALID_OPERATIONS = ["count_by_priority", "count_by_team", "recent_by_location"];

export async function POST(request: Request) {
  let body: { operation?: string } = {};
  
  try {
    body = (await request.json()) as { operation?: string };
  } catch {
    // Syntax error in JSON is handled as missing operation.
  }

  const op = body.operation as BoundedEsqlOperation;

  if (!op || !VALID_OPERATIONS.includes(op)) {
    return NextResponse.json(
      { error: "Invalid ES|QL operation. Must be one of: count_by_priority, count_by_team, recent_by_location" },
      { status: 400 }
    );
  }

  try {
    const results = await executeBoundedEsql(op);
    return NextResponse.json(results);
  } catch (error) {
    console.warn("Bounded ES|QL Error:", error);
    return NextResponse.json(
      { error: "Internal server error during ES|QL operation" },
      { status: 500 }
    );
  }
}
