# Stadium Sentinel Real Demo Script

Use this script for the Google Cloud Run real-demo path: seeded Elastic operations data, server-side bootstrap, Elastic-backed pull, Sentinel question-and-answer, and operator-approved write-back.

For the offline fallback recording path, use `docs/demo-recording-checklist.md`.

## Before recording

### Local verification

```bash
npm install
npm run dev
node scripts/verify-real-demo.mjs
```

### Google Cloud Run build-time flags

Set these before `npm run build`:

- `NEXT_PUBLIC_REAL_DEMO_FLOW=true`
- `NEXT_PUBLIC_ENABLE_ELASTIC_PULL=true`
- `NEXT_PUBLIC_ENABLE_SENTINEL_AGENT=true`
- `NEXT_PUBLIC_ENABLE_SENTINEL_VOICE=true` for voice-first, otherwise `false`
- `NEXT_PUBLIC_SHOW_VENUE_ORIENTATION=false`
- `NEXT_PUBLIC_SHOW_RADIO_TRANSCRIPT=false`

These flags are build-time only. Updating them on the Cloud Run service without rebuilding the image will not change client behavior.

### Google Cloud Run runtime env

Set these on the Cloud Run service:

- `ELASTICSEARCH_URL`
- `ELASTICSEARCH_API_KEY` or `ELASTIC_API_KEY`
- `AGENT_BACKEND_ENABLED=true`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `VERTEX_MODEL`
- Cloud Run service account with Vertex access through ADC, or `GOOGLE_APPLICATION_CREDENTIALS`
- `STADIUM_SENTINEL_BASE_URL` only if the optional MCP bridge is deployed

Local development may still use:

```bash
npm run index:elastic
```

That command is local-only and not required in the deployed demo.

## Deployed demo script

### 1. Open the command center

- Start on the landing page and open `/command`.
- Explain that the app uses seeded stadium operations data, not live stadium feeds.
- In the real-demo build, `/command` starts empty and disconnected.

### 2. Connect operations data

- Click `Connect operations data`.
- This calls `POST /api/ingest/bootstrap` on Cloud Run.
- Explain that the service seeds or verifies the Elastic indices server-side.

### 3. Pull latest reports

- Click `Pull latest reports`.
- This calls `POST /api/ingest/pull`.
- With Elastic configured, the queue loads seeded Elastic-backed incidents.
- Without Elastic configured, the app falls back to the local demo path.

### 4. Select the top incident

- Select the top priority incident.
- Show the active workspace and operations timeline.
- Keep the explanation focused on operations response, not venue visualization.

### 5. Ask Sentinel

- Open `Ask Sentinel`.
- If voice-first is enabled, use push-to-talk, review the transcript, then press `Ask`.
- If voice-first is disabled, type the question manually.
- Suggested prompts:
  - `What should I do first?`
  - `What evidence supports this?`
  - `What changed after pull latest reports?`

### 6. Approve the next action

- Show the grounded answer, evidence, citations, and recommended action.
- Approve one action.
- This calls `POST /api/timeline/write`.
- Show the updated timeline and source log.

### 7. Close

- State that human approval is required before write-back.
- State that local fallback remains available if Elastic or Vertex are not configured.
- Do not claim in-app MCP usage unless you are actually demonstrating the optional external bridge.

## Wording guardrails

Use `priority` only: Immediate, High, Moderate, Monitor.

Do not say: Critical, Low, severity, confidence, score, or numeric scoring.

Do not call the product a venue map, seat map, ticketing product, CRM dashboard, or analytics dashboard.

Do not claim Vercel deployment.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| `/command` shows preloaded incidents in the real-demo build | `NEXT_PUBLIC_REAL_DEMO_FLOW` was not `true` during image build |
| Connect does not enable the real-demo path | Elastic runtime env is missing or bootstrap failed |
| Pull falls back to local demo wording | Elastic is unconfigured, empty, or bootstrap was skipped |
| Sentinel falls back to deterministic answers | `AGENT_BACKEND_ENABLED` is not `true`, Vertex env is incomplete, or ADC is unavailable |
| Voice controls are missing | `NEXT_PUBLIC_ENABLE_SENTINEL_VOICE` was not `true` during image build |
