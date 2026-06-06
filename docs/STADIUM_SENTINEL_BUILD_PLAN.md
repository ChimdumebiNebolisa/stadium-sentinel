# Stadium Sentinel Build Plan

## Summary

Stadium Sentinel is a soccer stadium incident operations command center. The product takes a messy report, splits it into incidents, prioritizes them, drives response workflow, dispatches teams, and produces supporting evidence, timeline, staff wording, and a post-event report.

The primary UI is no longer map-first. The default desktop shell is:
- top command bar
- left dispatch queue
- right active incident workspace
- bottom utility drawer

## Binding Product Rules

- Stadium Sentinel is not a seat-map product.
- Stadium Sentinel is not a ticketing product.
- Stadium Sentinel is not a CRM-style admin dashboard.
- The stadium map is not the main product surface.
- Full seat-map packages, seat-map libraries, seat selection, ticket purchase flows, and seat chart editors are permanently out of scope.
- Categorical priority labels remain the product language: Immediate, High, Moderate, Monitor.

## Workflow

1. Accept one messy event report.
2. Split it into incident objects.
3. Sort incidents by operational priority.
4. Let operators select an incident from the dispatch queue.
5. Execute the response in the active incident workspace.
6. Support the response with evidence, staff update, timeline, and report artifacts in the utility drawer.

## UI Breakdown

### Top Command Bar

- Stadium Sentinel
- Riverside Stadium
- Live operations
- Open incident count
- Top priority

### Dispatch Queue

- Incident selection only
- Compact cards with incident number, short title, priority badge, and team
- No long descriptions, duplicated metadata, or map-heavy summaries

### Active Incident Workspace

- Incident header
- Primary action row
- Response checklist
- Team assignment
- Timeline summary
- Evidence feed

### Utility Drawer

- Evidence
- Staff Update
- Timeline
- Report

The drawer is collapsed by default and acts as a supporting artifact surface, not the main workspace.

## Implementation Constraints

- Keep parser behavior unchanged.
- Keep incident generation behavior unchanged.
- Keep severity and priority logic unchanged.
- Keep approval flow logic unchanged.
- Keep timeline and report generation behavior unchanged.
- Keep current `/api/*` contracts unchanged unless presentational cleanup absolutely requires otherwise.
- No new dependencies unless there is no practical alternative.

## Retrieval And Reasoning Alignment

- Elastic is the project's current retrieval and memory layer.
- The live Elasticsearch indices are:
  - operational playbooks
  - locations
  - incident examples
  - evidence
- The backend supports an append-only incident memory index named stadium_incident_memory.
- The current app path queries Elasticsearch directly from the backend.
- Vertex AI / Gemini is the reasoning and enrichment layer that operates on top of the deterministic baseline.
- The deterministic parser and fallback behavior remain the safety path when Elastic or Gemini is unavailable, sparse, invalid, or misconfigured.
- Bounded ES|QL operations are exposed by the server `/api/esql` to allow safe, validated historical insights.

## Rapid Agent Resource Positioning

- The Rapid Agent hackathon resources frame Elastic around contextual retrieval, memory, MCP tools, ES|QL tools, and workflows.
- Stadium Sentinel natively provides:
  - Bounded memory write-back (`app/api/report/route.ts`).
  - Pre-defined ES|QL data queries (`app/api/esql/route.ts`).
  - JSON schemas to drop into MCP/Agent builder environments (`lib/elastic/tools.ts`).
- Elastic Agent Builder and live MCP Server proxy routing are *not* implemented inside this repo automatically. Instead, this repo acts as the API backend that a user can map *into* Agent Builder by following the setup steps in `docs/ELASTIC_BUILDER_MCP_SETUP.md`.

## Verification

- `npm test`
- `npm run build`
- `npm run test:e2e`
- Local browser verification that the primary screen is queue plus workspace plus drawer
- Screenshot capture of the redesigned desktop command center
