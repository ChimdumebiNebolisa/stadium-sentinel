import { describe, expect, it } from "vitest";

import { buildDemoState } from "@/lib/demo";
import {
  areAllRecommendedActionsComplete,
  compareIncidentQueueOrder,
  getIncidentCompletionLabel,
  hasExplicitCompletedStatus,
  isIncidentCompleted,
} from "@/lib/incident-completion";
import { sortIncidentPackages } from "@/lib/radio-transcript-intake";
import type { Incident, IncidentPackage } from "@/lib/types";

function approveAllActions(incidentPackage: IncidentPackage): IncidentPackage {
  const { incident } = incidentPackage;

  return {
    ...incidentPackage,
    incident: {
      ...incident,
      status: "actioned",
      approvedActionIds: incident.recommendedActions.map(
        (_, index) => `${incident.id}-action-${index}`,
      ),
    },
  };
}

function withExplicitResolvedStatus(incident: Incident): Incident {
  return {
    ...incident,
    details: {
      ...incident.details,
      incidentLog: [
        {
          eventId: `${incident.id}-resolved`,
          eventTime: "20:45",
          eventType: "resolved",
          title: "Response complete",
          detail: "All response steps logged.",
          actorLabel: "Operations Lead",
        },
      ],
    },
  };
}

describe("incident completion helpers", () => {
  it("returns incomplete when any recommended action remains pending", () => {
    const demo = buildDemoState();
    const incidentPackage = demo.incidentPackages[0]!;

    expect(areAllRecommendedActionsComplete(incidentPackage.incident)).toBe(false);
    expect(isIncidentCompleted({ incident: incidentPackage.incident })).toBe(false);
    expect(getIncidentCompletionLabel({ incident: incidentPackage.incident })).toBeNull();
  });

  it("returns completed when all recommended actions are approved", () => {
    const demo = buildDemoState();
    const completedPackage = approveAllActions(demo.incidentPackages[0]!);

    expect(areAllRecommendedActionsComplete(completedPackage.incident)).toBe(true);
    expect(isIncidentCompleted({ incident: completedPackage.incident })).toBe(true);
    expect(getIncidentCompletionLabel({ incident: completedPackage.incident })).toBe(
      "Completed",
    );
  });

  it("respects explicit resolved status in local incident data", () => {
    const demo = buildDemoState();
    const incident = withExplicitResolvedStatus(demo.incidentPackages[0]!.incident);

    expect(hasExplicitCompletedStatus({ incident })).toBe(true);
    expect(isIncidentCompleted({ incident })).toBe(true);
    expect(getIncidentCompletionLabel({ incident })).toBe("Resolved");
  });

  it("places completed incidents below unresolved incidents in queue sort", () => {
    const demo = buildDemoState();
    const [first, second, third] = demo.incidentPackages;
    const completedFirst = approveAllActions(first!);
    const mixed = [completedFirst, second!, third!];

    const sorted = sortIncidentPackages(mixed);
    const ids = sorted.map(({ incident }) => incident.id);

    expect(ids[ids.length - 1]).toBe(completedFirst.incident.id);
    expect(compareIncidentQueueOrder(second!, completedFirst)).toBeLessThan(0);
    expect(compareIncidentQueueOrder(completedFirst, second!)).toBeGreaterThan(0);
  });

  it("keeps unresolved priority order unchanged among active incidents", () => {
    const demo = buildDemoState();
    const unresolved = demo.incidentPackages.map((incidentPackage) => ({
      ...incidentPackage,
      incident: {
        ...incidentPackage.incident,
        approvedActionIds: [],
      },
    }));

    expect(sortIncidentPackages(unresolved).map(({ incident }) => incident.id)).toEqual(
      unresolved.map(({ incident }) => incident.id),
    );
  });
});
