# Stadium Sentinel

Priority-based Next.js soccer stadium command-center app for live stadium operations.

## Commands

```bash
npm run dev
npm run lint
npm run build
npm test
npm run test:e2e
```

## Demo Input

```text
Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.
```

## Current Scope

- Deterministic parsing into exactly three incidents
- Scoreless priority-based incident queue
- Custom inline soccer-stadium operational schematic with seeded markers
- Seeded operational evidence spanning policies, runbooks, historical incidents, locations, and staff response rules
- Recommended actions and staff update draft
- Approval-driven timeline entries
- Post-event report preview

## Venue Direction

- Stadium Sentinel models a soccer or football stadium command center, not a generic arena dashboard.
- The venue topology uses four operational layers: Perimeter, Concourse, Bowl or Stands, and Restricted.
- The map is a custom inline SVG operational schematic. No full seat-map package or seat-level interaction is part of this project.
- Ticketing, seat selection, seating-chart editing, and seat-map libraries are out of scope.
- The UI remains scoreless and category-based: Immediate, High, Moderate, Monitor.

## Shot 1 Status

- The app now uses a code-based Gemini + Elastic retrieval path for the working demo.
- The Elastic Agent Builder MCP endpoint is configured and was verified locally outside the app path.
- Google low-code Agent Designer direct MCP connection remains blocked because authenticated MCP servers are not supported there.
- The UI remains scoreless and category-based: Immediate, High, Moderate, Monitor.

## Working Retrieval Path

- `POST /api/agent` runs the code-based orchestration path.
- The orchestrator keeps the deterministic three-incident split for the demo report.
- Evidence retrieval prefers live Elastic search when the environment is configured and the index contains the seeded operational documents.
- If Elastic is unavailable or the index is empty, the app falls back to seeded local retrieval so tests and the demo flow still work without cloud credentials.
- Gemini refinement is optional. If `GEMINI_API_KEY` is present, the app can refine action wording and report wording through a code-based Gemini call. If not, the app uses deterministic local generation.

## Elastic Notes

- Elastic-backed retrieval in the app currently uses Elasticsearch search APIs directly.
- Elastic MCP-backed retrieval is configured and verified locally as an endpoint capability, but the app does not call the MCP endpoint directly in this pass.
- The low-code Google Agent Designer MCP connection is not complete and should not be described as working.

## Indexing Seed Data

- Seeded operational documents live in `data/operational-knowledge.json`.
- The indexing script is `npm run index:elastic`.
- The current read-only Elastic API key can search but cannot create mappings or bulk index documents, so live indexing requires a write-capable Elastic key or a manual Kibana indexing step.
