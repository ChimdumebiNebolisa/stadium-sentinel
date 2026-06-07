import { describe, expect, it } from "vitest";

import { buildDemoState } from "@/lib/demo";
import { buildResponseTimeline } from "@/lib/response-timeline";

const FORBIDDEN_PATTERN =
  /\bCritical\b|\bLow\b|\bseverity\b|\bconfidence\b|\bscore\b/i;

describe("buildResponseTimeline", () => {
  it("marks intake complete and later stages pending or active for a new incident", () => {
    const demo = buildDemoState();
    const incidentPackage = demo.incidentPackages[0]!;

    const stages = buildResponseTimeline({
      incidentPackage,
      timeline: demo.timeline,
    });

    expect(stages).toHaveLength(5);
    expect(stages.map((stage) => stage.label)).toEqual([
      "Intake",
      "Acknowledged",
      "Team assigned",
      "Dispatched",
      "Resolved",
    ]);

    const intake = stages.find((stage) => stage.id === "intake");
    const dispatched = stages.find((stage) => stage.id === "dispatched");
    const resolved = stages.find((stage) => stage.id === "resolved");

    expect(intake?.state).toBe("done");
    expect(dispatched?.state).not.toBe("done");
    expect(resolved?.state).toBe("pending");
    expect(stages.some((stage) => stage.state === "active")).toBe(true);
  });

  it("progresses dispatched after primary dispatch approval", () => {
    const demo = buildDemoState();
    const incidentPackage = demo.incidentPackages[0]!;
    const incidentId = incidentPackage.incident.id;
    const approvedTimeline = [
      ...demo.timeline,
      {
        id: `${incidentId}-approved-0`,
        incidentId,
        timestamp: "20:30",
        type: "approved" as const,
        message: incidentPackage.incident.recommendedActions[0]!,
        actor: "Operations Lead",
      },
    ];
    const approvedPackage = {
      ...incidentPackage,
      incident: {
        ...incidentPackage.incident,
        status: "actioned" as const,
        approvedActionIds: [`${incidentId}-action-0`],
      },
    };

    const stages = buildResponseTimeline({
      incidentPackage: approvedPackage,
      timeline: approvedTimeline,
    });

    const dispatched = stages.find((stage) => stage.id === "dispatched");
    const resolved = stages.find((stage) => stage.id === "resolved");

    expect(dispatched?.state).toBe("done");
    expect(dispatched?.time).not.toBe("Pending");
    expect(resolved?.state).toBe("active");
  });

  it("uses optional pool timeline strings when provided", () => {
    const demo = buildDemoState();
    const incidentPackage = demo.incidentPackages[0]!;

    const stages = buildResponseTimeline({
      incidentPackage,
      timeline: [],
      poolTimeline: [
        "11:42 AM — Incident created",
        "11:43 AM — Acknowledged",
        "11:44 AM — Team notified",
      ],
    });

    expect(stages.find((stage) => stage.id === "intake")?.time).toBe("11:42 AM");
    expect(stages.find((stage) => stage.id === "acknowledged")?.time).toBe("11:43 AM");
    expect(stages.find((stage) => stage.id === "team-assigned")?.time).toBe("11:44 AM");
  });

  it("avoids forbidden wording in stage labels and status text", () => {
    const demo = buildDemoState();

    for (const incidentPackage of demo.incidentPackages) {
      const stages = buildResponseTimeline({
        incidentPackage,
        timeline: demo.timeline,
      });

      for (const stage of stages) {
        expect(`${stage.label} ${stage.statusText}`).not.toMatch(FORBIDDEN_PATTERN);
      }
    }
  });
});
