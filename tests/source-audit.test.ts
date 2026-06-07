import { describe, expect, it } from "vitest";

import {
  appendSourceAuditEvent,
  buildSourceAuditEvent,
  capAuditEvents,
  getRecentSourceAuditExcerpts,
  MAX_SOURCE_AUDIT_EVENTS,
} from "@/lib/source-audit";

describe("source audit trail", () => {
  it("caps audit history to avoid state bloat", () => {
    const events = Array.from({ length: 25 }, (_, index) =>
      buildSourceAuditEvent({
        sourceMode: "demo",
        label: "Demo pull",
        summary: `Event ${index}`,
        outcome: "success",
        incidentCount: 3,
      }),
    );

    expect(capAuditEvents(events)).toHaveLength(MAX_SOURCE_AUDIT_EVENTS);
  });

  it("prepends new audit events and keeps recent excerpts", () => {
    const first = buildSourceAuditEvent({
      sourceMode: "manual",
      label: "Manual report",
      summary: "Manual ingestion applied 3 incident packages.",
      outcome: "success",
      incidentCount: 3,
    });
    const next = appendSourceAuditEvent(first, []);

    expect(next).toHaveLength(1);
    expect(getRecentSourceAuditExcerpts(next)[0]).toContain("Manual report");
  });
});
