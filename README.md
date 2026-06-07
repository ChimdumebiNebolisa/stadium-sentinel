# Stadium Sentinel

Stadium Sentinel is a Next.js incident operations command center for live soccer-stadium response workflows.

It is not a map product, seat-map product, ticketing product, CRM dashboard, or analytics dashboard.

## Commands

```bash
npm run dev
npm run build
npm run start
npm test
npm run test:e2e
node scripts/verify-real-demo.mjs
```

## Demo input

```text
Gate B is backed up, Elevator 4 is down, and a guest near Section 112 needs wheelchair access.
```

## Current scope

- Deterministic parsing into exactly three incidents for the local fallback path
- Priority-based incident queue with no numeric scoring
- Active incident workspace with evidence, response checklist, operations timeline, and report draft
- Elastic-seeded bootstrap and pull flow for the real demo
- Sentinel question-and-answer route with deterministic fallback when backend services are unavailable
- Approval-driven timeline write-back with local fallback

## Product direction

- Stadium Sentinel is a soccer-stadium incident operations command center.
- The main monitoring surface is the operations timeline.
- Venue orientation is hidden by default for the real-demo build.
- Local fallback remains available when Elastic or Vertex are not configured.

## Retrieval and agent path

- `POST /api/ingest/bootstrap` seeds or verifies Elastic-backed operations data when configured.
- `POST /api/ingest/pull` loads Elastic-backed incidents when available and falls back to the local demo batch otherwise.
- `POST /api/sentinel` uses Gemini on Vertex only when `AGENT_BACKEND_ENABLED=true` and server credentials are available.
- `POST /api/timeline/write` attempts Elastic write-back and still records a local approval result when Elastic is unavailable.
- The in-app path uses direct Elastic retrieval. MCP is not used in the app runtime path unless you deploy the optional bridge described in [docs/ELASTIC_BUILDER_MCP_SETUP.md](docs/ELASTIC_BUILDER_MCP_SETUP.md).

## Environment strategy

### Build-time client flags

`NEXT_PUBLIC_*` values are inlined during `npm run build`. For Google Cloud Run, set them in Cloud Build or Docker build args before the image is built.

- `NEXT_PUBLIC_REAL_DEMO_FLOW=true`
- `NEXT_PUBLIC_ENABLE_ELASTIC_PULL=true`
- `NEXT_PUBLIC_ENABLE_SENTINEL_AGENT=true`
- `NEXT_PUBLIC_ENABLE_SENTINEL_VOICE=true` for a voice-first recording, otherwise `false`
- `NEXT_PUBLIC_SHOW_VENUE_ORIENTATION=false`
- `NEXT_PUBLIC_SHOW_RADIO_TRANSCRIPT=false`

Changing these after deploy requires a rebuild and a new Cloud Run revision.

### Runtime server environment

Set these on the Cloud Run service. Do not expose them to the client.

- `ELASTICSEARCH_URL`
- `ELASTICSEARCH_API_KEY` or `ELASTIC_API_KEY`
- `AGENT_BACKEND_ENABLED=true`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `VERTEX_MODEL`
- `GOOGLE_APPLICATION_CREDENTIALS` only when you are not relying on the Cloud Run service account / ADC
- `STADIUM_SENTINEL_BASE_URL` only when the optional MCP bridge is deployed

Optional index overrides:

- `ELASTICSEARCH_PLAYBOOKS_INDEX`
- `ELASTICSEARCH_LOCATIONS_INDEX`
- `ELASTICSEARCH_INCIDENT_EXAMPLES_INDEX`
- `ELASTICSEARCH_EVIDENCE_INDEX`
- `ELASTICSEARCH_ACTIVE_INCIDENTS_INDEX`
- `ELASTICSEARCH_GUEST_ASSISTANCE_INDEX`
- `ELASTICSEARCH_FACILITY_STATUS_INDEX`
- `ELASTICSEARCH_GATE_FLOW_LOGS_INDEX`
- `ELASTICSEARCH_STAFF_ROSTER_INDEX`
- `ELASTICSEARCH_POLICIES_INDEX`
- `ELASTICSEARCH_RADIO_TRANSCRIPTS_INDEX`
- `ELASTICSEARCH_DISPATCH_TIMELINE_INDEX`
- `ELASTICSEARCH_INCIDENT_MEMORY_INDEX`

## Google Cloud Run deployment

This project targets Google Cloud Run, not Vercel.

### Container path

- `next.config.ts` uses `output: "standalone"` for container deployment.
- `Dockerfile` builds the app with explicit `NEXT_PUBLIC_*` build args and runs the standalone server on port `8080`.
- `.dockerignore` excludes local secrets and untracked artifacts from the image build context.

### Cloud Run checklist

1. Build the image with the required `NEXT_PUBLIC_*` flags.
2. Deploy the container to Cloud Run.
3. Set runtime secrets and server env vars on the Cloud Run service.
4. Use a Cloud Run service account with Vertex access when Sentinel backend is enabled.
5. Open `/command`, connect operations data, pull latest reports, ask Sentinel, and approve one action.

## Real-demo flow

1. Landing CTA opens `/command`.
2. When `NEXT_PUBLIC_REAL_DEMO_FLOW=true`, `/command` starts empty and disconnected.
3. Connect operations data calls `POST /api/ingest/bootstrap`.
4. Pull latest reports calls `POST /api/ingest/pull`.
5. Ask Sentinel calls `POST /api/sentinel`.
6. Approve action calls `POST /api/timeline/write`.
7. Local fallback remains available if credentials are absent.

No terminal command is required in the deployed demo. `npm run index:elastic` is for local setup only.

## Supporting docs

- [docs/real-demo-script.md](docs/real-demo-script.md)
- [docs/devpost-talking-points.md](docs/devpost-talking-points.md)
- [docs/INGESTION_DEPLOY_CHECKLIST.md](docs/INGESTION_DEPLOY_CHECKLIST.md)
- [docs/ELASTIC_BUILDER_MCP_SETUP.md](docs/ELASTIC_BUILDER_MCP_SETUP.md)
