import type { IncidentDetails } from "@/lib/types";

/**
 * Batch 1B operational enrichment merged into INCIDENT_DETAILS_SEED at build time.
 * Operator-facing source-system framing only — not CRM or ticketing language.
 */
export const INCIDENT_OPERATIONAL_ENRICHMENT: Record<string, IncidentDetails> = {
  "incident-section-112": {
    sourceRecords: [
      {
        sourceRecordId: "GS-REQ-2026-0412",
        sourceSystemLabel: "Guest Services intake",
        recordType: "accessibility_request",
        requesterRole: "Section host",
        locationDescription: "Section 112 host stand",
        contactPreference: "Meet at host stand",
        accommodationNeed: "Wheelchair escort to lower-bowl accessible path",
        assignedDepartment: "Guest Services",
        statusHistory: [
          {
            at: "2026-06-07T11:42:00.000Z",
            status: "received",
            note: "Host stand received accessibility request.",
          },
          {
            at: "2026-06-07T11:42:30.000Z",
            status: "assigned",
            note: "Guest Services GS-1 dispatched for escort.",
          },
        ],
      },
    ],
    commandCenterNotes: [
      {
        noteId: "cc-section-112-1",
        at: "2026-06-07T11:42:15.000Z",
        authorLabel: "Command center operator",
        noteType: "decision",
        text: "Immediate priority confirmed; Guest Services lead on escort route.",
      },
    ],
    operationsUpdates: [
      {
        updateId: "ops-upd-section-112-1",
        at: "2026-06-07T11:43:00.000Z",
        team: "Guest Services",
        responderLabel: "GS-1",
        eta: "4 min",
        currentStatus: "en route",
        blocker: "none",
      },
    ],
    staffFieldReports: [
      {
        reportId: "sfr-section-112-1",
        at: "2026-06-07T11:42:00.000Z",
        reporterRole: "Section host",
        reportChannel: "host_stand",
        location: "Section 112",
        observedIssue: "Guest needs wheelchair assist to seating",
        immediateNeed: "Escort via accessible concourse path",
      },
    ],
    mediaMetadata: [
      {
        mediaId: "media-section-112-photo-1",
        mediaType: "staff_photo",
        available: false,
        sourceLabel: "Host stand camera",
        timestamp: "2026-06-07T11:42:00.000Z",
        description: "No staff photo attached to this request.",
        storageRef: "synthetic://media/unavailable/section-112-photo-1",
      },
      {
        mediaId: "media-section-112-radio-1",
        mediaType: "radio_transcript",
        available: true,
        sourceLabel: "Guest Services channel",
        timestamp: "2026-06-07T11:42:20.000Z",
        description: "Radio coordination for accessible escort route.",
        storageRef: "synthetic://radio/section-112-escort-1",
      },
    ],
    dispatchHandoff: {
      currentTeam: "Guest Services",
      handoffTo: "GS-1",
      handoffNote: "Escort guest via accessible lower-bowl path.",
      dispatchHistory: [
        {
          at: "2026-06-07T11:42:30.000Z",
          action: "assigned",
          actorLabel: "Operations",
        },
      ],
    },
  },

  "incident-elevator-4": {
    sourceRecords: [
      {
        sourceRecordId: "FAC-WO-2026-0887",
        sourceSystemLabel: "Facilities work order",
        recordType: "facilities_work_order",
        locationDescription: "Elevator 4 / East Stand vertical access",
        assignedDepartment: "Facilities",
        statusHistory: [
          {
            at: "2026-06-07T11:41:00.000Z",
            status: "open",
            note: "Elevator 4 outage flagged by status panel.",
          },
          {
            at: "2026-06-07T11:41:45.000Z",
            status: "assigned",
            note: "FAC-4 on scene for diagnosis.",
          },
        ],
      },
    ],
    commandCenterNotes: [
      {
        noteId: "cc-elevator-4-1",
        at: "2026-06-07T11:41:30.000Z",
        authorLabel: "Command center operator",
        noteType: "handoff",
        text: "Facilities and Guest Services authorized accessibility detour signage.",
      },
    ],
    operationsUpdates: [
      {
        updateId: "ops-upd-elevator-4-1",
        at: "2026-06-07T11:42:00.000Z",
        team: "Facilities",
        responderLabel: "FAC-4",
        eta: "12 min",
        currentStatus: "on scene",
        blocker: "awaiting elevator vendor callback",
        equipmentNeeded: "vendor diagnostic kit",
      },
    ],
    staffFieldReports: [
      {
        reportId: "sfr-elevator-4-1",
        at: "2026-06-07T11:41:20.000Z",
        reporterRole: "Concourse supervisor",
        reportChannel: "radio",
        location: "Elevator 4",
        observedIssue: "Guests pausing at inoperative lift",
        crowdImpact: "Minor queue at alternate route signage",
        uncertainty: "Vendor ETA not confirmed",
      },
    ],
    mediaMetadata: [
      {
        mediaId: "media-elevator-4-cctv-1",
        mediaType: "cctv_clip",
        available: true,
        sourceLabel: "East Stand lift camera",
        timestamp: "2026-06-07T11:41:10.000Z",
        description: "Guests pausing at Elevator 4 while staff redirect to detour.",
        storageRef: "synthetic://cctv/elevator-4-pause-1",
      },
      {
        mediaId: "media-elevator-4-radio-1",
        mediaType: "radio_transcript",
        available: true,
        sourceLabel: "Facilities channel",
        timestamp: "2026-06-07T11:41:35.000Z",
        description: "Facilities requested immediate lift access and detour handoff.",
        storageRef: "synthetic://radio/elevator-4-fac-1",
      },
    ],
    dispatchHandoff: {
      currentTeam: "Facilities",
      handoffTo: "FAC-4",
      handoffNote: "Verify outage and post alternate accessible route.",
      dispatchHistory: [
        {
          at: "2026-06-07T11:41:45.000Z",
          action: "dispatched",
          actorLabel: "Operations",
        },
      ],
    },
  },

  "incident-gate-b": {
    sourceRecords: [
      {
        sourceRecordId: "CF-ALERT-2026-0193",
        sourceSystemLabel: "Crowd Flow alert",
        recordType: "crowd_flow_alert",
        locationDescription: "Gate B perimeter queue",
        assignedDepartment: "Security / Crowd Flow",
        statusHistory: [
          {
            at: "2026-06-07T11:38:00.000Z",
            status: "active",
            note: "Queue extended into plaza stanchions.",
          },
          {
            at: "2026-06-07T11:38:45.000Z",
            status: "assigned",
            note: "CF-2 assigned to perimeter gates.",
          },
        ],
      },
    ],
    commandCenterNotes: [
      {
        noteId: "cc-gate-b-1",
        at: "2026-06-07T11:38:30.000Z",
        authorLabel: "Command center operator",
        noteType: "decision",
        text: "North overflow path authorized; priority remains High.",
      },
    ],
    operationsUpdates: [
      {
        updateId: "ops-upd-gate-b-1",
        at: "2026-06-07T11:39:00.000Z",
        team: "Security / Crowd Flow",
        responderLabel: "CF-2",
        eta: "2 min",
        currentStatus: "en route",
        blocker: "screening pace",
        equipmentNeeded: "none",
      },
    ],
    staffFieldReports: [
      {
        reportId: "sfr-gate-b-1",
        at: "2026-06-07T11:38:15.000Z",
        reporterRole: "Gate supervisor",
        reportChannel: "radio",
        location: "Gate B",
        observedIssue: "Queue backing into perimeter lane",
        crowdImpact: "Screening pace slowing",
        immediateNeed: "Overflow routing and lane direction",
      },
    ],
    mediaMetadata: [
      {
        mediaId: "media-gate-b-radio-1",
        mediaType: "radio_transcript",
        available: true,
        sourceLabel: "Operations radio",
        timestamp: "2026-06-07T11:38:20.000Z",
        description: "Supervisor radio on queue extension and overflow standby.",
        storageRef: "synthetic://radio/gate-b-queue-1",
      },
    ],
    dispatchHandoff: {
      currentTeam: "Security / Crowd Flow",
      handoffTo: "CF-2",
      handoffNote: "Open north overflow path and rebalance screening lanes.",
      dispatchHistory: [
        {
          at: "2026-06-07T11:38:45.000Z",
          action: "assigned",
          actorLabel: "Operations",
        },
      ],
    },
  },

  "incident-restroom-outage": {
    sourceRecords: [
      {
        sourceRecordId: "FAC-WO-2026-0901",
        sourceSystemLabel: "Facilities work order",
        recordType: "facilities_work_order",
        locationDescription: "West Concourse restroom bank",
        assignedDepartment: "Facilities",
        statusHistory: [
          {
            at: "2026-06-07T11:45:00.000Z",
            status: "open",
            note: "Restroom bank reported out of service.",
          },
          {
            at: "2026-06-07T11:45:30.000Z",
            status: "queued",
            note: "FAC-4 queued after Elevator 4 call.",
          },
        ],
      },
    ],
    commandCenterNotes: [
      {
        noteId: "cc-restroom-1",
        at: "2026-06-07T11:45:15.000Z",
        authorLabel: "Command center operator",
        noteType: "decision",
        text: "Moderate priority confirmed; post alternate route to Section 210 restroom bank.",
      },
    ],
    operationsUpdates: [
      {
        updateId: "ops-upd-restroom-1",
        at: "2026-06-07T11:46:00.000Z",
        team: "Facilities",
        responderLabel: "FAC-4",
        eta: "18 min",
        currentStatus: "queued",
        blocker: "active Elevator 4 response",
      },
    ],
    staffFieldReports: [
      {
        reportId: "sfr-restroom-1",
        at: "2026-06-07T11:45:00.000Z",
        reporterRole: "Concourse attendant",
        reportChannel: "mobile",
        location: "West Concourse",
        observedIssue: "Restroom bank unavailable",
        immediateNeed: "Alternate direction signage for guests",
      },
    ],
    mediaMetadata: [
      {
        mediaId: "media-restroom-photo-1",
        mediaType: "staff_photo",
        available: false,
        sourceLabel: "Facilities mobile",
        timestamp: "2026-06-07T11:45:10.000Z",
        description: "No photo attached; attendant verbal report only.",
        storageRef: "synthetic://media/unavailable/restroom-west-1",
      },
    ],
    dispatchHandoff: {
      currentTeam: "Facilities",
      handoffNote: "Verify closure and post alternate restroom direction.",
      dispatchHistory: [
        {
          at: "2026-06-07T11:46:00.000Z",
          action: "queued",
          actorLabel: "Operations",
        },
      ],
    },
  },

  "incident-aisle-spill": {
    sourceRecords: [
      {
        sourceRecordId: "FAC-WO-2026-0914",
        sourceSystemLabel: "Facilities work order",
        recordType: "facilities_work_order",
        locationDescription: "Section 204 aisle edge",
        assignedDepartment: "Facilities",
        statusHistory: [
          {
            at: "2026-06-07T11:50:00.000Z",
            status: "open",
            note: "Slip hazard reported by section usher.",
          },
          {
            at: "2026-06-07T11:50:30.000Z",
            status: "assigned",
            note: "Cleanup crew dispatched with cones.",
          },
        ],
      },
    ],
    commandCenterNotes: [
      {
        noteId: "cc-spill-1",
        at: "2026-06-07T11:50:15.000Z",
        authorLabel: "Command center operator",
        noteType: "decision",
        text: "High priority; isolate aisle until cleanup confirms dry surface.",
      },
    ],
    operationsUpdates: [
      {
        updateId: "ops-upd-spill-1",
        at: "2026-06-07T11:51:00.000Z",
        team: "Facilities",
        responderLabel: "FAC-2",
        eta: "6 min",
        currentStatus: "en route",
        blocker: "slip hazard until dry",
        equipmentNeeded: "cones and absorbent kit",
      },
    ],
    staffFieldReports: [
      {
        reportId: "sfr-spill-1",
        at: "2026-06-07T11:50:00.000Z",
        reporterRole: "Section usher",
        reportChannel: "radio",
        location: "Section 204",
        observedIssue: "Liquid spill near aisle edge",
        crowdImpact: "Guests redirected around wet area",
        immediateNeed: "Cones and cleanup crew",
      },
    ],
    mediaMetadata: [
      {
        mediaId: "media-spill-photo-1",
        mediaType: "staff_photo",
        available: false,
        sourceLabel: "Usher mobile",
        timestamp: "2026-06-07T11:50:05.000Z",
        description: "No staff photo uploaded; radio report only.",
        storageRef: "synthetic://media/unavailable/section-204-spill-1",
      },
    ],
    dispatchHandoff: {
      currentTeam: "Facilities",
      handoffTo: "FAC-2",
      handoffNote: "Isolate aisle edge and confirm path clear after cleanup.",
      dispatchHistory: [
        {
          at: "2026-06-07T11:50:30.000Z",
          action: "dispatched",
          actorLabel: "Operations",
        },
      ],
    },
  },

  "incident-lost-child": {
    sourceRecords: [
      {
        sourceRecordId: "GS-CASE-2026-0338",
        sourceSystemLabel: "Guest Services intake record",
        recordType: "guest_services_case",
        requesterRole: "Guardian",
        locationDescription: "East screening lanes near North Gate entrance",
        contactPreference: "Remain at host stand contact point",
        assignedDepartment: "Security",
        statusHistory: [
          {
            at: "2026-06-07T11:55:00.000Z",
            status: "received",
            note: "Separated child report logged at east screening.",
          },
          {
            at: "2026-06-07T11:55:30.000Z",
            status: "escalated",
            note: "Immediate priority; Security dual-officer dispatch.",
          },
        ],
      },
    ],
    commandCenterNotes: [
      {
        noteId: "cc-lost-child-1",
        at: "2026-06-07T11:55:20.000Z",
        authorLabel: "Command center operator",
        noteType: "escalation",
        text: "Immediate escalation; hold guardian contact point and anchor search to east screening lanes.",
      },
    ],
    operationsUpdates: [
      {
        updateId: "ops-upd-lost-child-1",
        at: "2026-06-07T11:56:00.000Z",
        team: "Security",
        responderLabel: "SEC-7 and SEC-12",
        eta: "3 min",
        currentStatus: "en route",
        blocker: "active entry movement",
      },
    ],
    staffFieldReports: [
      {
        reportId: "sfr-lost-child-1",
        at: "2026-06-07T11:55:00.000Z",
        reporterRole: "East screening host",
        reportChannel: "host_stand",
        location: "East Screening",
        observedIssue: "Child separated from guardian after screening handoff",
        uncertainty: "Child description incomplete; guardian last saw child near lane break",
      },
    ],
    mediaMetadata: [
      {
        mediaId: "media-lost-child-radio-1",
        mediaType: "radio_transcript",
        available: true,
        sourceLabel: "Perimeter supervisor",
        timestamp: "2026-06-07T11:55:25.000Z",
        description: "Supervisor radio on active queue movement near screening lanes.",
        storageRef: "synthetic://radio/lost-child-perimeter-1",
      },
    ],
    dispatchHandoff: {
      currentTeam: "Security",
      handoffNote: "Hold contact point; search adjacent east screening lanes.",
      dispatchHistory: [
        {
          at: "2026-06-07T11:55:30.000Z",
          action: "dispatched",
          actorLabel: "Operations",
        },
      ],
    },
    similarPriorIncidentRef: {
      incidentId: "historical-gate-b-reunification",
      title: "Prior separated child reunification at north entry",
      resolutionNote:
        "Guardian held at contact point; child located within adjacent lane in under 8 minutes.",
    },
  },

  "incident-north-concourse": {
    sourceRecords: [
      {
        sourceRecordId: "CF-ALERT-2026-0201",
        sourceSystemLabel: "Crowd Flow alert",
        recordType: "crowd_flow_alert",
        locationDescription: "North Concourse near Section 300 entry",
        assignedDepartment: "Security / Crowd Flow",
        statusHistory: [
          {
            at: "2026-06-07T11:44:00.000Z",
            status: "active",
            note: "Sensor density rising at merge point.",
          },
          {
            at: "2026-06-07T11:44:45.000Z",
            status: "assigned",
            note: "CF-2 linked from Gate B standby.",
          },
        ],
      },
    ],
    commandCenterNotes: [
      {
        noteId: "cc-north-1",
        at: "2026-06-07T11:44:20.000Z",
        authorLabel: "Command center operator",
        noteType: "decision",
        text: "High priority maintained; relief corridor B on standby.",
      },
    ],
    operationsUpdates: [
      {
        updateId: "ops-upd-north-1",
        at: "2026-06-07T11:45:00.000Z",
        team: "Security / Crowd Flow",
        responderLabel: "CF-2",
        eta: "4 min",
        currentStatus: "en route",
        blocker: "density still rising",
        equipmentNeeded: "none",
      },
    ],
    staffFieldReports: [
      {
        reportId: "sfr-north-1",
        at: "2026-06-07T11:44:30.000Z",
        reporterRole: "North concourse lead",
        reportChannel: "supervisor",
        location: "North Concourse",
        observedIssue: "Movement slowed at Section 300 entry merge",
        crowdImpact: "Guests pausing at corridor split",
        immediateNeed: "Relief path via Service Corridor B",
      },
    ],
    mediaMetadata: [
      {
        mediaId: "media-north-sensor-1",
        mediaType: "radio_transcript",
        available: true,
        sourceLabel: "Crowd flow sensor feed",
        timestamp: "2026-06-07T11:44:30.000Z",
        description: "Sensor-sourced density note linked to gate-flow log.",
        storageRef: "synthetic://sensor/north-concourse-density-1",
      },
    ],
    dispatchHandoff: {
      currentTeam: "Security / Crowd Flow",
      handoffTo: "CF-2",
      handoffNote: "Open relief corridor B and add staff direction.",
      dispatchHistory: [
        {
          at: "2026-06-07T11:44:45.000Z",
          action: "assigned",
          actorLabel: "Operations",
        },
      ],
    },
  },

  "incident-medical-assist": {
    sourceRecords: [
      {
        sourceRecordId: "GS-CASE-2026-0344",
        sourceSystemLabel: "Guest Services intake record",
        recordType: "guest_services_case",
        requesterRole: "Section host",
        locationDescription: "Section 318 host stand",
        contactPreference: "Remain seated with guest",
        assignedDepartment: "Guest Services",
        statusHistory: [
          {
            at: "2026-06-07T11:52:00.000Z",
            status: "received",
            note: "Guest reporting dizziness; host staying with guest.",
          },
          {
            at: "2026-06-07T11:52:30.000Z",
            status: "assigned",
            note: "GS-1 and first-aid medic en route.",
          },
        ],
      },
    ],
    commandCenterNotes: [
      {
        noteId: "cc-medical-1",
        at: "2026-06-07T11:52:15.000Z",
        authorLabel: "Command center operator",
        noteType: "decision",
        text: "Immediate priority; keep guest accompanied and clear section entry for response.",
      },
    ],
    operationsUpdates: [
      {
        updateId: "ops-upd-medical-1",
        at: "2026-06-07T11:53:00.000Z",
        team: "Guest Services",
        responderLabel: "GS-1",
        eta: "3 min",
        currentStatus: "en route",
        blocker: "none",
      },
    ],
    staffFieldReports: [
      {
        reportId: "sfr-medical-1",
        at: "2026-06-07T11:52:00.000Z",
        reporterRole: "Section host",
        reportChannel: "host_stand",
        location: "Section 318",
        observedIssue: "Guest reporting dizziness while seated",
        immediateNeed: "First-aid support and guest accompaniment",
      },
    ],
    mediaMetadata: [
      {
        mediaId: "media-medical-radio-1",
        mediaType: "radio_transcript",
        available: true,
        sourceLabel: "Guest Services channel",
        timestamp: "2026-06-07T11:52:20.000Z",
        description: "Radio request for medic support at Section 318.",
        storageRef: "synthetic://radio/section-318-medic-1",
      },
      {
        mediaId: "media-medical-photo-1",
        mediaType: "staff_photo",
        available: false,
        sourceLabel: "Host stand mobile",
        timestamp: "2026-06-07T11:52:05.000Z",
        description: "No staff photo attached; verbal symptom report only.",
        storageRef: "synthetic://media/unavailable/section-318-photo-1",
      },
    ],
    dispatchHandoff: {
      currentTeam: "Guest Services",
      handoffTo: "GS-1",
      handoffNote: "Confirm guest condition and coordinate medic handoff.",
      dispatchHistory: [
        {
          at: "2026-06-07T11:52:30.000Z",
          action: "dispatched",
          actorLabel: "Operations",
        },
      ],
    },
  },
};

export function mergeOperationalEnrichment(
  seed: Record<string, IncidentDetails>,
): Record<string, IncidentDetails> {
  return Object.fromEntries(
    Object.entries(seed).map(([incidentId, details]) => [
      incidentId,
      {
        ...details,
        ...INCIDENT_OPERATIONAL_ENRICHMENT[incidentId],
      },
    ]),
  ) as Record<string, IncidentDetails>;
}
