# Stadium Sentinel Build Plan

## Product Summary

Stadium Sentinel is a soccer stadium operations command tool for venue staff. It converts messy event reports into prioritized incident cards, map markers, evidence-backed action plans, staff updates, timeline entries, and post-event reports. It is not a chatbot. The product must answer three questions on every screen: what is happening, why the agent thinks that, and what staff should do next.

## Current Baseline UI Scope

The current baseline UI is a Next.js, TypeScript, and Tailwind command-center dashboard for a soccer stadium operations floor. It must support the core demo scenario:

> "Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access."

Baseline flow:

1. Parse one messy input report.
2. Split it into three incidents.
3. Create incident cards with category and priority.
4. Place markers on a static venue map.
5. Show evidence grounded in seeded policy, runbook, and historical incident data.
6. Show recommended action plans.
7. Draft a staff update.
8. Add approved actions to a timeline.
9. Render a post-event report view/export payload.

## Two-Shot Build Rule

Stadium Sentinel will be built in exactly two execution passes after the baseline UI.

### Shot 1: MVP Integration

Goal:
Make the app a real hackathon-eligible agent, not just a mock dashboard.

Required:
- Keep the current scoreless priority-based dashboard.
- Integrate Elastic as the operational memory layer.
- Index seeded venue policies, runbooks, historical incidents, locations, and staff response rules.
- Expose Elastic retrieval through MCP or the approved Elastic Agent Builder path.
- Connect Gemini / Google Cloud Agent Builder to the Elastic MCP tools.
- Replace mock evidence with Elastic-backed retrieved evidence.
- Keep categorical priority labels only: Immediate, High, Moderate, Monitor.
- Preserve the existing demo flow:
  - messy report input
  - 3 incidents
  - 3 map markers
  - evidence panel
  - recommended actions
  - staff update
  - approval timeline
  - post-event report

Do not:
- reintroduce scores
- reintroduce confidence percentages
- redesign the UI
- add real emergency dispatch
- add auth beyond simple demo needs
- add external real-time integrations

Validation:
- lint
- unit tests
- build
- e2e
- live browser demo check

### Shot 2: Final Submission Pass

Goal:
Make the project judge-ready and submit-ready.

Required:
- Verify the hosted app works.
- Verify the public GitHub repo works.
- Add or confirm open-source license.
- Confirm README explains:
  - problem
  - agent workflow
  - Gemini / Google Cloud Agent Builder role
  - Elastic MCP role
  - demo flow
  - setup
  - limitations
- Record or prepare the 3-minute demo video.
- Confirm Devpost submission fields:
  - hosted project URL
  - public repo URL
  - demo video
  - selected Elastic track
  - completed description
- Run final validation:
  - lint
  - tests
  - build
  - e2e

No third product version.
No extra polish loop unless Shot 2 reveals a blocking submission issue.

## Non-Goals

- No real dispatch, surveillance, ticketing, or messaging integrations.
- No full seat-map package, seat-level selection, or seating-chart editing.
- No ticketing product direction or ticket purchase workflow.
- No mobile app.
- No chatbot-style conversational UI.
- No marketing landing page.

## App Architecture

### Baseline architecture

- Frontend: Next.js App Router, TypeScript, Tailwind.
- Server surface: Next.js route handlers for local mock orchestration.
- Data source: local JSON seed files only.
- State model: client-side dashboard state seeded from JSON and report parsing output.
- Map layer: custom inline SVG soccer-stadium operational schematic with positioned markers.

### Logical modules

1. `report-ingestion`
   - Accept typed report text.
   - Split compound report into incident objects.
   - Tag location, category, priority, and status.
2. `incident-orchestration`
   - Match incidents to seeded evidence.
   - Build recommended action plans.
   - Draft staff update text.
3. `ops-visualization`
   - Render command-center dashboard, soccer-stadium map, incident queue, evidence, timeline, and report.
4. `mock-data-layer`
   - Policies, runbooks, historical incidents, location metadata, staff roles, demo scenarios.

### Later integration seams

- Elastic search adapter replaces local evidence lookup.
- Gemini orchestration replaces deterministic plan generation where useful.
- MCP tool adapters sit behind route handlers, not inside components.

## Folder Structure

```text
app/
  layout.tsx
  page.tsx
  globals.css
  api/
    incidents/route.ts
    evidence/route.ts
    action-plan/route.ts
    timeline/route.ts
    report/route.ts
components/
  dashboard/
    command-header.tsx
    report-input.tsx
    incident-list.tsx
    incident-card.tsx
    priority-badge.tsx
    evidence-panel.tsx
    action-plan-panel.tsx
    staff-update-panel.tsx
    timeline-panel.tsx
    post-event-report-panel.tsx
    venue-map.tsx
    map-marker.tsx
lib/
  incident-parser.ts
  priority.ts
  evidence.ts
  action-plan.ts
  report.ts
  types.ts
data/
  scenarios.json
  locations.json
  policies.json
  runbooks.json
  historical-incidents.json
  staff-roles.json
public/
  venue-map.svg
docs/
  STADIUM_SENTINEL_BUILD_PLAN.md
tests/
  incident-parser.test.ts
  priority.test.ts
  evidence.test.ts
```

## Mock Data Schema

### `scenarios.json`

- `id`
- `name`
- `inputReport`
- `expectedIncidentIds`

### `locations.json`

- `id`
- `name`
- `type` (`gate`, `section`, `elevator`, `restroom`, `desk`)
- `label`
- `mapX`
- `mapY`
- `priorityZone`

### `policies.json`

- `id`
- `title`
- `category`
- `summary`
- `applicability`
- `steps`
- `escalationNote`

### `runbooks.json`

- `id`
- `title`
- `incidentType`
- `locationTypes`
- `signals`
- `recommendedActions`
- `ownerRole`

### `historical-incidents.json`

- `id`
- `title`
- `incidentType`
- `locationId`
- `priority`
- `summary`
- `resolution`

### `staff-roles.json`

- `id`
- `role`
- `team`
- `responsibilities`

### Runtime incident shape

- `id`
- `rawText`
- `title`
- `incidentType`
- `category`
- `locationId`
- `locationLabel`
- `priority`
- `status`
- `assumptions`
- `evidenceIds`
- `recommendedActions`
- `assignedRole`

### Timeline entry shape

- `id`
- `incidentId`
- `timestamp`
- `type` (`reported`, `suggested`, `approved`, `resolved`)
- `message`
- `actor`

## UI Screen Breakdown

### 1. Event Overview

- Full-width command header with event name, status, active incident count, and risk summary.
- Large venue map as the visual anchor.
- Incident queue panel with priority-first ordering.
- Report input panel for the demo report.
- Timeline preview panel.

### 2. Incident Detail

- Selected incident summary.
- Priority, evidence/rationale, and assumptions.
- Evidence panel with cited policy, runbook, and similar incident references.
- Recommended action plan with approval controls.
- Draft staff update.

### 3. Action Timeline

- Chronological list of report receipt, agent suggestions, approvals, and status updates.
- Filter by incident.

### 4. Post-Event Report

- Incident summary table.
- Timeline recap.
- Unresolved issues.
- Improvement recommendations.
- Export-ready markdown or printable view.

## Component List

- `CommandHeader`
- `ReportInput`
- `IncidentList`
- `IncidentCard`
- `PriorityBadge`
- `VenueMap`
- `MapMarker`
- `IncidentDetailPanel`
- `EvidencePanel`
- `ActionPlanPanel`
- `ApprovalActions`
- `StaffUpdatePanel`
- `TimelinePanel`
- `PostEventReportPanel`
- `RiskSummaryStrip`

## Integration Route Plan

The current route contract can stay stable while Shot 1 replaces local evidence and orchestration with Elastic-backed retrieval and Gemini / Agent Builder integration.

### `POST /api/incidents`

- Input: raw report text
- Output: parsed incident array with initial priority and location mapping
- Later owner: Gemini orchestration entrypoint

### `POST /api/evidence`

- Input: incident array or single incident
- Output: matched policies, runbooks, and historical incidents
- Later owner: Elastic-backed retrieval

### `POST /api/action-plan`

- Input: incident plus evidence
- Output: recommended actions, assigned role, draft staff update
- Later owner: Gemini grounded generation

### `POST /api/timeline`

- Input: approved action event
- Output: appended timeline entries
- Later owner: persistent incident timeline store

### `POST /api/report`

- Input: incidents plus timeline
- Output: post-event report document payload
- Later owner: report generation/export service

## Shot 1 Integration Checklist

1. Keep the current scoreless dashboard and demo flow intact.
2. Stand up Elastic index strategy for policies, runbooks, incidents, locations, staff response rules, and timeline entries.
3. Add document chunking and metadata strategy for grounded citations and evidence provenance.
4. Expose Elastic retrieval through MCP or the approved Elastic Agent Builder path.
5. Connect Gemini / Google Cloud Agent Builder to the Elastic retrieval tools.
6. Replace local evidence lookup with Elastic-backed retrieval.
7. Replace deterministic orchestration where needed with Gemini-grounded action generation while preserving approval flow.
8. Persist timeline entries and incident history in Elastic as part of the operational memory layer.
9. Validate retrieval quality and end-to-end demo behavior against the seeded scenario set.

## Shot 2 Submission Checklist

1. Verify the hosted app works.
2. Verify the public GitHub repo works.
3. Add or confirm an open-source license.
4. Confirm the README explains the problem, workflow, Gemini / Google Cloud Agent Builder role, Elastic MCP role, demo flow, setup, and limitations.
5. Record or prepare the 3-minute demo video.
6. Confirm the Devpost submission includes the hosted URL, public repo URL, demo video, selected Elastic track, and completed description.
7. Run final validation across lint, tests, build, and e2e.

## Testing Checklist

- Parse the demo report into exactly three incidents.
- Confirm each incident receives the correct category and location.
- Confirm priority assignment matches the expected operational order.
- Confirm evidence retrieval returns seeded policy and runbook matches.
- Confirm approved actions append to the timeline only after approval.
- Confirm the post-event report includes incidents, actions, and unresolved items.
- Confirm the dashboard remains readable at common desktop sizes.
- Confirm the UI reads as an operations console, not a chatbot or landing page.

## Demo Script Outline

1. Open the Event Overview screen and establish the command-center framing.
2. Paste the demo report into the input box.
3. Show the app splitting one messy report into three incidents.
4. Show incident cards, priority ordering, and map markers appearing together.
5. Open one incident and show grounded evidence from Elastic-backed policy, runbook, and incident retrieval.
6. Show the recommended action plan and staff update draft.
7. Approve one action and show the timeline update.
8. Switch to the post-event report and show the final summary output.
9. Close by explaining that Shot 1 makes the agent real through Elastic and Gemini / Agent Builder integration without changing the UI contract.

## Risks and Blockers

- The biggest UX risk is building a screen that looks like generic SaaS software or a ticketing seat-map product instead of soccer stadium operations tooling.
- The biggest delivery risk is integrating Elastic and Gemini / Agent Builder without breaking the existing demo flow.
- A weak venue map will reduce the demo impact even if the logic works.
- If parsing becomes too open-ended during Shot 1, the demo flow may become brittle. Keep the main scenario stable while improving retrieval.
- Evidence quality depends on disciplined seed data and retrieval grounding. Poor source documents will make recommendations feel ungrounded.
- Report export should stay simple so Shot 1 focuses on the real agent integration work rather than a visual QA polish loop.
