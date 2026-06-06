# Stadium Sentinel

Stadium Sentinel is a Next.js incident operations command center for live soccer stadium response workflows.

## Commands

```bash
npm run dev
npm run build
npm test
npm run test:e2e
```

## Demo Input

```text
Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.
```

## Product Direction

- Stadium Sentinel is a soccer stadium incident operations product.
- The primary desktop layout is a 2-section command center:
  - left dispatch queue
  - right active incident workspace
  - bottom utility drawer
- The main value is operational response workflow, not venue visualization.
- The product is not a map product, seat-map product, ticketing product, or CRM-style admin dashboard.

## Current Scope

- Deterministic parsing into exactly three incidents
- Scoreless priority-based incident queue
- Active incident workspace with response checklist, team assignment, timeline summary, and evidence feed
- Drawer-based supporting artifacts: sourced evidence, staff update, full timeline, and report workspace
- Seeded operational evidence spanning policies, runbooks, historical incidents, locations, and staff response rules
- Approval-driven timeline entries
- Post-event report preview

## Binding Constraints

- No full seat-map package
- No seat-map libraries
- No seat selection
- No ticketing UI or ticket purchase flows
- No seat chart editor
- No numeric score, confidence score, or severity score UI

## Working Retrieval Path

- `POST /api/agent` runs the code-based orchestration path.
- The orchestrator always parses and builds the deterministic baseline first.
- If `AGENT_BACKEND_ENABLED=true`, the backend retrieves context from Elastic, calls Gemini on Vertex AI, validates the strict JSON response, and applies only validated enrichments.
- If Elastic is unavailable or sparse, the backend merges in local context from the seeded data.
- If Gemini or validation fails, the app falls back to the deterministic local response so the demo and tests still run.
- If `AGENT_BACKEND_ENABLED=false`, the current mock-first behavior remains unchanged.

## Hackathon Alignment

- Elastic is the current context, retrieval, and memory layer in the app path.
- Elasticsearch indexes hold operational playbooks, locations, incident examples, and evidence.
- Vertex AI / Gemini is the reasoning and enrichment layer that refines the deterministic incident packages.
- The deterministic parser and fallback path remain the safety rail for count, ids, and recovery behavior.
- The current implementation uses direct Elasticsearch retrieval from the app backend.
- Elastic Agent Builder, MCP-served tools, ES|QL-backed tools, and Elastic workflows are valid future extensions for this project, but they are not implemented in the current app path and should not be described as shipped behavior.

## Environment

Set these server-side only:

- `AGENT_BACKEND_ENABLED`
- `ELASTICSEARCH_URL`
- `ELASTICSEARCH_API_KEY`
- `ELASTICSEARCH_PLAYBOOKS_INDEX`
- `ELASTICSEARCH_LOCATIONS_INDEX`
- `ELASTICSEARCH_INCIDENT_EXAMPLES_INDEX`
- `ELASTICSEARCH_EVIDENCE_INDEX`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `VERTEX_MODEL`
- `GOOGLE_APPLICATION_CREDENTIALS`

Compatibility aliases still work for now:

- `ELASTIC_API_KEY`
- `GEMINI_MODEL`

Do not expose any of these to the client. For deployed environments, move secrets to GCP Secret Manager instead of committing them to the repo.

## Seed Data

- Deterministic local operational documents live in `data/operational-knowledge.json`.
- Elastic seed sets live in `data/elastic/`.
- The indexing script is `npm run index:elastic`.

## Partner Track Notes

- The project is aligned with the Rapid Agent Hackathon resource framing around context retrieval, memory, MCP tools, ES|QL tools, and workflow-based extensions.
- What is implemented now: direct Elasticsearch retrieval plus Vertex/Gemini enrichment with deterministic fallback.
- What is not implemented now: Elastic Agent Builder in the app path, Elastic MCP server tool calls in the app path, or ES|QL-backed callable tools.
