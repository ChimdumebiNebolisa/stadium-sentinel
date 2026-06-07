# Ingestion Deploy Checklist

Stadium Sentinel ingestion is designed so **demo/localStorage always works** and **Elastic is never required for page load**.

Deployment target: **Google Cloud Run** (Rapid Agent Hackathon). See [`README.md`](../README.md) for the full env split.

## Required for demo / hackathon recording

- No Elastic credentials required for page load
- `/command` and `/demo/intake` must load
- **Pull latest reports** can use local demo batch when Elastic is absent
- **Typed Sentinel** remains available as fallback
- Manual report processing uses `/api/agent` with deterministic local fallback

## Google Cloud Run — build-time client flags

Set in **Cloud Build** (or Docker build) **before** `npm run build`:

| Variable | Hackathon demo |
|----------|----------------|
| `NEXT_PUBLIC_REAL_DEMO_FLOW` | `true` |
| `NEXT_PUBLIC_ENABLE_ELASTIC_PULL` | `true` |
| `NEXT_PUBLIC_ENABLE_SENTINEL_AGENT` | `true` |
| `NEXT_PUBLIC_ENABLE_SENTINEL_VOICE` | `true` if voice-first |
| `NEXT_PUBLIC_SHOW_VENUE_ORIENTATION` | `false` |
| `NEXT_PUBLIC_SHOW_RADIO_TRANSCRIPT` | `false` |

`NEXT_PUBLIC_*` values are inlined at build time. Changing them on a running Cloud Run revision without rebuilding will not update client behavior.

## Google Cloud Run — runtime server config

Set on the **Cloud Run service** (prefer Secret Manager for secrets):

- `ELASTICSEARCH_URL`
- `ELASTICSEARCH_API_KEY` or `ELASTIC_API_KEY`
- Index overrides (optional): `ELASTICSEARCH_*_INDEX` vars
- `AGENT_BACKEND_ENABLED=true` for live Gemini + Elastic retrieval
- `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `VERTEX_MODEL`
- Cloud Run service account with Vertex AI access (ADC)

Never expose Elastic or Google credentials to the client bundle.

## Deployed demo path (no terminal seed)

1. Open `/command` (empty when `NEXT_PUBLIC_REAL_DEMO_FLOW=true`)
2. **Connect operations data** → `POST /api/ingest/bootstrap`
3. **Pull latest reports** → `POST /api/ingest/pull`

Local dev may still use `npm run index:elastic` before recording.

## Verification commands

```bash
npm test
npm run test:e2e
npm run build
npm run start
node scripts/verify-real-demo.mjs
```

Smoke checks (fallback, no Elastic):

1. Open `/command` — dispatch queue renders (preloaded in fallback mode, empty in real-demo mode)
2. Connect operations data or complete `/demo/intake` fallback path
3. Pull latest reports — queue refreshes
4. Ask Sentinel via typed input — answer renders
5. Open Source log — events after pull/approve

## CI constraints

- No real Elastic credentials in CI
- Voice APIs remain mocked in E2E
- `REAL_DEMO_E2E=1` required for gated real-demo Playwright suite

## Ingestion architecture notes

| Path | Storage / audit | Queue merge policy |
|------|-----------------|--------------------|
| Elastic bootstrap | server `POST /api/ingest/bootstrap` | Seeds indices; no queue change |
| Elastic pull | source audit | Replaces queue from Elastic |
| Demo pull | `demo-incident-pool` + source audit | Replaces batch via demo generator |
| Manual report | source audit | Replace + confirmation when queue non-empty |
| Radio transcript | `radio-transcript-intake` + source audit | Merge/add matched incidents |

Full audit history is capped at 20 events in `lib/source-audit.ts`.
