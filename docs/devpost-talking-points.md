# Stadium Sentinel Devpost Talking Points

## Product summary

Stadium Sentinel is a soccer-stadium incident operations command center deployed on Google Cloud Run. Operators connect seeded operations data, pull Elastic-backed incidents, ask Sentinel for grounded guidance, approve the next action, and see the resulting timeline update.

It is not a map product, seat-map product, ticketing product, CRM dashboard, or analytics dashboard.

## Deployment

- Platform: Google Cloud Run
- Container path: Next.js standalone build in the included Dockerfile
- Secrets: Secret Manager or Cloud Run runtime env for Elastic and other server secrets
- Build-time flags: `NEXT_PUBLIC_*` variables must be set before `npm run build`
- Vertex auth: prefer the Cloud Run service account and ADC over bundled key files

## Agentic loop

1. Connect operations data through `POST /api/ingest/bootstrap`
2. Pull latest reports through `POST /api/ingest/pull`
3. Retrieve grounded context from Elastic when configured
4. Ask Sentinel through `POST /api/sentinel`
5. Review evidence, citations, and recommended action
6. Approve one action
7. Write back through `POST /api/timeline/write`

## Real-demo configuration

Build-time client flags:

- `NEXT_PUBLIC_REAL_DEMO_FLOW=true`
- `NEXT_PUBLIC_ENABLE_ELASTIC_PULL=true`
- `NEXT_PUBLIC_ENABLE_SENTINEL_AGENT=true`
- `NEXT_PUBLIC_ENABLE_SENTINEL_VOICE=true` only when voice-first is desired
- `NEXT_PUBLIC_SHOW_VENUE_ORIENTATION=false`
- `NEXT_PUBLIC_SHOW_RADIO_TRANSCRIPT=false`

Runtime server config:

- `ELASTICSEARCH_URL`
- `ELASTICSEARCH_API_KEY` or `ELASTIC_API_KEY`
- `AGENT_BACKEND_ENABLED=true`
- `GOOGLE_CLOUD_PROJECT`
- `GOOGLE_CLOUD_LOCATION`
- `VERTEX_MODEL`
- Cloud Run service account with Vertex access through ADC

## Honest implementation wording

- In-app retrieval is direct Elastic search.
- In-app Sentinel uses Gemini on Vertex only when backend services are enabled and configured.
- MCP is not part of the in-app runtime path unless the optional external bridge is deployed separately.
- Local fallback remains available with no cloud credentials.

## Demo limitations

- Seeded operations data, not live stadium feeds
- Voice-first mode is optional
- Venue orientation stays hidden by default
- Radio transcript panel stays hidden by default

## Priority language

Use: Immediate, High, Moderate, Monitor.

Avoid: Critical, Low, severity, confidence, score, numeric scoring.
