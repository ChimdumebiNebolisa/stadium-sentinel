# Stadium Sentinel — Real Demo Script

Use this script for the **Rapid Agent Hackathon** real-demo path: seeded Elastic operations data, Elastic-first Pull, Sentinel agent route, and operator-approved write-back.

For the offline typed-Sentinel recording path without credentials, use [`demo-recording-checklist.md`](demo-recording-checklist.md).

---

## Before you record

1. Install dependencies: `npm install`
2. Optional Elastic seed (credentialed demo):
   ```bash
   npm run index:elastic
   ```
3. Optional agent env (credentialed demo):
   - `AGENT_BACKEND_ENABLED=true`
   - `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `VERTEX_MODEL`
   - `GOOGLE_APPLICATION_CREDENTIALS` or ADC
4. Verify fallback path (no server secrets printed):
   ```bash
   npm run dev
   node scripts/verify-real-demo.mjs
   ```

Default feature flags (no `.env.local` changes required):

- Venue orientation: **hidden**
- Radio transcript intake panel: **hidden**
- Sentinel voice: **off**
- Elastic Pull + Sentinel agent route: **on**

---

## Demo flow (5–7 minutes)

### 1. Seed and status

- Explain: this is **seeded mock stadium operations data**, not live ingestion.
- If Elastic is configured, mention `npm run index:elastic` loaded active incidents, policies, roster, and radio transcripts.
- Open `/command` and point to the ingestion status banner.
- Expected: **Demo fallback available** always; **Elastic seed ready** when configured.

### 2. Connect sources

- Go to `/demo/intake`.
- Click **Connect demo sources** until all four sources show connected.
- Open **Command center**.

### 3. Pull latest reports

- Click **Pull latest reports**.
- **With Elastic configured:** status reads `Seeded operations data pulled from Elastic (N incidents).`
- **Without Elastic:** status reads `Latest demo reports pulled.`
- Show source log entry with `elastic` or `demo` source mode.

### 4. Select top incident

- Queue is sorted by priority: Immediate → High → Moderate → Monitor.
- Select the top incident (typically guest assistance at Section 112).
- Briefly show evidence in the workspace/drawer — grounded in seeded ops docs.

### 5. Ask Sentinel

- Open **Ask Sentinel**.
- Use typed Ask (primary path). Optional: enable `NEXT_PUBLIC_ENABLE_SENTINEL_VOICE=true` for push-to-talk — review transcript, then click **Ask** manually.
- Suggested questions:
  - `What should I do first?`
  - `What evidence supports this?`
  - `What did the radio log add?` (cites indexed `stadium_radio_transcripts` when Elastic configured)
- Show answer, evidence chips, citations, and recommended action when agent backend is live.
- **Without Gemini:** deterministic local fallback still answers — demo never blocks.

### 6. Approve action

- Approve the primary checklist action **or** **Apply Sentinel recommendation** when shown.
- Human approval is required — Sentinel does not autonomously dispatch.
- Show timeline update and source log write-back summary.
- **With Elastic:** write-back targets `stadium_dispatch_timeline` and `stadium_incident_memory`.
- **Without Elastic:** local UI + source audit fallback only.

### 7. Close

- Mention fallback reliability: same UI loads with zero credentials.
- Do **not** show venue orientation (hidden by default).
- Do **not** use client radio transcript extract as the primary beat — radio content comes from indexed Elastic evidence when configured.

---

## Wording guardrails

Use **priority** only: Immediate, High, Moderate, Monitor.

Do not say: Critical, Low, severity, confidence, score, or numeric scoring.

Do not claim live ingestion unless it is truly live.

Do not claim Google Agent Builder MCP is used inside the app — retrieval is direct Elastic search; MCP is external/documented separately.

---

## Troubleshooting

| Symptom | Check |
|---------|--------|
| Pull always shows demo wording | Elastic env missing or seed empty — run `npm run index:elastic` |
| Sentinel always shows local fallback | `AGENT_BACKEND_ENABLED` not `true` or Vertex creds missing |
| Write-back shows fallback | Elastic unavailable — local approve still works |
| Voice button missing | `NEXT_PUBLIC_ENABLE_SENTINEL_VOICE=false` (default) |
| Radio transcript panel missing | `NEXT_PUBLIC_SHOW_RADIO_TRANSCRIPT=false` (default) |
