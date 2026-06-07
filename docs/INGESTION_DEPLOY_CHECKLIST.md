# Ingestion Deploy Checklist

Stadium Sentinel ingestion is designed so **demo/localStorage always works** and **Elastic is never required for page load**.

> **Hackathon forward plan:** The real-demo restructure (Elastic-first Pull, Sentinel agent route, write-back) is defined in [`docs/real-demo-restructure-plan.md`](real-demo-restructure-plan.md). This checklist’s fallback constraints remain binding; the “optional Elastic (post-demo)” framing is superseded for the primary hackathon narrative.

## Required for demo / hackathon recording

- No Elastic credentials required
- `/command` and `/demo/intake` must load with default demo state
- **Pull latest reports** uses local demo batch generation
- **Typed Sentinel** remains the primary Q&A path
- Manual report processing uses `/api/agent` with deterministic local fallback

## Optional Elastic setup (post-demo / production)

Set in `.env.local` (never commit this file):

- `ELASTICSEARCH_URL`
- `ELASTICSEARCH_API_KEY` or `ELASTIC_API_KEY`
- Optional index overrides:
  - `ELASTICSEARCH_PLAYBOOKS_INDEX`
  - `ELASTICSEARCH_LOCATIONS_INDEX`
  - `ELASTICSEARCH_INCIDENT_EXAMPLES_INDEX`
  - `ELASTICSEARCH_EVIDENCE_INDEX`
  - `ELASTICSEARCH_INCIDENT_MEMORY_INDEX`

Optional agent backend:

- `AGENT_BACKEND_ENABLED=true` for live Gemini + Elastic retrieval on `/api/agent`

## Verification commands

```bash
npm test
npm run test:e2e
npm run build
npm run start
```

Smoke checks:

1. Open `/demo/intake` and connect demo sources
2. Open `/command` — dispatch queue renders without Elastic
3. Pull latest reports — queue refreshes from demo batch
4. Open Report tab — replace confirmation appears when queue is non-empty
5. Ask Sentinel via typed input — answer renders without voice or Elastic
6. Open Evidence tab — evidence read path shows local/fallback mode when Elastic is absent
7. Open Source log tab — ingestion events appear after pull/manual/transcript actions

## CI constraints

- No real Elastic credentials in CI
- Voice APIs remain mocked in E2E
- Automatic ingest prototype stays disabled unless Elastic is configured server-side

## Ingestion architecture notes

| Path | Storage / audit | Queue merge policy |
|------|-----------------|--------------------|
| Demo pull | `demo-incident-pool` + source audit | Replaces batch via demo generator |
| Manual report | source audit | Replace + explicit confirmation when queue non-empty |
| Radio transcript | `radio-transcript-intake` + source audit | Merge/add matched incidents |
| Elastic evidence read | optional `/api/evidence/read` | Does not mutate queue |
| Automatic ingest (prototype) | source audit | Gated; requires Elastic configured |

Full audit history is capped at 20 events in `lib/source-audit.ts` and stored outside `CommandState`.
