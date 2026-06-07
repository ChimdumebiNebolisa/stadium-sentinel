# Stadium Sentinel — Devpost Talking Points

## Product summary

Stadium Sentinel is a **soccer-stadium incident operations command center** deployed on **Google Cloud Run** for the Rapid Agent Hackathon. Operators connect seeded operations data, pull Elastic-backed incidents, ask Sentinel for grounded guidance, approve the next action, and see audited write-back in the timeline and source log.

It is not a map, seat-map, ticketing, CRM, or analytics dashboard.

---

## Deployment (Google Cloud)

- **Platform:** Google Cloud Run (Next.js container).
- **Secrets:** Elastic API key and similar values via **Secret Manager** → Cloud Run runtime env vars. Never client-exposed.
- **Build-time flags:** `NEXT_PUBLIC_*` variables must be set during **Cloud Build** / `npm run build`, not only at Cloud Run runtime.
- **Hackathon demo build:** `NEXT_PUBLIC_REAL_DEMO_FLOW=true`, voice flag optional, venue/radio panels off.
- **Runtime:** `AGENT_BACKEND_ENABLED=true`, Elastic URL/key, Vertex project/region/model, Cloud Run service account for ADC.

---

## Agentic loop

1. **Connect** — `POST /api/ingest/bootstrap` on Cloud Run seeds/verifies Elastic ops indices.
2. **Pull** — `POST /api/ingest/pull` reads seeded active incidents and related ops docs (fallback: local demo pool).
3. **Retrieve** — Sentinel gathers context via direct Elastic search.
4. **Reason** — Gemini/Vertex on `POST /api/sentinel` when `AGENT_BACKEND_ENABLED=true`.
5. **Recommend** — Answer + evidence + citations + recommended next action.
6. **Human oversight** — Operator explicitly approves before write-back.
7. **Write-back** — `POST /api/timeline/write` appends dispatch timeline + incident memory.

---

## Elastic role

- Seeded stadium operations backend (bootstrap from UI or `npm run index:elastic` locally).
- Indices: active incidents, guest assistance, facility status, gate flow, staff roster, policies, radio transcripts, dispatch timeline, incident memory.
- Pull, Sentinel retrieval, and approved write-back use **direct Elastic retrieval** in-app.
- Not required for page load — demo/local fallback always works.

---

## Gemini / Agent Builder role

- **In-app:** Gemini via Vertex on `POST /api/sentinel` when enabled on Cloud Run.
- **Agent Builder / MCP:** External integration (`docs/ELASTIC_BUILDER_MCP_SETUP.md`). In-app `meta.elasticMcpMode` is `"unused"`.

---

## Human oversight

- Sentinel recommends; operators approve.
- No autonomous dispatch.
- Write failures do not block local UI updates.

---

## Fallback reliability

- No Elastic credentials → demo pull + deterministic Sentinel Q&A + local timeline.
- No Gemini credentials → same UI, local fallback answers.
- Judges can run the full story without cloud credentials.

---

## Demo limitations (state honestly)

- Seeded mock data, not live stadium feeds.
- Voice is optional (`NEXT_PUBLIC_ENABLE_SENTINEL_VOICE` — build-time flag).
- Client radio transcript extract hidden by default.
- Venue orientation schematic hidden by default.

---

## What to show in the video

1. `/command` disconnected → Connect operations data (Cloud Run bootstrap)
2. Pull from Elastic (or demo fallback)
3. Priority queue + selected incident
4. Sentinel Ask (voice-first if enabled) with citations + recommended action
5. Operator approval + timeline/source log write-back
6. One sentence on fallback without credentials

---

## Priority language

Use: Immediate, High, Moderate, Monitor.

Avoid: Critical, Low, severity, confidence, score, numeric scoring.
