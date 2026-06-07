import { describe, expect, it } from "vitest";

import {
  buildEmptyCommandState,
  getRealDemoQueueEmptyMessage,
  getRealDemoWorkspaceEmptyBody,
  getRealDemoWorkspaceEmptyTitle,
} from "@/lib/command-empty-state";
import { isRealDemoFlowEnabled } from "@/lib/feature-flags";

describe("real demo command state", () => {
  it("builds an empty queue and timeline", () => {
    const state = buildEmptyCommandState();

    expect(state.incidentPackages).toEqual([]);
    expect(state.timeline).toEqual([]);
    expect(state.report).toBe("");
  });

  it("describes disconnected and connected-but-not-pulled states", () => {
    expect(getRealDemoQueueEmptyMessage(false)).toContain("No operations data connected");
    expect(getRealDemoQueueEmptyMessage(true)).toContain("Pull latest reports");

    expect(getRealDemoWorkspaceEmptyTitle(false)).toBe("No operations data connected");
    expect(getRealDemoWorkspaceEmptyTitle(true)).toBe("No incidents loaded yet");

    expect(getRealDemoWorkspaceEmptyBody(true)).toContain("Pull latest reports");
  });

  it("only enables real-demo flow when NEXT_PUBLIC_REAL_DEMO_FLOW is true", () => {
    const previous = process.env.NEXT_PUBLIC_REAL_DEMO_FLOW;
    process.env.NEXT_PUBLIC_REAL_DEMO_FLOW = "false";
    expect(isRealDemoFlowEnabled()).toBe(false);

    process.env.NEXT_PUBLIC_REAL_DEMO_FLOW = "true";
    expect(isRealDemoFlowEnabled()).toBe(true);

    process.env.NEXT_PUBLIC_REAL_DEMO_FLOW = previous;
  });
});
