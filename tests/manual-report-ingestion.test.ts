import { describe, expect, it } from "vitest";

import {
  planManualReportIngestion,
  resolveManualIngestionLocally,
} from "@/lib/manual-report-ingestion";

describe("manual report ingestion", () => {
  it("requires explicit confirmation when replacing a non-empty queue", () => {
    expect(
      planManualReportIngestion({
        reportText: "Gate B is backed up.",
        queueNonEmpty: true,
        confirmedReplace: false,
      }),
    ).toEqual({ type: "needs_confirmation" });
  });

  it("allows manual ingest when queue is empty", () => {
    const plan = planManualReportIngestion({
      reportText:
        "Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.",
      queueNonEmpty: false,
      confirmedReplace: false,
    });

    expect(plan.type).toBe("apply");
    if (plan.type === "apply") {
      expect(plan.result.sourceMode).toBe("manual");
      expect(plan.result.incidentPackages.length).toBeGreaterThan(0);
    }
  });

  it("normalizes manual reports into incident packages", () => {
    const result = resolveManualIngestionLocally(
      "Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.",
    );

    expect(result.sourceMode).toBe("manual");
    expect(result.incidentPackages.length).toBe(3);
    expect(result.timeline.length).toBeGreaterThan(0);
  });
});
