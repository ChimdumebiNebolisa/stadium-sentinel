# Stadium Sentinel Real Demo Implementation Plan

**Document type:** Implementation spec (execution plan)
**Status:** Active — hackathon forward plan
**Supersedes:** Roadmap-style content previously in this file (replaced, not appended)
**Audit reference:** `.cursor/plans/real_demo_restructure_audit_12d3a6e9.plan.md`
**Fallback snapshot:** [`docs/demo-recording-checklist.md`](demo-recording-checklist.md) + tag `recording-snapshot-phase-35`

---

## Product identity

Stadium Sentinel is a **soccer-stadium incident operations command center**.

It is **not** a map product, seat-map product, ticketing product, CRM dashboard, or analytics dashboard.

**Priority language (binding):** Use **priority** only — `Immediate`, `High`, `Moderate`, `Monitor`. Do not introduce Critical, Low, severity, confidence, score, or numeric scoring.

---

## 0. Baseline

### Git state

| Item | Value |
|------|-------|
| **Current branch** | `codex/ui-polish-command-center-fit` |
| **Latest HEAD** | `a111820` — *test venue orientation selection sync* |
| **Recording snapshot tag** | `recording-snapshot-phase-35` → `64cd543` (*add demo recording checklist*) |
| **Post-Pass-4 tag** | `post-pass-4-snapshot` → `a111820` (HEAD; includes venue orientation) |

### Major completed work

The R phases below supersede historical Pass labels for all future implementation.

| Pass | Delivered | Key paths |
|------|-----------|-----------|
| **Pass 1** | Typed-Sentinel recording demo + checklist | `docs/demo-recording-checklist.md`, `lib/demo-incident-pool.ts` |
| **Pass 2** | Mock voice shell only | `lib/sentinel-voice-shell.ts`, `components/dashboard/sentinel-inline.tsx` |
| **Pass 3** | Ingestion/source architecture: source mode contracts, manual report ingestion, source audit, ingestion fallback, Elastic evidence read UI, automatic ingest prototype, Sentinel historical context answers, ingestion tests/deploy checklist | `lib/command-state-normalizer.ts`, `lib/source-audit.ts`, `lib/manual-report-ingestion.ts`, `lib/ingestion-fallback.ts`, `app/api/evidence/read/route.ts`, `lib/automatic-ingestion.ts`, `lib/sentinel-command-agent.ts`, `docs/INGESTION_DEPLOY_CHECKLIST.md` |
| **Pass 4** | Venue orientation only | `components/dashboard/venue-orientation-panel.tsx`, `lib/venue-schematic.ts` |

### Elastic / agent infrastructure already in repo

| Capability | Status | Path |
|------------|--------|------|
| Direct Elastic search (4 read indices) | Implemented, optional | `lib/elastic/search.ts` |
| Incident memory write-back | Implemented, UI not wired | `lib/elastic/memory.ts`, `app/api/report/route.ts` |
| Bounded ES\|QL | Implemented | `app/api/esql/route.ts`, `lib/elastic/esql.ts` |
| Gemini refinement on `/api/agent` | Implemented, gated | `lib/agent/gemini.ts`, `lib/agent/vertex.ts` |
| MCP tool schemas (external) | Schemas only | `lib/elastic/tools.ts`, `mcp/esql-bridge/` |
| Sentinel Ask (UI) | Deterministic local only | `lib/sentinel-command-agent.ts` |
| Pull latest reports | Client demo pool only | `components/dashboard/command-center.tsx` → `generateDemoIncidentBatch()` |

### Known gaps (must close for real demo)

1. Only **14 seed documents** across four Elastic read indices — no active-ops indices.
2. **Pull** never queries Elastic; `automatic-ingestion` gates on Elastic but still runs demo batch.
3. **Sentinel Ask** uses `answerSentinelQuestion` — no `POST /api/sentinel`.
4. **`/api/report` memory write** not connected to operator approve flow in main UI.
5. **Venue orientation** visible in workspace — visual noise for hackathon story.
6. **Radio transcript** client-only in intake bar — competes with Elastic narrative.
7. **`AGENT_BACKEND_ENABLED`** defaults `false`; production deploy verified with agent off.

### Fallback preservation

The **local recording demo remains valid** and must not be deleted. When Elastic/Gemini env vars are absent, the app loads with `buildDemoState()`, localStorage pull, and deterministic Sentinel Q&A exactly as documented in [`docs/demo-recording-checklist.md`](demo-recording-checklist.md).

---

## 1. Target real demo story

### Exact target flow

```
npm run index:elastic  (seed mock stadium operations data)
        ↓
/demo/intake  →  connect sources  →  verify Elastic readiness (ingest status)
        ↓
/command  →  Pull latest reports  →  POST /api/ingest/pull  →  query Elastic
        ↓
normalize hits  →  IncidentPackage[] + TimelineEntry[]
        ↓
operator selects top incident  →  Ask Sentinel  →  POST /api/sentinel
        ↓
Gemini/Agent Builder + Elastic/MCP retrieval
        ↓
structured response: answer + evidence + recommended action + citations
        ↓
operator approves dispatch/update
        ↓
POST /api/timeline/write  →  stadium_dispatch_timeline + stadium_incident_memory
        ↓
Source log + timeline panel show write-back
```

**Without credentials:** same UI loads; Pull uses `DEMO_INCIDENT_POOL`; Sentinel uses `answerSentinelQuestion`; writes stay in React state + local source audit.

### Why this is agentic

| Pillar | How the demo shows it |
|--------|----------------------|
| **Retrieval** | Agent pulls seeded ops docs (incidents, policies, roster, transcripts, facility status) from Elastic |
| **Reasoning** | Gemini synthesizes operator-facing answer from retrieved context + selected incident |
| **Planning** | Response includes **recommended action** grounded in SOPs/runbooks |
| **Tool / data use** | Citations name Elastic source ids/snippets; optional bounded ES\|QL for memory |
| **Human oversight** | Operator reviews answer and explicitly approves before write-back |
| **Visible write-back** | Approved action appends to dispatch timeline / incident memory; Source log records `elastic` path |

**Judge-facing wording:** Seeded mock operations data — not “live ingestion” — powering retrieval, reasoning, and audited action.

---

## 2. Implementation phases

---

### R1 — Hide venue orientation safely

#### Goal
Remove schematic venue panel from default demo view without deleting implementation.

#### User-visible behavior
- Active incident workspace **does not show** venue orientation section when flag is off (default).
- Setting `NEXT_PUBLIC_SHOW_VENUE_ORIENTATION=true` restores collapsible schematic panel.

#### Files likely touched
- [`components/dashboard/active-incident-workspace.tsx`](components/dashboard/active-incident-workspace.tsx)
- [`.env.example`](.env.example)
- [`e2e/demo-flow.spec.ts`](e2e/demo-flow.spec.ts)

#### New files likely created
- `lib/feature-flags.ts` (optional thin helper)

#### Data/API contracts
- Client flag: `NEXT_PUBLIC_SHOW_VENUE_ORIENTATION: "true" | "false"` (default `"false"`).
- No API changes.

#### Tests required
- **E2E:** Gate venue block (~L717–747) — skip when flag off; run when flag on.
- **Unit:** Keep [`tests/venue-schematic.test.ts`](tests/venue-schematic.test.ts) unchanged.

#### Validation commands
```bash
npm test
npm run test:e2e
npm run build
```

#### Commit name
`hide venue orientation by default`

#### Stop condition
- Panel absent in default dev/prod build.
- E2E pass with flag off.
- Panel restorable with flag on.

#### Rollback plan
Set `NEXT_PUBLIC_SHOW_VENUE_ORIENTATION=true` or revert conditional render commit.

#### Out of scope
- Deleting `venue-orientation-panel.tsx`, `lib/venue-schematic.ts`, or unit tests.
- Map/seat visualization work.

---

### R2 — Elastic seed dataset

#### Goal
Elastic becomes the seeded mock stadium operations backend; ingest status reports seed health.

#### User-visible behavior
- `GET /api/ingest/status` shows per-index readiness: exists, document count, minimum threshold met.
- `IngestionStatusBanner` displays “Elastic seed ready” vs “Demo fallback” with counts.
- **Pull behavior unchanged** — still uses local demo pool until R3.

#### Files likely touched
- [`scripts/index-elastic.mjs`](scripts/index-elastic.mjs)
- [`lib/elastic/client.ts`](lib/elastic/client.ts)
- [`lib/types.ts`](lib/types.ts)
- [`lib/ingestion-fallback.ts`](lib/ingestion-fallback.ts)
- [`app/api/ingest/status/route.ts`](app/api/ingest/status/route.ts)
- [`components/dashboard/ingestion-status-banner.tsx`](components/dashboard/ingestion-status-banner.tsx)
- [`.env.example`](.env.example)
- [`lib/data.ts`](lib/data.ts) (local JSON fallback parity for new indices)

#### New files likely created
- `data/elastic/stadium_active_incidents.json`
- `data/elastic/stadium_guest_assistance.json`
- `data/elastic/stadium_facility_status.json`
- `data/elastic/stadium_gate_flow_logs.json`
- `data/elastic/stadium_staff_roster.json`
- `data/elastic/stadium_policies.json`
- `data/elastic/stadium_radio_transcripts.json`
- `data/elastic/stadium_dispatch_timeline.json`
- `lib/elastic/seed-health.ts`
- `tests/elastic-seed-health.test.ts`
- `tests/elastic-seed-dataset.test.ts`

#### Data/API contracts
- See **§3 Data Contracts** and **§4 API Contracts** (`GET /api/ingest/status` extended).
- Seed command: `npm run index:elastic`.
- Minimum seed targets: ≥8 active incidents; ≥3 docs per auxiliary index; retain existing 4 read indices.

#### Tests required
- **Unit:** Seed JSON validates against TypeScript shapes; canonical incident ids (`incident-section-112`, `incident-elevator-4`, `incident-gate-b`) present; priority labels only allowed set.
- **API:** [`tests/ingest-status-api.test.ts`](tests/ingest-status-api.test.ts) extended for `indices[]` field (mocked Elastic).

#### Validation commands
```bash
npm run index:elastic   # requires Elastic creds locally
npm test
npm run build
```

#### Commit name
`expand elastic stadium operations seed data`

#### Stop condition
- Seed script creates all new indices with mappings (`dynamic: false`).
- Ingest status returns doc counts per index (or graceful empty when unconfigured).
- localStorage demo path untouched.

#### Rollback plan
Revert seed files and index script; delete new indices from cluster manually.

#### Out of scope
- Wiring Pull to Elastic (R3).
- Sentinel agent route (R4).
- Changing `/demo/intake` network behavior beyond optional status poll.

---

### R3 — Elastic-first Pull latest reports

#### Goal
**Pull latest reports** queries Elastic when configured; falls back to local demo pool.

#### User-visible behavior
- With Elastic + seed: Pull status reads e.g. `Latest reports pulled from Elastic (N incidents).`
- Without Elastic: unchanged `Latest demo reports pulled.`
- Source log records `sourceMode: "elastic"` vs `"demo"` with outcome.

#### Files likely touched
- [`components/dashboard/command-center.tsx`](components/dashboard/command-center.tsx)
- [`lib/command-state-normalizer.ts`](lib/command-state-normalizer.ts)
- [`lib/source-mode.ts`](lib/source-mode.ts)
- [`lib/source-audit.ts`](lib/source-audit.ts)
- [`lib/demo-incident-pool.ts`](lib/demo-incident-pool.ts) (fallback only)

#### New files likely created
- `app/api/ingest/pull/route.ts`
- `lib/elastic/pull.ts`
- `lib/elastic/normalize-pull.ts`
- `tests/elastic-pull.test.ts`
- `tests/ingest-pull-api.test.ts`

#### Data/API contracts
- See **§4** `POST /api/ingest/pull`.
- Normalizer: new `normalizeFromElasticPull()` → `NormalizedIngestionResult`.

#### Tests required
- **Unit:** `elastic-pull` maps `ElasticActiveIncident` → `IncidentPackage`; priority sort matches `PRIORITY_ORDER`.
- **Unit:** Fallback when Elastic empty/unconfigured returns demo batch shape.
- **API:** Mocked Elastic `_search` returns canned hits; 200 + packages.
- **E2E:** Fallback path unchanged (no env) — existing pull tests in [`e2e/demo-flow.spec.ts`](e2e/demo-flow.spec.ts).

#### Validation commands
```bash
npm test
npm run test:e2e
npm run build
# Manual: Pull with Elastic configured shows elastic source audit event
```

#### Commit name
`pull latest reports from elastic`

#### Stop condition
- Pull calls API when `NEXT_PUBLIC_ENABLE_ELASTIC_PULL !== "false"` and server Elastic configured.
- Fallback identical to pre-R3 when unconfigured.
- Rate limit preserved (2 pulls / 60s).

#### Rollback plan
Set `NEXT_PUBLIC_ENABLE_ELASTIC_PULL=false` or revert to client-only `handlePullLatestReports`.

#### Out of scope
- Sentinel agent route.
- Write-back loop.
- Removing localStorage batch persistence (keep for fallback).

---

### R4 — Real Sentinel agent route

#### Goal
Sentinel Ask becomes a visible Gemini/Agent Builder + Elastic retrieval surface.

#### User-visible behavior
- Ask Sentinel shows loading state, then answer with **evidence chips** and **recommended action**.
- When backend disabled or request fails: same UI, deterministic fallback answer (no error toast blocking demo).
- Meta line optional: `Retrieved from Elastic · Gemini live` vs `Local fallback`.

#### Files likely touched
- [`components/dashboard/sentinel-inline.tsx`](components/dashboard/sentinel-inline.tsx)
- [`lib/sentinel-command-agent.ts`](lib/sentinel-command-agent.ts) (fallback only)
- [`lib/agent/vertex.ts`](lib/agent/vertex.ts)
- [`lib/agent/gemini.ts`](lib/agent/gemini.ts)
- [`lib/elastic/search.ts`](lib/elastic/search.ts)
- [`lib/evidence.ts`](lib/evidence.ts)

#### New files likely created
- `app/api/sentinel/route.ts`
- `lib/agent/sentinel-agent.ts`
- `lib/agent/sentinel-prompt.ts`
- `lib/agent/sentinel-schema.ts`
- `lib/sentinel-agent-client.ts`
- `tests/sentinel-agent.test.ts`
- `tests/sentinel-api.test.ts`

#### Data/API contracts
- See **§4** `POST /api/sentinel`.

#### Tests required
- **Unit:** Response schema validation; fallback trigger when `AGENT_BACKEND_ENABLED=false`.
- **Unit:** Mocked Gemini + Elastic — citations present in response.
- **API:** Route tests with mocked `retrieveAgentContext` and `generateContent`.
- **E2E:** Fallback path — Ask still works without env ([`tests/sentinel-command-agent.test.ts`](tests/sentinel-command-agent.test.ts) patterns).

#### Validation commands
```bash
npm test
npm run test:e2e
npm run build
```

#### Commit name
`add sentinel agent route`

#### Stop condition
- `POST /api/sentinel` returns structured JSON per schema.
- `sentinel-inline.tsx` calls route when `AGENT_BACKEND_ENABLED` and client flag allow.
- `answerSentinelQuestion` remains fallback.

#### Rollback plan
Client flag `NEXT_PUBLIC_ENABLE_SENTINEL_AGENT=false` forces local Q&A only.

#### Out of scope
- Write-back (R4.5).
- Voice (R5).
- External Agent Builder deploy (documented separately in `docs/ELASTIC_BUILDER_MCP_SETUP.md`).

---

### R4.5 — Visible action / write-back loop

#### Goal
Approved dispatch actions persist to Elastic timeline/memory and appear in Source log — demo feels agentic, not chat-only.

#### User-visible behavior
- Operator approves checklist action (existing UX) **or** clicks **Apply Sentinel recommendation**.
- Confirmation step before write.
- Timeline panel + Source log show `elastic` write-back success.
- Without Elastic: existing React state + local source audit only.

#### Files likely touched
- [`components/dashboard/command-center.tsx`](components/dashboard/command-center.tsx)
- [`components/dashboard/active-incident-workspace.tsx`](components/dashboard/active-incident-workspace.tsx)
- [`lib/elastic/memory.ts`](lib/elastic/memory.ts)
- [`lib/source-audit.ts`](lib/source-audit.ts)
- [`app/api/report/route.ts`](app/api/report/route.ts) (may share write helpers)

#### New files likely created
- `app/api/timeline/write/route.ts`
- `lib/elastic/timeline-write.ts`
- `tests/timeline-write-api.test.ts`
- `tests/elastic-timeline-write.test.ts`

#### Data/API contracts
- See **§4** `POST /api/timeline/write`.

#### Tests required
- **Unit:** Write payload maps to `ElasticDispatchTimelineEntry` + `ElasticIncidentMemory`.
- **API:** Mocked `_bulk` — 200, non-throwing on timeout (mirror 2s memory timeout).
- **E2E:** Approve action updates timeline in UI; source audit event appended.

#### Validation commands
```bash
npm test
npm run build
# Manual: approve action → document in stadium_dispatch_timeline
```

#### Commit name
`add approved action writeback`

#### Stop condition
- Human approval required before any Elastic write.
- Write failures do not break UI (warn + local audit).
- `/api/report` behavior preserved for API consumers.

#### Rollback plan
Feature flag `ENABLE_ELASTIC_WRITEBACK=false` — local-only approve path.

#### Out of scope
- Autonomous dispatch without approval.
- Replacing deterministic parser.

---

### R5 — Voice-enabled Sentinel

#### Goal
Optional push-to-talk fills Sentinel input; same agent route as typed Ask.

#### User-visible behavior
- **Push-to-talk** button (flagged) captures speech → fills question input.
- User **reviews** text, clicks **Ask** (no auto-submit).
- Optional **Read aloud** for answer via `speechSynthesis`.
- Typed Ask + suggested questions remain primary.

#### Files likely touched
- [`components/dashboard/sentinel-inline.tsx`](components/dashboard/sentinel-inline.tsx)
- [`lib/sentinel-voice-shell.ts`](lib/sentinel-voice-shell.ts)

#### New files likely created
- `lib/sentinel-voice.ts`
- `tests/sentinel-voice.test.ts` (extend [`tests/sentinel-voice-shell.test.ts`](tests/sentinel-voice-shell.test.ts))

#### Data/API contracts
- `NEXT_PUBLIC_ENABLE_SENTINEL_VOICE: "true" | "false"` (default `"false"`).
- Uses same `POST /api/sentinel` as R4.

#### Tests required
- **Unit:** Mock `SpeechRecognition` — transcript fills input; does not auto-call submit.
- **E2E:** Skip voice tests in CI (documented).

#### Validation commands
```bash
npm test
npm run build
```

#### Commit name
`connect voice to sentinel ask`

#### Stop condition
- Voice flag off by default.
- Demo script does not require microphone.

#### Rollback plan
`NEXT_PUBLIC_ENABLE_SENTINEL_VOICE=false`.

#### Out of scope
- Implement before R2–R4.5 complete.
- Voice-only Sentinel mode.
- Server-side STT.

---

### R6 — Radio transcript reframing

#### Goal
Radio content supports Elastic evidence story; intake-bar extract demoted from primary hackathon flow.

#### Primary direction: **A + demote UI (hybrid)**

1. **Index** standard + restroom presets in `stadium_radio_transcripts` (seeded R2).
2. **Sentinel agent** retrieves transcript lines via Elastic search (R4).
3. **Demote** `RadioTranscriptPanel` behind `NEXT_PUBLIC_SHOW_RADIO_TRANSCRIPT=false` (default off).
4. Keep client extract in codebase for fallback/dev — not in hackathon script.

#### User-visible behavior
- Default: no “Add radio transcript” in intake bar.
- Sentinel answer to “What did the radio log add?” cites Elastic transcript docs when configured.
- Fallback: deterministic Sentinel still uses `latestTranscript` from localStorage if present.

#### Files likely touched
- [`components/dashboard/intake-context-bar.tsx`](components/dashboard/intake-context-bar.tsx)
- [`lib/radio-transcript-intake.ts`](lib/radio-transcript-intake.ts)
- [`lib/elastic/search.ts`](lib/elastic/search.ts)
- [`e2e/demo-flow.spec.ts`](e2e/demo-flow.spec.ts)
- [`docs/demo-recording-checklist.md`](docs/demo-recording-checklist.md) (note fallback only)

#### New files likely created
- `lib/elastic/transcript-search.ts` (optional)
- `tests/elastic-transcript-search.test.ts`

#### Data/API contracts
- `ElasticRadioTranscript` (§3).
- Feature flag: `NEXT_PUBLIC_SHOW_RADIO_TRANSCRIPT`.

#### Tests required
- **Unit:** Seed transcript docs searchable; Sentinel retrieval includes radio citation.
- **E2E:** Transcript panel hidden by default; optional suite with flag on.

#### Validation commands
```bash
npm test
npm run test:e2e
```

#### Commit name
`reframe radio transcripts as elastic evidence`

#### Stop condition
- Hackathon script does not use client extract as primary beat.
- Agent can cite seeded transcript when asked.

#### Rollback plan
`NEXT_PUBLIC_SHOW_RADIO_TRANSCRIPT=true` restores intake bar panel.

#### Out of scope
- Real-time radio streaming ingestion.
- Replacing all transcript tests — update, do not delete fallback coverage.

---

### R7 — Real-demo verification and submission script

#### Goal
Ship verification harness + hackathon demo script + Devpost talking points.

#### User-visible behavior
- N/A (docs + scripts).

#### Files likely touched
- [`docs/INGESTION_DEPLOY_CHECKLIST.md`](docs/INGESTION_DEPLOY_CHECKLIST.md)
- [`README.md`](../README.md)

#### New files likely created
- `docs/real-demo-script.md`
- `docs/devpost-talking-points.md`
- `scripts/verify-real-demo.mjs`
- `tests/real-demo-smoke.test.ts` (optional lightweight)

#### Data/API contracts
- Smoke script checks: ingest status indices, pull fallback, sentinel fallback, build exit 0.

#### Tests required
- **Full:** `npm test`, `npm run test:e2e`, `npm run build`
- **Smoke:** `node scripts/verify-real-demo.mjs` (no real creds required for fallback checks)

#### Validation commands
```bash
npm test
npm run test:e2e
npm run build
npm run start   # manual smoke
node scripts/verify-real-demo.mjs
```

#### Commit name
`add real demo verification script`

#### Stop condition
- All CI tests pass without Elastic/Gemini creds.
- Real demo script covers Elastic + agent + write-back + fallback.
- No forbidden wording in script.

#### Rollback plan
Revert script commits; recording checklist remains fallback doc.

#### Out of scope
- Committing `artifacts/` or `test-results/`.
- Production credential setup in repo.

---

## 3. Data contracts

All Elastic documents include `searchText: string` for indexing (computed at seed time).
Priority fields use `PriorityLevel` only: `"Immediate" | "High" | "Moderate" | "Monitor"`.

### `ElasticActiveIncident` — index `stadium_active_incidents`

```typescript
type ElasticActiveIncident = {
  id: string;                    // required — e.g. "incident-gate-b"
  title: string;                 // required
  rawText: string;               // required — messy source line
  category: IncidentCategory;    // required — crowd-flow | facility-outage | guest-assistance
  incidentType: IncidentType;    // required
  priority: PriorityLevel;       // required
  locationId: string;            // required
  locationLabel: string;         // required
  assignedRole: string;          // required — team name
  status: IncidentStatus;        // required — new | ready | actioned
  reportedAt: string;            // required — ISO-8601
  evidenceIds?: string[];        // optional — links to stadium_evidence
  guestAssistanceId?: string;    // optional — links to stadium_guest_assistance
  facilityStatusId?: string;     // optional — links to stadium_facility_status
  searchText: string;            // required
};
```

**Maps to `IncidentPackage`:** `id/title/rawText/category/incidentType/priority/locationId/locationLabel/assignedRole/status` → `Incident`; evidence resolved via `evidenceIds` → `EvidenceResult[]`; `staffUpdate` from roster/policy retrieval or template.

**Maps to `TimelineEntry`:** seed `reportedAt` → initial `{ type: "reported", incidentId: id, message: rawText, actor: "System" }`.

---

### `ElasticGuestAssistanceRequest` — index `stadium_guest_assistance`

```typescript
type ElasticGuestAssistanceRequest = {
  id: string;                    // required
  guestLocation: string;         // required — e.g. "Section 112"
  need: string;                  // required
  priority: PriorityLevel;       // required
  relatedIncidentId: string;     // required — e.g. "incident-section-112"
  locationId: string;            // required
  status: "open" | "assigned" | "resolved";  // required
  requestedAt: string;           // required — ISO-8601
  assignedRole?: string;         // optional
  searchText: string;            // required
};
```

**Demo role:** Sentinel cites why guest-assistance incident is Immediate; enriches evidence feed.

---

### `ElasticFacilityStatus` — index `stadium_facility_status`

```typescript
type ElasticFacilityStatus = {
  id: string;                    // required — e.g. "facility-elevator-4"
  assetId: string;               // required — e.g. "elevator-4"
  assetLabel: string;            // required
  status: "operational" | "degraded" | "down";  // required
  relatedIncidentId?: string;  // optional — e.g. "incident-elevator-4"
  locationId: string;            // required
  lastCheckedAt: string;         // required — ISO-8601
  notes?: string;                // optional
  searchText: string;            // required
};
```

**Demo role:** Facilities outage context for elevator incident; Pull enrichment.

---

### `ElasticGateFlowLog` — index `stadium_gate_flow_logs`

```typescript
type ElasticGateFlowLog = {
  id: string;                    // required
  gateId: string;                // required — e.g. "gate-b"
  gateLabel: string;             // required
  observation: string;           // required
  priority: PriorityLevel;       // required — ops urgency of log line
  relatedIncidentId?: string;    // optional — e.g. "incident-gate-b"
  loggedAt: string;              // required — ISO-8601
  source: "radio_log" | "sensor" | "staff_note";  // required
  searchText: string;            // required
};
```

**Demo role:** Crowd-flow evidence for gate incident; Sentinel citations.

---

### `ElasticStaffRosterEntry` — index `stadium_staff_roster`

```typescript
type ElasticStaffRosterEntry = {
  id: string;                    // required
  roleId: string;                // required
  team: string;                  // required — Guest Services | Security | Facilities
  callSign: string;              // required — e.g. "GS-1"
  displayName: string;           // required
  onDuty: boolean;               // required
  zone?: string;                 // optional
  relatedIncidentIds?: string[]; // optional
  searchText: string;            // required
};
```

**Demo role:** Agent recommends who to contact; maps to `Incident.assignedRole`.

---

### `ElasticPolicyDocument` — index `stadium_policies`

```typescript
type ElasticPolicyDocument = {
  id: string;                    // required
  title: string;                 // required
  excerpt: string;               // required
  body: string;                  // required
  appliesToCategories: IncidentCategory[];  // required
  procedureType?: string;        // optional
  teams?: string[];              // optional
  searchText: string;            // required
};
```

**Demo role:** Grounds recommended actions; maps to `EvidenceResult` with `sourceType: "policy"`.

---

### `ElasticRadioTranscript` — index `stadium_radio_transcripts`

```typescript
type ElasticRadioTranscript = {
  id: string;                    // required
  presetId?: string;             // optional — e.g. "standard-ops"
  label: string;                 // required
  lines: string[];               // required
  excerpt: string;               // required
  recordedAt: string;            // required — ISO-8601
  matchedIncidentHints: string[];  // required — location/team tokens
  relatedIncidentIds?: string[]; // optional
  searchText: string;            // required
};
```

**Demo role:** Replaces client-only transcript as indexed source; Sentinel cites `lines[]`.

---

### `ElasticDispatchTimelineEntry` — index `stadium_dispatch_timeline`

```typescript
type ElasticDispatchTimelineEntry = {
  id: string;                    // required — uuid or deterministic key
  incidentId: string;            // required
  timestamp: string;             // required — ISO-8601
  type: TimelineEntryType;       // required — reported | suggested | approved
  message: string;               // required
  actor: string;                 // required
  source: "operator" | "sentinel" | "system";  // required
  recommendedActionId?: string;  // optional — links Sentinel recommendation
  searchText?: string;           // optional
};
```

**Maps to `TimelineEntry`:** direct field mapping for UI timeline panel.

---

### `ElasticIncidentMemory` — index `stadium_incident_memory`

```typescript
type ElasticIncidentMemory = {
  timestamp: string;             // required — ISO-8601
  incidentId: string;            // required
  title: string;                 // required
  locationId: string;            // required
  locationLabel: string;         // required
  team: string;                  // required
  priority: PriorityLevel;       // required
  status: string;                // required
  summary: string;               // required
  approvedActionIds: string[];   // required
  evidenceRefs: string[];        // required
  source: string;                // required — e.g. "timeline_write_route"
};
```

**Aligns with existing** `StadiumIncidentMemoryDocument` in [`lib/types.ts`](lib/types.ts). Used for bounded ES\|QL and post-action memory.

---

## 4. API contracts

**Global rule:** Elastic is **never required for page load**. All routes must return fallback-friendly responses or allow client to use local path.

---

### `GET /api/ingest/status`

| | |
|--|--|
| **Purpose** | Report demo fallback availability, Elastic config, and per-index seed health |
| **Elastic required** | No |

**Response (extended in R2):**

```typescript
type IngestStatusResponse = {
  demoFallbackAvailable: boolean;       // always true
  elasticConfigured: boolean;
  activePath: "demo-local" | "elastic-ready" | "elastic-unavailable";
  statusLine: string;
  detailLine: string;
  seedHealth?: {
    ready: boolean;                     // all required indices meet min doc count
    indices: Array<{
      name: string;
      envKey: string;
      documentCount: number | null;     // null if cluster unreachable
      minimumRequired: number;
      exists: boolean;
    }>;
  };
};
```

**Fallback:** When unconfigured, `seedHealth` omitted or all counts null; `activePath: "elastic-unavailable"`.

**Errors:** Always 200 with descriptive lines — never block page load.

**Tests:** [`tests/ingest-status-api.test.ts`](tests/ingest-status-api.test.ts)

---

### `POST /api/ingest/pull`

| | |
|--|--|
| **Purpose** | Fetch latest active incidents from Elastic and return normalized command state slice |
| **Elastic required** | No — falls back to demo pool |

**Request:**

```typescript
type IngestPullRequest = {
  includeTimeline?: boolean;            // default true
  transcriptContext?: boolean;          // default false until R6
};
```

**Response:**

```typescript
type IngestPullResponse = {
  sourceMode: "elastic" | "demo";
  outcome: "success" | "fallback";
  ingestionSummary: string;
  incidentPackages: IncidentPackage[];
  timeline: TimelineEntry[];
  reportSummary: ReportSummary;
  meta: {
    pulledAt: string;
    incidentCount: number;
    elasticQuery?: string;              // observability only
  };
};
```

**Fallback behavior:**
1. If `!isElasticConfigured()` → server synthesizes demo batch (same ids/priorities as `DEMO_INCIDENT_POOL` sample).
2. If Elastic query returns 0 hits → same fallback.
3. Response `outcome: "fallback"` with `sourceMode: "demo"`.

**Error behavior:**
- Elastic timeout/error → 200 with fallback body, not 500.
- Malformed body → 400.

**Tests:** `tests/ingest-pull-api.test.ts`, `tests/elastic-pull.test.ts`

---

### `POST /api/sentinel`

| | |
|--|--|
| **Purpose** | Gemini/Agent Builder-backed Sentinel Q&A with Elastic retrieval |
| **Elastic required** | No — local evidence + deterministic fallback |

**Request:**

```typescript
type SentinelAskRequest = {
  question: string;                     // required
  incidentId: string;                   // required — selected incident
  context: {
    incidentPackage: IncidentPackage;     // required
    timeline: TimelineEntry[];            // required — filtered to incident
    queueTitles: string[];              // required — top N titles
    sourceMode: string | null;            // optional
    pullStatus: string | null;          // optional
  };
};
```

**Response:**

```typescript
type SentinelCitation = {
  sourceId: string;
  title: string;
  excerpt: string;
  index: string;                        // e.g. stadium_policies
};

type SentinelAskResponse = {
  answer: string;
  evidence: EvidenceResult[];
  recommendedAction: {
    label: string;                      // e.g. "Dispatch Guest Services to Section 112"
    actionIndex?: number;               // maps to checklist index if applicable
    rationale: string;
  } | null;
  citations: SentinelCitation[];
  meta: {
    retrievalMode: "elastic" | "local";
    geminiMode: "live" | "fallback";
    elasticMcpMode: "unused" | "external";  // external if Agent Builder MCP used
  };
};
```

**Fallback behavior:**
- `AGENT_BACKEND_ENABLED !== "true"` → 200 with `geminiMode: "fallback"`; client should use `answerSentinelQuestion` OR server returns precomputed template answer in same shape.
- Gemini/validation failure → same fallback shape.

**Error behavior:**
- Missing `question` or `incidentId` → 400.
- Never 500 on demo path — prefer fallback body.

**Tests:** `tests/sentinel-api.test.ts`, `tests/sentinel-agent.test.ts`

---

### `POST /api/timeline/write`

| | |
|--|--|
| **Purpose** | Persist operator-approved timeline entry + incident memory snapshot |
| **Elastic required** | No — local-only write updates React state path only |

**Request:**

```typescript
type TimelineWriteRequest = {
  incidentId: string;                   // required
  actionIndex: number;                  // required — checklist index
  actionLabel: string;                  // required
  actor: string;                        // default "Operations Lead"
  sentinelRecommendationId?: string;    // optional — from R4 response
  incidentPackage: IncidentPackage;     // required — post-approval snapshot
};
```

**Response:**

```typescript
type TimelineWriteResponse = {
  timelineEntry: TimelineEntry;
  memoryWritten: boolean;
  elasticWritten: boolean;
  sourceAuditSummary: string;
};
```

**Fallback behavior:**
- `!isElasticConfigured()` → `elasticWritten: false`; client appends timeline locally (existing `handleApprove` behavior).
- Elastic bulk failure → `elasticWritten: false`, 200, warn in `sourceAuditSummary`.

**Error behavior:**
- Missing required fields → 400.
- Elastic failure → 200 with `elasticWritten: false` (never break approve UX).

**Tests:** `tests/timeline-write-api.test.ts`, `tests/elastic-timeline-write.test.ts`

---

## 5. Environment variables

### Server-side (never expose to client)

| Variable | Default | Phase |
|----------|---------|-------|
| `ELASTICSEARCH_URL` | — | R2+ |
| `ELASTICSEARCH_API_KEY` / `ELASTIC_API_KEY` | — | R2+ |
| `ELASTICSEARCH_PLAYBOOKS_INDEX` | `stadium_playbooks` | existing |
| `ELASTICSEARCH_LOCATIONS_INDEX` | `stadium_locations` | existing |
| `ELASTICSEARCH_INCIDENT_EXAMPLES_INDEX` | `stadium_incident_examples` | existing |
| `ELASTICSEARCH_EVIDENCE_INDEX` | `stadium_evidence` | existing |
| `ELASTICSEARCH_ACTIVE_INCIDENTS_INDEX` | `stadium_active_incidents` | R2 |
| `ELASTICSEARCH_GUEST_ASSISTANCE_INDEX` | `stadium_guest_assistance` | R2 |
| `ELASTICSEARCH_FACILITY_STATUS_INDEX` | `stadium_facility_status` | R2 |
| `ELASTICSEARCH_GATE_FLOW_LOGS_INDEX` | `stadium_gate_flow_logs` | R2 |
| `ELASTICSEARCH_STAFF_ROSTER_INDEX` | `stadium_staff_roster` | R2 |
| `ELASTICSEARCH_POLICIES_INDEX` | `stadium_policies` | R2 |
| `ELASTICSEARCH_RADIO_TRANSCRIPTS_INDEX` | `stadium_radio_transcripts` | R2 |
| `ELASTICSEARCH_DISPATCH_TIMELINE_INDEX` | `stadium_dispatch_timeline` | R2 |
| `ELASTICSEARCH_INCIDENT_MEMORY_INDEX` | `stadium_incident_memory` | existing |
| `AGENT_BACKEND_ENABLED` | `false` | R4+ (`true` for real demo) |
| `GOOGLE_CLOUD_PROJECT` | — | R4+ |
| `GOOGLE_CLOUD_LOCATION` | — | R4+ |
| `VERTEX_MODEL` | `gemini-2.5-flash` | R4+ |
| `GOOGLE_APPLICATION_CREDENTIALS` | — | R4+ (or ADC) |
| `STADIUM_SENTINEL_BASE_URL` | — | MCP bridge only |

### Client-side feature flags

| Variable | Default | Phase |
|----------|---------|-------|
| `NEXT_PUBLIC_SHOW_VENUE_ORIENTATION` | `false` | R1 |
| `NEXT_PUBLIC_ENABLE_ELASTIC_PULL` | `true` | R3 |
| `NEXT_PUBLIC_ENABLE_SENTINEL_AGENT` | `true` | R4 |
| `NEXT_PUBLIC_ENABLE_SENTINEL_VOICE` | `false` | R5 |
| `NEXT_PUBLIC_SHOW_RADIO_TRANSCRIPT` | `false` | R6 |

### Constraints

- **App must load** with zero Elastic/Gemini env vars.
- **Tests must not** require real credentials (`NODE_ENV=test` forces local evidence path).
- **Real demo** requires configured Elastic + `AGENT_BACKEND_ENABLED=true` + Vertex credentials.
- **Never commit** `.env.local` or secrets.

---

## 6. Testing strategy

### Unit tests

| Area | Planned test file | Covers |
|------|-------------------|--------|
| Seed dataset shape | `tests/elastic-seed-dataset.test.ts` | JSON matches §3 types; canonical ids |
| Priority labels | `tests/elastic-seed-dataset.test.ts` | Only Immediate/High/Moderate/Monitor |
| Seed canonical incidents | `tests/elastic-seed-dataset.test.ts` | section-112, elevator-4, gate-b |
| Seed health | `tests/elastic-seed-health.test.ts` | min doc thresholds |
| Elastic pull normalizer | `tests/elastic-pull.test.ts` | ElasticActiveIncident → IncidentPackage |
| Pull fallback | `tests/elastic-pull.test.ts` | unconfigured → demo batch |
| Sentinel agent schema | `tests/sentinel-agent.test.ts` | response validation |
| Sentinel fallback | `tests/sentinel-agent.test.ts` | AGENT_BACKEND_ENABLED off |
| Write-back payload | `tests/elastic-timeline-write.test.ts` | timeline + memory docs |
| Voice wrapper | `tests/sentinel-voice.test.ts` | mock SpeechRecognition, no auto-submit |
| Feature flags | `tests/feature-flags.test.ts` (optional) | defaults |

**Existing tests to keep passing:** [`tests/ingestion-fallback.test.ts`](tests/ingestion-fallback.test.ts), [`tests/sentinel-command-agent.test.ts`](tests/sentinel-command-agent.test.ts), [`tests/command-state-normalizer.test.ts`](tests/command-state-normalizer.test.ts)

### API route tests

| Route | Test file | Strategy |
|-------|-----------|----------|
| `GET /api/ingest/status` | `tests/ingest-status-api.test.ts` | mock `elasticFetch` counts |
| `POST /api/ingest/pull` | `tests/ingest-pull-api.test.ts` | mock `_search` hits + fallback |
| `POST /api/sentinel` | `tests/sentinel-api.test.ts` | mock Gemini + Elastic |
| `POST /api/timeline/write` | `tests/timeline-write-api.test.ts` | mock `_bulk` |

### E2E tests

| Suite | Path | Notes |
|-------|------|-------|
| Fallback default | [`e2e/demo-flow.spec.ts`](e2e/demo-flow.spec.ts) | Must pass without env |
| Intake → pull | [`e2e/landing-intake-flow.spec.ts`](e2e/landing-intake-flow.spec.ts) | Unchanged fallback |
| Venue hidden | `e2e/demo-flow.spec.ts` | No `venue-orientation-section` when flag off |
| Elastic-on (optional) | `e2e/real-demo-elastic.spec.ts` (new, tagged) | Skip in CI without creds |
| Sentinel agent (mocked) | `e2e/real-demo-sentinel.spec.ts` (new, optional) | MSW or env flag |
| Forbidden wording | `e2e/demo-flow.spec.ts` | No Critical/Low/severity/confidence/score |

### Validation commands

```bash
npm test
npm run test:e2e
npm run build
node scripts/verify-real-demo.mjs    # after R7
```

---

## 7. Demo script requirements

Deliverable: [`docs/real-demo-script.md`](real-demo-script.md) (created in R7).

### Required beats (in order)

1. **Show Elastic readiness** — open `/command`; ingestion banner shows seed counts (after `npm run index:elastic`).
2. **Intake** — connect demo sources; mention seeded operations data (not live feed).
3. **Pull latest reports** — queue loads from Elastic; note priority sort (Immediate first).
4. **Select top incident** — workspace shows checklist, team, dispatch note.
5. **Ask Sentinel** — typed question e.g. “What evidence supports this?” or “What should I do first?”
6. **Show agent response** — answer + evidence/source snippets + recommended action.
7. **Approve action** — operator confirms; timeline updates.
8. **Show write-back** — Source log entry with elastic path; optional mention of dispatch timeline index.
9. **Fallback mention** (optional caption) — “Without credentials, same UI runs on local demo data.”

### Do not show

- Venue orientation (unless flag deliberately on)
- Client radio transcript extract as primary beat (R6)
- Voice unless optional tagged segment (R5)
- Process report drawer button (off-script)
- Forbidden priority wording
- CRM/ticketing framing

### Devpost talking points (R7)

- Seeded Elastic mock operations backend
- Gemini/Agent Builder reasoning on retrieved context
- Human-in-the-loop approval before write-back
- Deterministic fallback for reliability

---

## 8. Do not do

- Do **not** prioritize voice before R2–R4.5
- Do **not** rebuild UI around venue/map visualization
- Do **not** delete local fallback (`buildDemoState`, `DEMO_INCIDENT_POOL`, `answerSentinelQuestion`, localStorage)
- Do **not** make Elastic required for page load
- Do **not** fake “live ingestion” wording — say **seeded mock operations data**
- Do **not** use CRM or ticketing framing
- Do **not** remove typed Sentinel fallback
- Do **not** depend on live microphone for recorded demo
- Do **not** commit secrets or `.env.local`
- Do **not** use forbidden wording (Critical, Low, severity, confidence, score)
- Do **not** touch unrelated untracked files (`.agents/`, `artifacts/`, `code.html`, `screen.png`, `test-results/`)

---

## 9. First implementation slice

### Scope: **R1 + R2 only**

| Phase | Why first |
|-------|-----------|
| **R1** | Removes visual noise; prevents map-product confusion before demo recording |
| **R2** | Creates Elastic operations backend all later phases depend on |

### Explicitly deferred

- R3 — first moment Elastic becomes visible in **Pull**
- R4 / R4.5 — first moment system becomes **clearly agentic**
- R5 voice — later optional input modality
- R6 / R7 — after core loop works

### Exact first implementation prompt

```
Implement R1 and R2 from docs/real-demo-restructure-plan.md only.

R1: Add NEXT_PUBLIC_SHOW_VENUE_ORIENTATION defaulting to "false". Conditionally
render VenueOrientationPanel in active-incident-workspace.tsx. Gate e2e venue
tests in demo-flow.spec.ts when flag is off. Do not delete venue components or
unit tests.

R2: Add Elastic seed JSON files and index mappings per §3 Data Contracts.
Update scripts/index-elastic.mjs and lib/elastic/client.ts with new index env
vars. Add lib/elastic/seed-health.ts. Extend GET /api/ingest/status with
seedHealth.indices[]. Update .env.example. Add tests/elastic-seed-dataset.test.ts
and tests/elastic-seed-health.test.ts. Ensure canonical incidents
(incident-section-112, incident-elevator-4, incident-gate-b) are seeded with
valid priority labels only.

Do NOT wire Pull to Elastic (R3). Do NOT add POST /api/sentinel (R4). Do NOT
change voice or radio transcript UI. Keep all localStorage and buildDemoState
fallback paths unchanged.

Run npm test and npm run build before finishing.
```

---

## Phase tracking

| Phase | Status | Commit name |
|-------|--------|-------------|
| R1 | Not started | `hide venue orientation by default` |
| R2 | Not started | `expand elastic stadium operations seed data` |
| R3 | Not started | `pull latest reports from elastic` |
| R4 | Not started | `add sentinel agent route` |
| R4.5 | Not started | `add approved action writeback` |
| R5 | Not started | `connect voice to sentinel ask` |
| R6 | Not started | `reframe radio transcripts as elastic evidence` |
| R7 | Not started | `add real demo verification script` |

---

## Document map

| Document | Role |
|----------|------|
| **This file** | Active implementation spec |
| [`demo-recording-checklist.md`](demo-recording-checklist.md) | Fallback recording snapshot |
| [`INGESTION_DEPLOY_CHECKLIST.md`](INGESTION_DEPLOY_CHECKLIST.md) | Deploy constraints |
| [`STADIUM_SENTINEL_BUILD_PLAN.md`](STADIUM_SENTINEL_BUILD_PLAN.md) | Product rules |
| [`ELASTIC_BUILDER_MCP_SETUP.md`](ELASTIC_BUILDER_MCP_SETUP.md) | External MCP wiring |
| [`real-demo-script.md`](real-demo-script.md) | Created in R7 |
