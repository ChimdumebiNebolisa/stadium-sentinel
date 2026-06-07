# Stadium Sentinel — Real Demo Script

Use this script for the **Google Cloud Rapid Agent Hackathon** real-demo path: seeded Elastic operations data on **Google Cloud Run**, server-side bootstrap, Elastic-first Pull, Sentinel agent route, and operator-approved write-back.

For the offline typed-Sentinel recording path without credentials, use [`demo-recording-checklist.md`](demo-recording-checklist.md).

---

## Before you record

### Local verification (no secrets printed)

```bash
npm install
npm run dev
node scripts/verify-real-demo.mjs
```

### Google Cloud Run (hackathon deployment)

**Build-time** — set in Cloud Build before `npm run build`:

- `NEXT_PUBLIC_REAL_DEMO_FLOW=true`
- `NEXT_PUBLIC_ENABLE_ELASTIC_PULL=true`
- `NEXT_PUBLIC_ENABLE_SENTINEL_AGENT=true`
- `NEXT_PUBLIC_ENABLE_SENTINEL_VOICE=true` (optional, voice-first Sentinel)
- `NEXT_PUBLIC_SHOW_VENUE_ORIENTATION=false`
- `NEXT_PUBLIC_SHOW_RADIO_TRANSCRIPT=false`

**Runtime** — Cloud Run service environment variables (use Secret Manager for secrets):

- `ELASTICSEARCH_URL`, `ELASTICSEARCH_API_KEY` (or `ELASTIC_API_KEY`)
- `AGENT_BACKEND_ENABLED=true`
- `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `VERTEX_MODEL`
- Cloud Run service account with Vertex AI access (ADC; avoid baking key files into the image)

Local dev only (not required on deployed demo):

```bash
npm run index:elastic   # optional; deployed UI uses POST /api/ingest/bootstrap instead
```

---

## Demo flow (5–7 minutes)

### 1. Open command center

- Explain: **seeded stadium operations data**, not live ingestion.
- Landing CTA → `/command` starts **empty / disconnected** when real-demo flow is enabled.
- Ingestion banner describes Elastic readiness; local fallback remains available but is not the headline path.

### 2. Connect operations data

- Click **Connect operations data** on `/command`.
- Cloud Run runs `POST /api/ingest/bootstrap` — seeds or verifies Elastic indices server-side.
- No terminal command required in the deployed demo.

### 3. Pull latest reports

- Click **Pull latest reports**.
- **With Elastic configured:** `Seeded operations data pulled from Elastic (N incidents).`
- **Without Elastic:** `Latest demo reports pulled.` (fallback)
- Show source log entry with `elastic` or `demo` source mode.
- Queue sorted by priority: Immediate → High → Moderate → Monitor.

### 4. Select top incident

- Select the top incident (typically guest assistance at Section 112).
- Show evidence in workspace/drawer — grounded in seeded ops docs.

### 5. Ask Sentinel

- Open **Ask Sentinel**.
- **Voice-first** when `NEXT_PUBLIC_ENABLE_SENTINEL_VOICE=true`: push-to-talk → review transcript → press **Ask** (no auto-submit).
- **Typed fallback** always available in “Type a question.”
- Suggested questions:
  - `What should I do first?`
  - `What evidence supports this?`
  - `What did the radio log add?`
- Show answer, evidence chips, citations, and recommended action when agent backend is live.
- **Without Gemini:** deterministic local fallback still answers.

### 6. Approve action

- Approve checklist action or **Apply Sentinel recommendation** when shown.
- Human approval required — Sentinel does not autonomously dispatch.
- **With Elastic:** write-back to `stadium_dispatch_timeline` and `stadium_incident_memory`.
- Show timeline update and source log.

### 7. Close

- Mention fallback: same UI loads with zero credentials.
- Do **not** show venue orientation (hidden by default).
- Do **not** claim in-app MCP usage — retrieval is direct Elastic search in-app.

---

## Wording guardrails

Use **priority** only: Immediate, High, Moderate, Monitor.

Do not say: Critical, Low, severity, confidence, score, or numeric scoring.

Do not claim live ingestion unless it is truly live.

Do not reference Vercel deployment — this app targets **Google Cloud Run**.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Command center shows preloaded demo incidents | `NEXT_PUBLIC_REAL_DEMO_FLOW` not `true` at **build** time — rebuild image |
| Connect does nothing useful | Elastic runtime env missing on Cloud Run service |
| Pull shows demo wording | Elastic empty or unconfigured — use Connect operations data first |
| Sentinel shows local fallback | `AGENT_BACKEND_ENABLED` not `true` or Vertex/ADC missing on Cloud Run |
| Voice button missing | `NEXT_PUBLIC_ENABLE_SENTINEL_VOICE` not `true` at build time |
| Bootstrap slow on first connect | Normal — 12 index bulk operations on cold serverless |
