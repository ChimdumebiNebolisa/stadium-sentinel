import { describe, expect, it } from "vitest";

import { comparePriority, derivePriority } from "@/lib/priority";
import type { Incident } from "@/lib/types";

describe("priority routing", () => {
  it("assigns rule-based priorities without numeric scoring", () => {
    const elevator = derivePriority({
      incidentType: "facility-outage",
      category: "facility-outage",
      locationType: "elevator",
    });
    const accessibility = derivePriority({
      incidentType: "accessibility-assist",
      category: "guest-assistance",
      locationType: "section",
    });
    const queue = derivePriority({
      incidentType: "queue-congestion",
      category: "crowd-flow",
      locationType: "gate",
    });

    expect(accessibility).toBe("Immediate");
    expect(elevator).toBe("High");
    expect(queue).toBe("High");
  });

  it("sorts by operational priority and stable incident precedence", () => {
    const incidents = [
      {
        incidentType: "queue-congestion",
        priority: "High",
      },
      {
        incidentType: "facility-outage",
        priority: "High",
      },
      {
        incidentType: "accessibility-assist",
        priority: "Immediate",
      },
    ] satisfies Pick<Incident, "incidentType" | "priority">[];

    expect(incidents.sort(comparePriority)).toEqual([
      {
        incidentType: "accessibility-assist",
        priority: "Immediate",
      },
      {
        incidentType: "facility-outage",
        priority: "High",
      },
      {
        incidentType: "queue-congestion",
        priority: "High",
      },
    ]);
  });
});
