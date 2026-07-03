# Ingestion Deploy Checklist

Stadium Sentinel targets Google Cloud Run. Local fallback must keep working even when Elastic or Vertex are not configured.

## Build-time client flags

Set these before `npm run build` or pass them as Docker build args:

- `NEXT_PUBLIC_REAL_DEMO_FLOW=true`
- `NEXT_PUBLIC_ENABLE_ELASTIC_PULL=true`
- `NEXT_PUBLIC_ENABLE_SENTINEL_AGENT=true`
- `NEXT_PUBLIC_ENABLE_SENTINEL_VOICE=true` for voice-first, otherwise `false`
- `NEXT_PUBLIC_SHOW_VENUE_ORIENTATION=false`
- `NEXT_PUBLIC_SHOW_RADIO_TRANSCRIPT=false`

These are build-time only. Changing them on a running Cloud Run revision without rebuilding the image will not change the client bundle.

## Runtime server environment

Set these on the Cloud Run service:

- `ELASTICSEARCH_URL`
- `ELASTICSEARCH_API_KEY` or `ELASTIC_API_KEY`
- `AGENT_BACKEND_ENABLED=true`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `VERTEX_MODEL`
- Cloud Run service account with Vertex access through ADC, or `GOOGLE_APPLICATION_CREDENTIALS`
- `STADIUM_SENTINEL_BASE_URL` only for the optional MCP bridge

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

## Cloud Run deployment checklist

1. Build the container with the required `NEXT_PUBLIC_*` values.
2. Deploy the image to Cloud Run.
3. Set runtime secrets and env vars on the Cloud Run service.
4. Confirm the Cloud Run service account has Vertex access if Sentinel backend is enabled.
5. Open `/command` and confirm the real-demo build starts empty and disconnected.
6. Click `Connect operations data` and confirm `POST /api/ingest/bootstrap` succeeds.
7. Click `Pull latest reports` and confirm `POST /api/ingest/pull` returns incidents.
8. Ask Sentinel and confirm `POST /api/sentinel` responds.
9. Approve one action and confirm `POST /api/timeline/write` updates the timeline.

## Deployed demo path

1. Landing CTA
2. `/command` empty and disconnected
3. Connect operations data
4. Bootstrap route seeds or verifies Elastic data
5. Pull latest reports
6. Pull route loads Elastic-backed incidents
7. Ask Sentinel
8. Sentinel returns grounded guidance
9. Approve action
10. Timeline write route records the approval result

No terminal command is required in the deployed demo.

## Credentialed smoke checklist

- `GET /api/demo/status`
- `GET /api/ingest/status`
- `POST /api/ingest/bootstrap`
- `POST /api/ingest/pull`
- `POST /api/sentinel`
- `POST /api/timeline/write`
- Confirm the source log shows the bootstrap, pull, and approval path

## Fallback checklist

- `/command` still loads with no Elastic credentials
- `POST /api/ingest/bootstrap` returns `unconfigured` rather than failing the page
- `POST /api/ingest/pull` falls back to the local demo batch
- `POST /api/sentinel` still returns a deterministic answer
- `POST /api/timeline/write` still returns a local approval result

## Known limitations

- The seeded Elastic data is static demo data, not live stadium telemetry.
- `NEXT_PUBLIC_*` flags require a rebuild.
- Voice-first behavior depends on the build-time voice flag.
- The optional MCP bridge is separate from the in-app runtime path.
