import type { IncidentDetails } from "@/lib/types";

/**
 * Rich, incident-specific operational content keyed by incident id.
 *
 * Single source of truth for the deep "operations memory" used by both paths:
 * - The Elastic bootstrap merges this into each active-incident document before
 *   indexing, so the live pull returns it in `_source`.
 * - The demo/local fallback attaches it directly in `localStorageIncidentToPackage`.
 *
 * Every field is optional on `IncidentDetails`; when an id is missing here the
 * UI falls back to the existing generic synthesis. Keep copy operator-facing —
 * no forbidden wording (Critical/Low/severity/confidence/score/Venue map/Seat map)
 * and priority labels stay Immediate/High/Moderate/Monitor.
 */
export const INCIDENT_DETAILS_SEED: Record<string, IncidentDetails> = {
  "incident-lost-child": {
    operatorSummary:
      "Security needs to hold the screening-side lane, confirm the guardian contact point, and keep the child within the controlled perimeter until handoff is confirmed.",
    operationalImplication:
      "Time-sensitive: movement around the entry lanes can separate the guest from the original report location quickly.",
    responseChecklist: [
      "Dispatch Security",
      "Hold guardian contact point",
      "Confirm reunification or escalation",
    ],
    evidenceItems: [
      {
        sourceId: "ev-lost-child-1",
        sourceType: "historical_incident",
        sourceLabel: "East screening host stand",
        title: "Guardian reported child missing after screening handoff",
        observedSignal: "Guardian reported child missing after screening handoff.",
        excerpt: "Guardian reported child missing after screening handoff.",
        rationale:
          "Host logged the report from the east screening entrance and kept the guardian at the original contact point.",
        operationalMeaning:
          "The original report location is known, so Security can keep the search anchored.",
        actionImplication:
          "Dispatch Security to the east screening lanes and hold the guardian contact point.",
      },
      {
        sourceId: "ev-lost-child-2",
        sourceType: "radio_log",
        sourceLabel: "Perimeter supervisor",
        title: "Crowd flow remains active around the screening queue",
        observedSignal: "Crowd flow remains active around the screening queue.",
        excerpt: "Crowd flow remains active around the screening queue.",
        rationale:
          "Supervisor noted steady entry movement through the east lanes while the report was being logged.",
        operationalMeaning:
          "Search needs to start immediately before the location context gets diluted.",
        actionImplication:
          "Assign one officer to the guardian and another to the nearby lane break.",
      },
      {
        sourceId: "ev-lost-child-3",
        sourceType: "policy",
        sourceLabel: "Lost child response standard",
        title: "Separated child reports require controlled handoff",
        observedSignal:
          "Separated child reports require controlled handoff and event log update.",
        excerpt:
          "Separated child reports require controlled handoff and event log update.",
        rationale:
          "Procedure requires keeping the reporting guardian in place until Security confirms reunification or escalation.",
        operationalMeaning:
          "The response must be tracked as a managed incident, not a casual staff note.",
        actionImplication:
          "Open incident log, dispatch Security, and record the handoff outcome.",
      },
    ],
    incidentLog: [
      {
        eventId: "log-lost-child-1",
        eventTime: "11:55 AM",
        eventType: "source_received",
        title: "Source received",
        detail: "Guest report logged at east screening host stand.",
        actorLabel: "East screening host",
      },
      {
        eventId: "log-lost-child-2",
        eventTime: "11:55 AM",
        eventType: "incident_created",
        title: "Incident created",
        detail: "Security incident opened for separated child report.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-lost-child-3",
        eventTime: "11:56 AM",
        eventType: "priority_assigned",
        title: "Priority assigned",
        detail: "Immediate priority set due to active entry movement.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-lost-child-4",
        eventTime: "11:56 AM",
        eventType: "team_assigned",
        title: "Team assigned",
        detail: "Security assigned to screening-side response.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-lost-child-5",
        eventTime: "11:57 AM",
        eventType: "evidence_opened",
        title: "Evidence opened",
        detail: "Sentinel surfaced guest report, staff note, and response standard.",
        actorLabel: "Sentinel",
      },
    ],
    sourceLog: [
      {
        sourceEventId: "src-lost-child-1",
        sourceType: "elastic_pull",
        sourceLabel: "Operations data",
        title: "Live operations data pulled",
        detail: "Guest report linked to the active incident.",
        memoryAction: "Source log updated",
      },
      {
        sourceEventId: "src-lost-child-2",
        sourceType: "elastic_writeback",
        sourceLabel: "Operational memory",
        title: "Security dispatch decision recorded",
        detail: "Dispatch decision written back after operator approval.",
        memoryAction: "Operational memory updated",
      },
    ],
    operationsTimeline: [
      {
        eventId: "ops-lost-child-1",
        eventTime: "11:55 AM",
        title: "Report received",
        detail: "Guardian reported a separated child at east screening.",
      },
      {
        eventId: "ops-lost-child-2",
        eventTime: "11:56 AM",
        title: "Security assigned",
        detail: "Officers routed to the guardian contact point and lane break.",
      },
    ],
    reportDraftSeed: {
      headline: "Lost child report near east screening",
      situation:
        "A guardian reported a separated child at the east screening lanes during active entry flow.",
      actionsTaken:
        "Security was assigned to hold the contact point and check the adjacent screening lanes.",
      currentStatus: "Security response is in progress pending reunification or escalation.",
      nextSteps: "Confirm handoff outcome and update the incident log.",
    },
    staffUpdateSeed:
      "Security to east screening: child separated from guardian. Hold the guardian contact point and check adjacent lanes; confirm reunification before standing down.",
  },

  "incident-section-112": {
    operatorSummary:
      "Guest Services should confirm the guest location, route through the accessible concourse path, and record handoff once seating support is complete.",
    operationalImplication:
      "The guest is already near seating, so the response should focus on safe escort and fast handoff rather than broad crowd intervention.",
    responseChecklist: [
      "Acknowledge and assess",
      "Dispatch Guest Services",
      "Escort and resolve",
    ],
    evidenceItems: [
      {
        sourceId: "ev-section-112-1",
        sourceType: "historical_incident",
        sourceLabel: "Section 112 host",
        title: "Wheelchair assist request received near Section 112",
        observedSignal: "Wheelchair assist request received near Section 112.",
        excerpt: "Wheelchair assist request received near Section 112.",
        rationale: "Host confirmed the guest is waiting with event staff near the section entry.",
        operationalMeaning: "Location is specific and response can be routed directly.",
        actionImplication: "Dispatch Guest Services to Section 112.",
      },
      {
        sourceId: "ev-section-112-2",
        sourceType: "radio_log",
        sourceLabel: "Stands supervisor",
        title: "Accessible route is open through the concourse approach",
        observedSignal: "Accessible route is open through the concourse approach.",
        excerpt: "Accessible route is open through the concourse approach.",
        rationale: "Staff noted the route remains usable and does not require Facilities support.",
        operationalMeaning:
          "Guest Services can complete the escort without rerouting through another gate.",
        actionImplication: "Route Guest Services through the accessible approach.",
      },
      {
        sourceId: "ev-section-112-3",
        sourceType: "policy",
        sourceLabel: "Guest mobility assistance standard",
        title: "Mobility assistance requires direct acknowledgement",
        observedSignal:
          "Mobility assistance requests require direct acknowledgement and recorded support.",
        excerpt:
          "Mobility assistance requests require direct acknowledgement and recorded support.",
        rationale: "Procedure requires confirming guest location, escort path, and completion status.",
        operationalMeaning: "The response needs a tracked handoff.",
        actionImplication: "Log acknowledgement, dispatch support, and confirm resolution.",
      },
    ],
    incidentLog: [
      {
        eventId: "log-section-112-1",
        eventTime: "11:42 AM",
        eventType: "source_received",
        title: "Source received",
        detail: "Section 112 host reported mobility assist request.",
        actorLabel: "Section 112 host",
      },
      {
        eventId: "log-section-112-2",
        eventTime: "11:42 AM",
        eventType: "incident_created",
        title: "Incident created",
        detail: "Guest Services incident opened for Section 112.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-section-112-3",
        eventTime: "11:43 AM",
        eventType: "priority_assigned",
        title: "Priority assigned",
        detail: "Immediate priority set due to guest support need.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-section-112-4",
        eventTime: "11:43 AM",
        eventType: "team_assigned",
        title: "Team assigned",
        detail: "Guest Services assigned as primary team.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-section-112-5",
        eventTime: "11:44 AM",
        eventType: "evidence_opened",
        title: "Evidence opened",
        detail: "Sentinel surfaced guest report and mobility standard.",
        actorLabel: "Sentinel",
      },
    ],
    sourceLog: [
      {
        sourceEventId: "src-section-112-1",
        sourceType: "elastic_pull",
        sourceLabel: "Operations data",
        title: "Live operations data pulled",
        detail: "Section 112 guest report linked to the active incident.",
        memoryAction: "Source log updated",
      },
      {
        sourceEventId: "src-section-112-2",
        sourceType: "elastic_writeback",
        sourceLabel: "Operational memory",
        title: "Guest Services assignment recorded",
        detail: "Write-back succeeded after operator approval.",
        memoryAction: "Operational memory updated",
      },
    ],
    operationsTimeline: [
      {
        eventId: "ops-section-112-1",
        eventTime: "11:42 AM",
        title: "Request received",
        detail: "Mobility assist request logged near Section 112.",
      },
      {
        eventId: "ops-section-112-2",
        eventTime: "11:43 AM",
        title: "Guest Services assigned",
        detail: "Team routed through the accessible concourse approach.",
      },
    ],
    reportDraftSeed: {
      headline: "Section 112 guest mobility assist",
      situation:
        "A guest near Section 112 requested wheelchair-accessible support to reach seating.",
      actionsTaken:
        "Guest Services was assigned to confirm location, use the accessible approach, and escort the guest.",
      currentStatus: "Support is pending team arrival or handoff confirmation.",
      nextSteps: "Confirm seating handoff and update the incident log.",
    },
    staffUpdateSeed:
      "Guest Services to Section 112: wheelchair assist requested. Use the accessible concourse approach, escort to seating, and confirm handoff.",
  },

  "incident-medical-assist": {
    operatorSummary:
      "Guest Services should keep the guest location stable, notify medical support if configured, and avoid moving the guest until trained staff confirms the next step.",
    operationalImplication:
      "Sits in the same general stands area as Section 112 assist, so workspace context must stay selected-incident specific and not mix reports.",
    responseChecklist: [
      "Confirm guest location",
      "Dispatch assigned team",
      "Record care handoff",
    ],
    evidenceItems: [
      {
        sourceId: "ev-medical-1",
        sourceType: "historical_incident",
        sourceLabel: "Stands usher",
        title: "Guest requested assistance and remained seated near Section 318",
        observedSignal: "Guest requested assistance and remained seated near the section.",
        excerpt: "Guest requested assistance and remained seated near the section.",
        rationale: "Staff stayed with the guest and kept the section entry clear for response access.",
        operationalMeaning: "The location is contained but needs direct staff follow-up.",
        actionImplication: "Assign Guest Services and prepare medical handoff if needed.",
      },
      {
        sourceId: "ev-medical-2",
        sourceType: "radio_log",
        sourceLabel: "Guest Services channel",
        title: "Stands staff requested support near the section entry",
        observedSignal: "Stands staff requested support near the section entry.",
        excerpt: "Stands staff requested support near the section entry.",
        rationale: "Radio note indicates the guest is waiting with staff and not moving through the aisle.",
        operationalMeaning: "Response can be routed to the section without crowd-flow intervention.",
        actionImplication: "Dispatch the assigned team and log response status.",
      },
      {
        sourceId: "ev-medical-3",
        sourceType: "policy",
        sourceLabel: "Guest care response standard",
        title: "Guest care reports require location confirmation and staff handoff",
        observedSignal: "Guest care reports require location confirmation and staff handoff.",
        excerpt: "Guest care reports require location confirmation and staff handoff.",
        rationale: "Procedure emphasizes keeping the guest accompanied and documenting the response.",
        operationalMeaning: "The team needs a clean handoff trail.",
        actionImplication: "Open incident log, dispatch assigned team, and confirm outcome.",
      },
    ],
    incidentLog: [
      {
        eventId: "log-medical-1",
        eventTime: "11:52 AM",
        eventType: "source_received",
        title: "Source received",
        detail: "Stands usher reported guest care request.",
        actorLabel: "Stands usher",
      },
      {
        eventId: "log-medical-2",
        eventTime: "11:52 AM",
        eventType: "incident_created",
        title: "Incident created",
        detail: "Guest medical assist opened near Section 318.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-medical-3",
        eventTime: "11:53 AM",
        eventType: "team_assigned",
        title: "Team assigned",
        detail: "Guest Services assigned for first response.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-medical-4",
        eventTime: "11:53 AM",
        eventType: "evidence_opened",
        title: "Evidence opened",
        detail: "Sentinel surfaced staff report and guest care standard.",
        actorLabel: "Sentinel",
      },
    ],
    sourceLog: [
      {
        sourceEventId: "src-medical-1",
        sourceType: "elastic_pull",
        sourceLabel: "Operations data",
        title: "Live operations data pulled",
        detail: "Staff report linked to the selected incident.",
        memoryAction: "Source log updated",
      },
      {
        sourceEventId: "src-medical-2",
        sourceType: "elastic_link",
        sourceLabel: "Operations data",
        title: "Guest Services radio note attached",
        detail: "Radio note linked to the selected incident.",
        memoryAction: "Source log updated",
      },
      {
        sourceEventId: "src-medical-3",
        sourceType: "elastic_writeback",
        sourceLabel: "Operational memory",
        title: "Care response recorded",
        detail: "Operational memory updated after dispatch approval.",
        memoryAction: "Operational memory updated",
      },
    ],
    operationsTimeline: [
      {
        eventId: "ops-medical-1",
        eventTime: "11:52 AM",
        title: "Request received",
        detail: "Guest care request logged near Section 318.",
      },
      {
        eventId: "ops-medical-2",
        eventTime: "11:53 AM",
        title: "Team assigned",
        detail: "Guest Services routed to the section entry.",
      },
    ],
    reportDraftSeed: {
      headline: "Guest medical assist near Section 318",
      situation: "Staff reported a guest in the stands needing assistance near Section 318.",
      actionsTaken:
        "The assigned team was dispatched to confirm the guest condition and coordinate handoff.",
      currentStatus: "Response is in progress.",
      nextSteps: "Confirm outcome and add the final care handoff note.",
    },
    staffUpdateSeed:
      "Guest Services to Section 318: guest needs care support and is seated with staff. Confirm condition, keep the guest accompanied, and coordinate handoff.",
  },

  "incident-aisle-spill": {
    operatorSummary:
      "The assigned team should isolate the aisle edge, request cleanup, and confirm the path is clear before normal movement resumes.",
    operationalImplication:
      "Can create guest movement disruption if not addressed before section traffic increases.",
    responseChecklist: [
      "Isolate affected aisle",
      "Dispatch cleanup support",
      "Confirm path clear",
    ],
    evidenceItems: [
      {
        sourceId: "ev-spill-1",
        sourceType: "radio_log",
        sourceLabel: "Section usher",
        title: "Spill reported near aisle edge",
        observedSignal: "Spill reported near aisle edge.",
        excerpt: "Spill reported near aisle edge.",
        rationale: "Usher identified the affected aisle and kept guests away from the wet area.",
        operationalMeaning: "The hazard is contained but needs cleanup confirmation.",
        actionImplication: "Dispatch cleanup support and log completion.",
      },
      {
        sourceId: "ev-spill-2",
        sourceType: "radio_log",
        sourceLabel: "Guest Services channel",
        title: "Aisle movement slowed while staff redirected guests",
        observedSignal: "Aisle movement slowed while staff redirected guests around the spill.",
        excerpt: "Aisle movement slowed while staff redirected guests around the spill.",
        rationale: "Staff requested cleanup support and temporary aisle guidance.",
        operationalMeaning: "The incident affects movement but does not require stadium-wide response.",
        actionImplication: "Assign team and track pending cleanup.",
      },
    ],
    incidentLog: [
      {
        eventId: "log-spill-1",
        eventTime: "11:50 AM",
        eventType: "source_received",
        title: "Source received",
        detail: "Usher reported spill near aisle.",
        actorLabel: "Section usher",
      },
      {
        eventId: "log-spill-2",
        eventTime: "11:50 AM",
        eventType: "incident_created",
        title: "Incident created",
        detail: "Aisle hazard incident opened.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-spill-3",
        eventTime: "11:51 AM",
        eventType: "team_assigned",
        title: "Team assigned",
        detail: "Facilities assigned for cleanup coordination.",
        actorLabel: "Operations",
      },
    ],
    sourceLog: [
      {
        sourceEventId: "src-spill-1",
        sourceType: "elastic_pull",
        sourceLabel: "Operations data",
        title: "Live operations data pulled",
        detail: "Staff note linked to the active incident.",
        memoryAction: "Source log updated",
      },
      {
        sourceEventId: "src-spill-2",
        sourceType: "elastic_writeback",
        sourceLabel: "Operational memory",
        title: "Cleanup dispatch recorded",
        detail: "Cleanup decision written back; path-clear status pending update.",
        memoryAction: "Operational memory updated",
      },
    ],
    operationsTimeline: [
      {
        eventId: "ops-spill-1",
        eventTime: "11:50 AM",
        title: "Spill reported",
        detail: "Usher flagged a slip hazard near the Section 204 aisle.",
      },
      {
        eventId: "ops-spill-2",
        eventTime: "11:51 AM",
        title: "Cleanup dispatched",
        detail: "Facilities routed to isolate the aisle and coordinate cleanup.",
      },
    ],
    reportDraftSeed: {
      headline: "Spill near aisle",
      situation: "Staff reported a spill affecting an aisle movement path.",
      actionsTaken: "The assigned team was dispatched to isolate the area and coordinate cleanup.",
      currentStatus: "Cleanup response pending or in progress.",
      nextSteps: "Confirm the aisle is clear and update the incident log.",
    },
    staffUpdateSeed:
      "Facilities to Section 204 aisle: slip hazard reported. Isolate the aisle edge, coordinate cleanup, and confirm the path is clear before movement resumes.",
  },

  "incident-elevator-4": {
    operatorSummary:
      "Facilities should verify the outage, post route guidance, and coordinate alternate accessible movement paths.",
    operationalImplication:
      "Affects access routing and can compound guest support needs if not communicated quickly.",
    responseChecklist: ["Verify outage", "Post alternate route", "Dispatch Facilities"],
    evidenceItems: [
      {
        sourceId: "ev-elevator-1",
        sourceType: "runbook",
        sourceLabel: "Elevator 4 status panel",
        title: "Elevator 4 reported unavailable",
        observedSignal: "Elevator 4 reported unavailable.",
        excerpt: "Elevator 4 reported unavailable.",
        rationale: "Status alert indicates elevator service is interrupted and requires Facilities review.",
        operationalMeaning: "Accessibility and staff movement routing may be affected.",
        actionImplication: "Dispatch Facilities and update route guidance.",
      },
      {
        sourceId: "ev-elevator-2",
        sourceType: "radio_log",
        sourceLabel: "Concourse supervisor",
        title: "Guests redirected from Elevator 4 to alternate access",
        observedSignal: "Guests were redirected from Elevator 4 to alternate vertical access.",
        excerpt: "Guests were redirected from Elevator 4 to alternate vertical access.",
        rationale: "Supervisor noted the alternate route remains usable but requires clear staff direction.",
        operationalMeaning: "The response needs both repair review and guest routing support.",
        actionImplication: "Assign Facilities and record alternate route instruction.",
      },
      {
        sourceId: "ev-elevator-3",
        sourceType: "policy",
        sourceLabel: "Vertical access outage standard",
        title: "Elevator outages require repair check and guest routing note",
        observedSignal: "Elevator outages require repair check and guest routing note.",
        excerpt: "Elevator outages require repair check and guest routing note.",
        rationale: "Procedure requires confirming outage state, posting alternate route, and updating event operations.",
        operationalMeaning: "This is both a Facilities and access-communication incident.",
        actionImplication: "Dispatch Facilities and update source log after route guidance is confirmed.",
      },
    ],
    incidentLog: [
      {
        eventId: "log-elevator-1",
        eventTime: "11:41 AM",
        eventType: "source_received",
        title: "Source received",
        detail: "Elevator 4 status alert received.",
        actorLabel: "Status panel",
      },
      {
        eventId: "log-elevator-2",
        eventTime: "11:41 AM",
        eventType: "incident_created",
        title: "Incident created",
        detail: "Facilities incident opened for Elevator 4.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-elevator-3",
        eventTime: "11:42 AM",
        eventType: "team_assigned",
        title: "Team assigned",
        detail: "Facilities assigned.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-elevator-4",
        eventTime: "11:42 AM",
        eventType: "evidence_opened",
        title: "Evidence opened",
        detail: "Sentinel surfaced facility alert and routing note.",
        actorLabel: "Sentinel",
      },
    ],
    sourceLog: [
      {
        sourceEventId: "src-elevator-1",
        sourceType: "elastic_pull",
        sourceLabel: "Operations data",
        title: "Live operations data pulled",
        detail: "Facility alert linked to the active incident.",
        memoryAction: "Source log updated",
      },
      {
        sourceEventId: "src-elevator-2",
        sourceType: "elastic_writeback",
        sourceLabel: "Operational memory",
        title: "Facilities assignment recorded",
        detail: "Outage response recorded; alternate route status pending confirmation.",
        memoryAction: "Operational memory updated",
      },
    ],
    operationsTimeline: [
      {
        eventId: "ops-elevator-1",
        eventTime: "11:41 AM",
        title: "Outage reported",
        detail: "Elevator 4 flagged as unavailable in the East Stand.",
      },
      {
        eventId: "ops-elevator-2",
        eventTime: "11:42 AM",
        title: "Facilities assigned",
        detail: "Team routed to verify outage and post alternate routing.",
      },
    ],
    reportDraftSeed: {
      headline: "Elevator 4 outage",
      situation: "Elevator 4 is unavailable and may affect vertical movement.",
      actionsTaken: "Facilities was assigned to verify the outage and support alternate routing.",
      currentStatus: "Facilities response pending or in progress.",
      nextSteps: "Confirm service state and record alternate route guidance.",
    },
    staffUpdateSeed:
      "Facilities to Elevator 4: out of service in the East Stand. Verify the outage, post the alternate accessible route, and direct guests to the nearest working elevator.",
  },

  "incident-north-concourse": {
    operatorSummary:
      "Operations should open a relief path, coordinate staff direction, and monitor queue movement until the corridor clears.",
    operationalImplication:
      "Crowding can slow response movement and create pressure on nearby concession or entry paths.",
    responseChecklist: [
      "Open relief path",
      "Add staff direction",
      "Monitor corridor movement",
    ],
    evidenceItems: [
      {
        sourceId: "ev-north-1",
        sourceType: "radio_log",
        sourceLabel: "North concourse lead",
        title: "Movement slowed near the concourse merge point",
        observedSignal: "Movement slowed near the concourse merge point.",
        excerpt: "Movement slowed near the concourse merge point.",
        rationale: "Staff noted guests pausing near the corridor split and requested direction support.",
        operationalMeaning: "The crowd issue is localized but can spread if not managed.",
        actionImplication: "Assign Operations to open a relief path.",
      },
      {
        sourceId: "ev-north-2",
        sourceType: "radio_log",
        sourceLabel: "Crowd flow channel",
        title: "Staff requested additional direction near the north concourse",
        observedSignal: "Staff requested additional direction near the north concourse.",
        excerpt: "Staff requested additional direction near the north concourse.",
        rationale: "Radio traffic indicates the corridor is still moving but needs active guidance.",
        operationalMeaning: "This needs staff direction, not a full emergency response.",
        actionImplication: "Dispatch crowd-flow support and monitor the corridor.",
      },
    ],
    incidentLog: [
      {
        eventId: "log-north-1",
        eventTime: "11:44 AM",
        eventType: "source_received",
        title: "Source received",
        detail: "North concourse lead reported movement pressure.",
        actorLabel: "North concourse lead",
      },
      {
        eventId: "log-north-2",
        eventTime: "11:44 AM",
        eventType: "incident_created",
        title: "Incident created",
        detail: "Crowd-flow incident opened.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-north-3",
        eventTime: "11:45 AM",
        eventType: "team_assigned",
        title: "Team assigned",
        detail: "Operations assigned for corridor guidance.",
        actorLabel: "Operations",
      },
    ],
    sourceLog: [
      {
        sourceEventId: "src-north-1",
        sourceType: "elastic_pull",
        sourceLabel: "Operations data",
        title: "Live operations data pulled",
        detail: "Staff note linked to the selected incident.",
        memoryAction: "Source log updated",
      },
      {
        sourceEventId: "src-north-2",
        sourceType: "elastic_writeback",
        sourceLabel: "Operational memory",
        title: "Crowd-flow response recorded",
        detail: "Operational memory updated after dispatch approval.",
        memoryAction: "Operational memory updated",
      },
    ],
    operationsTimeline: [
      {
        eventId: "ops-north-1",
        eventTime: "11:44 AM",
        title: "Crowding flagged",
        detail: "Movement slowed near the North Concourse merge point.",
      },
      {
        eventId: "ops-north-2",
        eventTime: "11:45 AM",
        title: "Operations assigned",
        detail: "Team routed to open a relief path and direct movement.",
      },
    ],
    reportDraftSeed: {
      headline: "North concourse crowding",
      situation: "Movement slowed near the north concourse merge point.",
      actionsTaken: "Operations was assigned to open a relief path and direct guest movement.",
      currentStatus: "Response in progress.",
      nextSteps: "Monitor corridor movement and update once flow normalizes.",
    },
    staffUpdateSeed:
      "Operations to North Concourse: movement backing up at the merge point. Open the relief path via Service Corridor B, add staff direction, and monitor until the corridor clears.",
  },

  "incident-gate-b": {
    operatorSummary:
      "Security should open overflow routing, direct the queue away from the gate face, and monitor entry movement.",
    operationalImplication:
      "Localized but visible, and it can affect guest arrival experience if not addressed quickly.",
    responseChecklist: ["Dispatch Security", "Open overflow route", "Monitor queue"],
    evidenceItems: [
      {
        sourceId: "ev-gate-b-1",
        sourceType: "radio_log",
        sourceLabel: "Gate B entry lead",
        title: "Queue is backed up at Gate B",
        observedSignal: "Queue is backed up at Gate B.",
        excerpt: "Queue is backed up at Gate B.",
        rationale: "Entry lead reported the line pushing toward the main gate face and requested support.",
        operationalMeaning: "The queue needs active direction before it blocks nearby circulation.",
        actionImplication: "Dispatch Security and open overflow routing.",
      },
      {
        sourceId: "ev-gate-b-2",
        sourceType: "radio_log",
        sourceLabel: "Perimeter staff",
        title: "Guests are clustering near the Gate B approach",
        observedSignal: "Guests are clustering near the Gate B approach.",
        excerpt: "Guests are clustering near the Gate B approach.",
        rationale: "Staff observed slowing at the approach and requested lane guidance.",
        operationalMeaning: "The response should focus on crowd direction, not incident escalation.",
        actionImplication: "Add staff direction and monitor queue movement.",
      },
      {
        sourceId: "ev-gate-b-3",
        sourceType: "policy",
        sourceLabel: "Gate queue response standard",
        title: "Entry backups require overflow routing and queue monitoring",
        observedSignal: "Entry backups require overflow routing and queue monitoring.",
        excerpt: "Entry backups require overflow routing and queue monitoring.",
        rationale: "Procedure calls for opening an overflow path, assigning staff direction, and updating queue state.",
        operationalMeaning: "Gate B needs a managed crowd-flow response.",
        actionImplication: "Dispatch Security and write back queue-state update after approval.",
      },
    ],
    incidentLog: [
      {
        eventId: "log-gate-b-1",
        eventTime: "11:38 AM",
        eventType: "source_received",
        title: "Source received",
        detail: "Gate B entry lead reported backup.",
        actorLabel: "Gate B entry lead",
      },
      {
        eventId: "log-gate-b-2",
        eventTime: "11:38 AM",
        eventType: "incident_created",
        title: "Incident created",
        detail: "Gate B crowd-flow incident opened.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-gate-b-3",
        eventTime: "11:41 AM",
        eventType: "team_assigned",
        title: "Team assigned",
        detail: "Security assigned for entry support.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-gate-b-4",
        eventTime: "11:41 AM",
        eventType: "evidence_opened",
        title: "Evidence opened",
        detail: "Sentinel surfaced radio log and queue response standard.",
        actorLabel: "Sentinel",
      },
    ],
    sourceLog: [
      {
        sourceEventId: "src-gate-b-1",
        sourceType: "elastic_pull",
        sourceLabel: "Operations data",
        title: "Live operations data pulled",
        detail: "Radio log linked to the active incident.",
        memoryAction: "Source log updated",
      },
      {
        sourceEventId: "src-gate-b-2",
        sourceType: "elastic_writeback",
        sourceLabel: "Operational memory",
        title: "Security dispatch recorded",
        detail: "Gate B queue response written back after approval.",
        memoryAction: "Operational memory updated",
      },
    ],
    operationsTimeline: [
      {
        eventId: "ops-gate-b-1",
        eventTime: "11:38 AM",
        title: "Backup reported",
        detail: "Entry flow at Gate B backed up near the main gate approach.",
      },
      {
        eventId: "ops-gate-b-2",
        eventTime: "11:41 AM",
        title: "Security assigned",
        detail: "Team routed to open overflow routing and direct the queue.",
      },
    ],
    reportDraftSeed: {
      headline: "Gate B backed up",
      situation: "Entry flow at Gate B backed up near the main gate approach.",
      actionsTaken: "Security was assigned to open overflow routing and direct the queue.",
      currentStatus: "Entry support is in progress.",
      nextSteps: "Monitor queue movement and update once the backup clears.",
    },
    staffUpdateSeed:
      "Security to Gate B: entry queue backed up toward the gate face. Open overflow routing, direct the queue off the approach, and monitor entry movement.",
  },

  "incident-restroom-outage": {
    operatorSummary:
      "Operations should post direction to the nearest available restroom bank and Facilities should verify service state.",
    operationalImplication:
      "Not an immediate safety response, but unresolved service disruption can increase staff questions and crowding around nearby concourse areas.",
    responseChecklist: [
      "Verify service state",
      "Post alternate direction",
      "Update guest-facing staff",
    ],
    evidenceItems: [
      {
        sourceId: "ev-restroom-1",
        sourceType: "radio_log",
        sourceLabel: "Concourse attendant",
        title: "Restroom bank reported unavailable",
        observedSignal: "Restroom bank reported unavailable.",
        excerpt: "Restroom bank reported unavailable.",
        rationale: "Attendant noted guests asking for alternate restroom direction.",
        operationalMeaning: "The issue needs guest communication and Facilities follow-up.",
        actionImplication: "Assign Facilities and post alternate direction.",
      },
      {
        sourceId: "ev-restroom-2",
        sourceType: "runbook",
        sourceLabel: "Restroom service check",
        title: "Service interruption requires verification",
        observedSignal: "Service interruption requires verification.",
        excerpt: "Service interruption requires verification.",
        rationale: "Facilities needs to confirm whether the closure is temporary or requires maintenance.",
        operationalMeaning: "The incident should stay visible until the service state is confirmed.",
        actionImplication: "Dispatch the assigned team and record the alternate direction note.",
      },
    ],
    incidentLog: [
      {
        eventId: "log-restroom-1",
        eventTime: "11:45 AM",
        eventType: "source_received",
        title: "Source received",
        detail: "Concourse attendant reported restroom service issue.",
        actorLabel: "Concourse attendant",
      },
      {
        eventId: "log-restroom-2",
        eventTime: "11:45 AM",
        eventType: "incident_created",
        title: "Incident created",
        detail: "Operations incident opened.",
        actorLabel: "Operations",
      },
      {
        eventId: "log-restroom-3",
        eventTime: "11:46 AM",
        eventType: "team_assigned",
        title: "Team assigned",
        detail: "Facilities assigned.",
        actorLabel: "Operations",
      },
    ],
    sourceLog: [
      {
        sourceEventId: "src-restroom-1",
        sourceType: "elastic_pull",
        sourceLabel: "Operations data",
        title: "Live operations data pulled",
        detail: "Staff note linked to the selected incident.",
        memoryAction: "Source log updated",
      },
      {
        sourceEventId: "src-restroom-2",
        sourceType: "elastic_writeback",
        sourceLabel: "Operational memory",
        title: "Service response recorded",
        detail: "Alternate direction note pending write-back.",
        memoryAction: "Operational memory updated",
      },
    ],
    operationsTimeline: [
      {
        eventId: "ops-restroom-1",
        eventTime: "11:45 AM",
        title: "Service issue reported",
        detail: "West Concourse restroom bank flagged as out of service.",
      },
      {
        eventId: "ops-restroom-2",
        eventTime: "11:46 AM",
        title: "Facilities assigned",
        detail: "Team routed to verify service state and post alternate direction.",
      },
    ],
    reportDraftSeed: {
      headline: "Restroom out of order",
      situation: "A restroom bank was reported unavailable and guests need alternate direction.",
      actionsTaken: "The assigned team was routed to verify service state and post alternate direction.",
      currentStatus: "Verification pending or in progress.",
      nextSteps: "Confirm service state and update staff direction.",
    },
    staffUpdateSeed:
      "Facilities to West Concourse: restroom bank out of service. Verify the service state, post direction to the nearest available restroom, and update guest-facing staff.",
  },
};

export function getIncidentDetails(incidentId: string): IncidentDetails | undefined {
  return INCIDENT_DETAILS_SEED[incidentId];
}
