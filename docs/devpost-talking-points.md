# Stadium Sentinel — Devpost Talking Points

## Product summary

Stadium Sentinel is a **soccer-stadium incident operations command center**. Operators pull seeded operations reports, review a priority-sorted incident queue, ask Sentinel for grounded guidance, approve the next action, and see audited write-back in the timeline and source log.

It is not a map, seat-map, ticketing, CRM, or analytics dashboard.

---

## Agentic loop

1. **Pull** — `POST /api/ingest/pull` reads seeded active incidents and related ops docs from Elastic (fallback: local demo pool).
2. **Retrieve** — Sentinel gathers incident context, policies, evidence, roster, and radio transcripts via direct Elastic search.
3. **Reason** — Gemini/Vertex synthesizes an operator-facing answer when `AGENT_BACKEND_ENABLED=true`.
4. **Recommend** — Structured response includes evidence, citations, and one recommended next action.
5. **Human oversight** — Operator explicitly approves before any dispatch/write-back.
6. **Write-back** — `POST /api/timeline/write` appends dispatch timeline + incident memory when Elastic is configured.

---

## Elastic role

- Seeded mock operations backend (`npm run index:elastic`).
- Indices: active incidents, guest assistance, facility status, gate flow, staff roster, policies, radio transcripts, dispatch timeline, incident memory.
- Pull, Sentinel retrieval, and approved write-back all use **direct Elastic retrieval** in-app.
- Not required for page load — demo/local fallback always works.

---

## Gemini / Agent Builder role

- **In-app:** Gemini via Vertex on `POST /api/sentinel` when enabled.
- **Agent Builder / MCP:** Documented as an external integration path (`docs/ELASTIC_BUILDER_MCP_SETUP.md`). The app does **not** claim in-app MCP usage — `meta.elasticMcpMode` is `"unused"`.

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
- Voice is optional (`NEXT_PUBLIC_ENABLE_SENTINEL_VOICE=false` by default).
- Client radio transcript extract is hidden by default; indexed radio transcripts are the primary radio narrative.
- Venue orientation schematic is hidden by default.

---

## What to show in the video

1. Ingest status / seed readiness
2. Pull from Elastic (or demo fallback)
3. Priority queue + selected incident
4. Sentinel Ask with citations + recommended action
5. Operator approval + timeline/source log write-back
6. One sentence on fallback without credentials

---

## Priority language

Use: Immediate, High, Moderate, Monitor.

Avoid: Critical, Low, severity, confidence, score, numeric scoring.
