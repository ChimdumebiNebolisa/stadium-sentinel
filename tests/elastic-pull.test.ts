import { describe, expect, it } from "vitest";

import { normalizeFromElasticPull } from "@/lib/command-state-normalizer";
import {
  buildDemoPullFallbackResponse,
  mapActiveIncidentToPackage,
} from "@/lib/elastic/pull";
import {
  buildElasticPullTimeline,
  normalizeElasticActiveIncidents,
} from "@/lib/elastic/normalize-pull";
import type {
  ElasticActiveIncident,
  ElasticPullRelatedContext,
} from "@/lib/elastic/pull-types";
import { PRIORITY_ORDER } from "@/lib/priority";

const sampleIncident: ElasticActiveIncident = {
  id: "incident-section-112",
  title: "Section 112 assist",
  rawText: "Guest near Section 112 needs wheelchair access.",
  category: "guest-assistance",
  incidentType: "accessibility-assist",
  priority: "Immediate",
  locationId: "section-112",
  locationLabel: "Section 112",
  assignedRole: "Guest Services",
  status: "new",
  reportedAt: "2026-06-07T11:42:00.000Z",
  evidenceIds: ["evidence-section-112-guest-report-1"],
  guestAssistanceId: "assist-section-112-1",
  searchText: "section 112 assist guest wheelchair access immediate guest services",
};

const emptyContext: ElasticPullRelatedContext = {
  guestAssistance: [],
  facilityStatus: [],
  gateFlowLogs: [],
  staffRoster: [],
  policies: [],
  radioTranscripts: [],
  evidence: [],
  dispatchTimeline: [],
};

describe("elastic pull normalization", () => {
  it("maps ElasticActiveIncident to IncidentPackage", () => {
    const incidentPackage = mapActiveIncidentToPackage(sampleIncident, {
      ...emptyContext,
      guestAssistance: [
        {
          id: "assist-section-112-1",
          guestLocation: "Section 112",
          need: "Wheelchair access and escorted route to seating",
          priority: "Immediate",
          relatedIncidentId: "incident-section-112",
          locationId: "section-112",
          status: "open",
          requestedAt: "2026-06-07T11:42:00.000Z",
          assignedRole: "Guest Services",
          searchText: "section 112 wheelchair access",
        },
      ],
      evidence: [
        {
          id: "evidence-section-112-guest-report-1",
          sourceType: "guest_report",
          locationIds: ["section-112"],
          incidentHints: ["accessibility-assist"],
          excerpt: "Guest report near Section 112.",
          body: "Guest requested wheelchair assist.",
          searchText: "section 112 guest report",
        },
      ],
    });

    expect(incidentPackage.incident.id).toBe("incident-section-112");
    expect(incidentPackage.incident.priority).toBe("Immediate");
    expect(incidentPackage.incident.assignedRole).toBe("Guest Services");
    expect(incidentPackage.evidence.length).toBeGreaterThan(0);
  });

  it("sorts incidents by allowed priority order", () => {
    const incidents: ElasticActiveIncident[] = [
      {
        ...sampleIncident,
        id: "incident-restroom-outage",
        title: "Restroom out of order",
        priority: "Moderate",
      },
      sampleIncident,
      {
        ...sampleIncident,
        id: "incident-gate-b",
        title: "Gate B backed up",
        priority: "High",
      },
    ];

    const response = normalizeElasticActiveIncidents(incidents, emptyContext);
    const priorities = response.incidentPackages.map(
      ({ incident }) => incident.priority,
    );

    expect(priorities).toEqual(["Immediate", "High", "Moderate"]);
    for (const priority of priorities) {
      expect(PRIORITY_ORDER).toContain(priority);
    }
  });

  it("returns demo fallback packages when elastic path is unavailable", () => {
    const fallback = buildDemoPullFallbackResponse();
    expect(fallback.sourceMode).toBe("demo");
    expect(fallback.outcome).toBe("fallback");
    expect(fallback.incidentPackages.length).toBeGreaterThan(0);
    expect(fallback.meta.incidentCount).toBe(fallback.incidentPackages.length);
  });

  it("attaches staff roster assignments to incident packages", () => {
    const incidentPackage = mapActiveIncidentToPackage(sampleIncident, {
      ...emptyContext,
      staffRoster: [
        {
          id: "roster-guest-services-1",
          roleId: "guest-services-lead",
          team: "Guest Services",
          callSign: "GS-1",
          displayName: "Guest Services Lead",
          onDuty: true,
          zone: "Lower bowl",
          relatedIncidentIds: ["incident-section-112"],
          searchText: "guest services gs-1",
        },
      ],
    });

    expect(incidentPackage.assignedStaff).toEqual([
      {
        callSign: "GS-1",
        team: "Guest Services",
        displayName: "Guest Services Lead",
        zone: "Lower bowl",
      },
    ]);
  });

  it("prefers elastic dispatch timeline entries over synthetic seed timeline", () => {
    const incidentPackage = mapActiveIncidentToPackage(sampleIncident, emptyContext);
    const timeline = buildElasticPullTimeline([incidentPackage], [
      {
        id: "timeline-section-112-reported",
        incidentId: "incident-section-112",
        timestamp: "2026-06-07T11:42:00.000Z",
        type: "reported",
        message: "Guest reported need for wheelchair access near Section 112.",
        actor: "System",
        source: "system",
      },
    ]);

    expect(timeline).toHaveLength(1);
    expect(timeline[0]?.id).toBe("timeline-section-112-reported");
    expect(timeline[0]?.message).toContain("wheelchair access");
  });

  it("normalizes elastic pull response through command-state normalizer", () => {
    const response = normalizeElasticActiveIncidents([sampleIncident], emptyContext);
    const normalized = normalizeFromElasticPull(response);

    expect(normalized.sourceMode).toBe("elastic");
    expect(normalized.outcome).toBe("success");
    expect(normalized.incidentPackages[0]?.incident.id).toBe("incident-section-112");
  });
});
