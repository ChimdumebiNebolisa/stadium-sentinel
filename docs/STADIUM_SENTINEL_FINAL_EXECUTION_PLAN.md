# Stadium Sentinel — Final Execution Plan

**Status:** Source of truth for implementation. Planning only — no code changes implied by this document.

**Purpose:** Single consolidated guide for Cursor and contributors. Replaces back-and-forth between the Elastic audit plan, the Sentinel voice plan, and the master execution order. Preserves guardrails and phase order; does not duplicate every table from the source plans.

**Location:** `docs/STADIUM_SENTINEL_FINAL_EXECUTION_PLAN.md` — same folder as `STADIUM_SENTINEL_BUILD_PLAN.md`, `INGESTION_DEPLOY_CHECKLIST.md`, and `real-demo-script.md`.

---

## 1. Project identity and hard constraints

### What Stadium Sentinel is

Stadium Sentinel helps stadium staff **understand and act on live incident updates during an event**. Operators pull operational data, review incidents, and use Sentinel (voice + guarded actions) to draft updates, reports, and handoffs grounded in incident context.

### What it is not

Do **not** frame the product as:

- A CRM or ticketing system
- An analytics dashboard or generic dashboard
- A map product or seat-map product

### Wording and labels

| Rule | Detail |
|------|--------|
| Priority terminology | Use **priority**, not **severity** |
| Allowed priority labels | **Immediate**, **High**, **Moderate**, **Monitor** only |
| Forbidden user-facing terms | Critical, Low, severity, confidence, score, numeric scoring, Venue map, Seat map |
| Numeric scoring | No numeric scoring language in UI or copy |

### Technical and demo honesty

| Rule | Detail |
|------|--------|
| MCP | Do **not** claim MCP is used in-app unless a real MCP runtime path is implemented, tested, and **demo-visible** in `/command` |
| Voice input | Sentinel remains **voice-only** — no fake type fallback unless a real typed input is implemented |
| Deployment | Do **not** use `gcloud run deploy --source .` |
| Redesign | No full command UI or landing redesign; light Sentinel orb/panel polish and inline landing proof lines only |
| Staff update copy | Never imply external broadcast (“sent to staff”, “notified the team”) — use incident-record / timeline language |

### Baseline commits (reference)

- `5291e3a` — Sentinel orb + landing polish
- `fc435af` — report phrasing fix (`formatIncidentReportPhrase` — no duplicate “report report”); **may not be live on Cloud Run until redeployed**

---

## 2. Final strategic decision

| Decision | Rationale |
|----------|-----------|
| **Elastic / data foundation first** | Four `locationId` mismatches and uneven cross-index links make voice and agentic answers wrong or thin. Integration is real; data graph and context assembly are the bottleneck. |
| **Sentinel voice and agentic behavior after trustworthy data** | Continuous loop and approval flows are high UX value but misleading if “who is handling?” or location answers are wrong. Wire retrieval (Phase 2) before or alongside voice; complete agentic capabilities (Phase 5) only after retrieval + voice loop. |
| **Landing stats cleanup late** | Cosmetic, no Elastic dependency; reduces merge conflict risk during command/voice work. |
| **MCP deferred** | Classification B — present in docs/bridge, not in-app runtime. Optional **external** proof only unless made real in-app. |
| **One production deploy** | Deploy once after Batches 1–7 pass full verification (Batch 8), not after every small change. Incremental commits per batch; single Cloud Run promotion when smoke-ready. |

**Dependency chain (summary):**

```
Data fixes/enrichment → re-index → retrieval/context → voice loop → stop/memory → agentic A–D → landing → tests/deploy/smoke → (optional external MCP)
```

---

## 3. Consolidated execution phases

### Phase 1: Elastic data fixes and enrichment

**Goal:** Correct location graph; enrich all 8 Elastic incidents with credible operational context (source records, operations updates, evidence, dispatch timeline seeds) without adding new incident IDs.

**Files likely involved:**

- `data/elastic/stadium_active_incidents.json`
- `data/elastic/stadium_guest_assistance.json`
- `data/elastic/stadium_evidence.json`
- `data/elastic/stadium_dispatch_timeline.json`
- `lib/incident-details-seed.ts`
- `lib/types.ts` (optional enriched detail types)

**Exact implementation tasks:**

1. Fix location mismatches (see Batch 1A).
2. Extend `INCIDENT_DETAILS_SEED` with enriched fields: source records, command-center notes, operations updates, staff field reports, media metadata, dispatch handoff (operational framing only — not CRM).
3. Add evidence index docs for incidents currently lacking `stadium_evidence` coverage.
4. Expand `stadium_dispatch_timeline.json` to cover all 8 incidents (static until Phase 2 read path).
5. Decide demo-pool-only incidents (`incident-freezer-alarm`, `incident-blocked-aisle`): promote to Elastic with enrichment or exclude from real-demo flow.

**Tests required:**

- Unit: fixture tests for `locationId`/`locationLabel` consistency per incident.
- Manual: seed JSON aligns with enrichment intent per incident (flagship: Gate B, Elevator 4, Section 112).

**Risks:**

- Scope creep (new incident IDs, CRM/ticket framing).
- Copy that implies ticketing or analytics.

**Stop condition:**

- All 8 active incidents have consistent locations and enriched `details` in TypeScript seed.
- Evidence and dispatch JSON updated on disk.

---

### Phase 2: Retrieval / context wiring

**Goal:** Pull and Sentinel paths surface data that exists in Elastic but is not assembled today (dispatch timeline, staff roster, enriched details, optional incident memory).

**Files likely involved:**

- `lib/elastic/pull.ts`, `lib/elastic/normalize-pull.ts`, `lib/elastic/pull-types.ts`
- `lib/elastic/bootstrap.ts`, `lib/elastic/seed-health.ts`
- `scripts/index-elastic-cli.ts`
- `lib/agent/sentinel-agent.ts`, `lib/agent/sentinel-prompt.ts`

**Exact implementation tasks:**

1. Re-index dev cluster (`npm run index:elastic`) after Phase 1.
2. Extend seed-health if needed (e.g. evidence counts).
3. **Read** `stadium_dispatch_timeline` on pull; merge into package timeline (not only `buildTimelineSeed()`).
4. Attach **staff roster** to `IncidentPackage` or Sentinel prompt assembly.
5. Optionally re-query `stadium_incident_memory` for “what was approved?” when incident selected.
6. Pass enriched `details` into `buildSentinelUserPrompt` with citation rules (source record IDs, call signs, media IDs — never “CRM” or “ticket”).

**Tests required:**

- Unit: `normalize-pull` with corrected locations; dispatch merge; roster attachment.
- Integration / real-demo checkpoint: bootstrap → pull → Sentinel answers “Who is handling?” and location questions for previously broken incidents.

**Risks:**

- Timeline ordering conflicts with `buildTimelineSeed()`.
- Prompt token bloat — keep excerpts bounded.

**Stop condition:**

- Pull returns 8 incidents with dispatch + roster where seeded.
- Sentinel Q&A grounded for location/assignment on all 8 (regression anchors: Gate B, Elevator 4, Section 112).

---

### Phase 3: Sentinel continuous voice loop

**Goal:** One **Ask Sentinel** click → intro TTS → auto-listen → answer → auto-listen for follow-ups without re-arming mic.

**Files likely involved:**

- `components/dashboard/command-center.tsx`
- `lib/sentinel-speech-output.ts`
- `components/dashboard/sentinel-inline.tsx` (state labels)

**Exact implementation tasks:**

1. Add `speakAndMaybeListen(text, { resumeListening })` wrapping `speakSentinelResponse` with `onEnd`.
2. Update `speakIfVoiceInitiated()` and all post-answer / post-action speak paths to call `onEnd: () => startSentinelVoice()` when `voiceInitiatedRef.current && sentinelOpen`.
3. After `action_proposed`, resume listening for approval phrases via same `onEnd` path.
4. Keep `voiceInitiatedRef` true until `closeSentinel()`; preserve incident-change reset.

**Tests required:**

- Unit: speak-helper resume callback when gated.
- E2e: question → mock answer → state `listening` without orb click.

**Risks:**

- TTS/STT state races — serialize with `sentinelUiStateRef` and existing debounce.

**Stop condition:**

- E2e continuous loop passes; manual follow-up without extra click in dev.

---

### Phase 4: Voice stop / session control and compact memory

**Goal:** Reliable session stop phrases; voice-only error copy; Ask Sentinel as sole session toggle; optional best-effort barge-in; last 2–3 Q/A exchanges in orb panel.

**Files likely involved:**

- `lib/sentinel-voice-phrases.ts`, `lib/sentinel-voice.ts`
- `components/dashboard/command-center.tsx`, `components/dashboard/sentinel-inline.tsx`
- `app/globals.css`

**Exact implementation tasks:**

**Session control and interruption (priority order — do not invert):**

1. Stable continuous loop (Phase 3) before barge-in experiments.
2. Post-TTS listen always via `onEnd`.
3. Best-effort mid-TTS barge-in only if it does not destabilize session; disable on browser errors.

**Stop phrases and copy:**

4. Expand stop phrases: `stop listening`, `alright i'm done`, `i'm done`, `we're done`, variants — all call `closeSentinel()`.
5. **Ask Sentinel** = only session-level start/stop; demote orb / interrupt link to a11y fallback.
6. Remove “Type instead”, “Type or retry”, typing references from visible UI (`sentinel-voice.ts`, `command-center.tsx`).
7. Thank-you / mic-check: auto-resume listening after local phrase TTS if session open.

**Compact memory:**

8. `sentinelExchanges: { question, answer, at }[]` max 3 in `command-center.tsx`.
9. Render in `sentinel-inline.tsx` (`You:` / `Sentinel:`, truncate ~120 chars); `data-testid="sentinel-exchange-history"`.

**Tests required:**

- Unit: stop phrases; error strings without typing references.
- E2e: stop phrase closes session; 2 exchanges visible; no forbidden typing copy; optional barge-in test must not fail suite if mock cannot simulate overlap.

**Risks:**

- Barge-in orphaning STT or racing `speaking`/`listening` — abandon mid-TTS listen on churn.

**Stop condition:**

- Stop phrases end full session; no visible typing fallback; exchange history fits 224px panel.

---

### Phase 5: Agentic draft / review / submit capabilities

**Goal:** Sentinel drafts and proposes; **never** submits, dispatches, writes back, or processes reports from casual conversation. Explicit approval required (voice or accessibility click).

**Files likely involved:**

- `lib/sentinel-voice-phrases.ts`
- `lib/sentinel-command-agent.ts`, `lib/sentinel-speech-output.ts`, `lib/action-plan.ts`
- `lib/sentinel-agent-client.ts`
- `components/dashboard/command-center.tsx`

**Exact implementation tasks:**

**Shared approval infrastructure (do first):**

1. `classifyApprovalPhrase()` / `classifyRejectionPhrase()` in `sentinel-voice-phrases.ts`.
2. Approval phrases **only** when `sentinelPendingAction` is non-null.
3. Strong phrases only: `approve`, `go ahead`, `send it`, `dispatch it`, `submit it`, `looks good`, `do it` — **not** bare `yes`/`ok`/`sure`.
4. Rejection clears pending, speaks brief confirmation, resumes listening.
5. Extend `sentinelPendingAction` with `spokenPreview`, `approvalKind`, `safeHandlerId` where needed.
6. Wire Gemini `recommendedAction` in `submitSentinelQuestion` when regex does not match → proposal with `requiresConfirmation: true`.
7. Pass `sentinelRecommendationId` into `handleApprove()` for write-back.

**A. Prepare staff update**

- Triggers: “prepare staff update”, “draft staff update”, etc.
- Action: `draft_staff_update`; `buildStaffUpdate()` + timeline/evidence enrichment.
- Approval → update client `staffUpdate`; `recordSourceAudit()`; timeline/source log entry.
- Success copy: **“Saved to the incident record.”** / **“Added to the incident timeline/source log.”**

**B. Prepare incident report**

- Triggers: “draft a report”, “prepare incident report”, etc.
- Draft: `setReport` + workspace report tab; `requiresConfirmation` when voice-initiated.
- **“submit it”** / **“process report”** required for `process_report` (warn: refreshes command board).

**C. Recommend next action**

- Propose first unapproved `recommendedActions[index]` with `buildSentinelExplanation()`.
- `resolveSafeApprovalHandler()` before `handleApprove(index)`; if unsafe → highlight workspace only, no fake completion.

**D. Dispatch handoff**

- Spoken + displayed `buildDispatchMessage()` preview; approval → `handleApprove()` + Elastic write with `sentinelRecommendationId`.

**Tests required:**

- Unit: approval ignored without pending; generic “yes” ignored; safe-handler mapping; `draft_staff_update`; `formatIncidentReportPhrase` regression.
- E2e: dispatch propose → “go ahead” → timeline; staff update → staff tab; casual “yes” during Q&A does not apply.

**Risks:**

- False-positive approval; unsafe `handleApprove` index; `process_report` queue replace surprise.

**Stop condition:**

- All four capabilities: draft → review → explicit approval; rejection path works; no broadcast wording for staff update.

---

### Phase 6: Landing stats narrative integration

**Goal:** Keep three credible proof points from `lib/landing-data.ts`; weave into section prose; remove standalone callout boxes. No new stats.

**Files likely involved:**

- `lib/landing-data.ts`
- `components/landing/landing-hero.tsx`, `components/landing/landing-sections.tsx`
- `app/globals.css`

**Exact implementation tasks:**

1. Move `heroAttendance` into hero subtext; `searchFriction` into Ask Sentinel section; `staffingPressure` into swimlane/capability lead-in.
2. Replace `.landing-proof-callout` with `.landing-proof-line` (inline text, source label, no card border).
3. Do not reintroduce removed stats (e.g. “124 incidents flagged”).

**Tests required:**

- E2e landing: no Technical Appendix; no MCP claims; `assertNoForbiddenWording()` on `/`.

**Risks:**

- Low — isolated from command center.

**Stop condition:**

- Proof lines adjacent to relevant sections; landing e2e green.

---

### Phase 7: Tests, deploy, production smoke

**Goal:** Full verification gate; single production deploy with correct build args; `fc435af`+ live; manual mic smoke on Cloud Run.

**Files likely involved:**

- `tests/*`, `e2e/demo-flow.spec.ts`, `e2e/real-demo-flow.spec.ts`, `e2e/landing-intake-flow.spec.ts`
- `cloudbuild.yaml` (create or update), `Dockerfile`
- `docs/INGESTION_DEPLOY_CHECKLIST.md`, `scripts/verify-real-demo.mjs`

**Exact implementation tasks:**

1. `npm run lint`, `npm test`, `npm run test:e2e`.
2. `REAL_DEMO_E2E=1 npm run test:e2e -- e2e/real-demo-flow.spec.ts` when Elastic + Vertex env available.
3. `npm run verify:real-demo`, `npm run build`.
4. Inspect deploy pattern; create/update `cloudbuild.yaml` with explicit Docker `--build-arg` (see §6).
5. Build image; deploy prebuilt image to Cloud Run.
6. Confirm deployed image includes `fc435af` or later (tag or build metadata).
7. Run final smoke checklist (§7).

**Tests required:** Full automated suite + manual production mic smoke (record pass/partial/fail).

**Risks:**

- Production Web Speech API differs from e2e mocks; missing `NEXT_PUBLIC_*` at build time.

**Stop condition:**

- All go/no-go criteria for Batch 8 met; smoke checklist ≥ acceptable threshold (barge-in step may be partial).

---

### Optional Phase 8: External MCP proof

**Goal:** Hackathon / appendix demo only — not visible inside `/command`.

**Files likely involved:**

- `mcp/esql-bridge/server.mjs`
- `docs/ELASTIC_BUILDER_MCP_SETUP.md`
- `artifacts/phase7-esql-mcp-bridge/`, `artifacts/verification-summary.md`

**Exact implementation tasks:**

1. Deploy bridge if needed; run Agent Platform + `phase7-verify.mjs`.
2. Record side-by-side: in-app Sentinel (direct Elastic) vs external agent (MCP).
3. **No** landing or command UI MCP copy.

**Stop condition:** External verify script passes; main app unchanged and undeployed for MCP-only changes.

---

## 4. Cursor-safe implementation batches

Each batch is independently testable and **commit-ready**. Do not deploy until Batch 8.

---

### Batch 1A: Location ID fixes only

| Field | Detail |
|-------|--------|
| **Scope** | Fix `locationId`/`locationLabel` mismatches only — no enrichment yet |
| **Files** | `data/elastic/stadium_active_incidents.json`, `data/elastic/stadium_guest_assistance.json` |
| **Fixes** | `incident-aisle-spill` → `section-204`; `incident-lost-child` → North Gate / east screening narrative; `incident-north-concourse` → `north-concourse`; `incident-medical-assist` → `section-318`; `assist-medical-318-1` → `section-318` |
| **What not to touch** | Voice, command-center, landing, pull logic, MCP bridge |
| **Tests** | Unit fixture test: each incident `locationId` matches `locationLabel` narrative |
| **Go/no-go** | All 8 incidents pass location consistency check; `npm test` green for new tests |
| **Expected commit summary** | `fix(elastic): align locationId with locationLabel for four incidents` |

---

### Batch 1B: Enriched seed data

| Field | Detail |
|-------|--------|
| **Scope** | Extend seeds per incident enrichment plan (source records, ops updates, evidence, dispatch timeline, media metadata) |
| **Files** | `lib/incident-details-seed.ts`, `data/elastic/stadium_evidence.json`, `data/elastic/stadium_dispatch_timeline.json`, `lib/types.ts` (if needed) |
| **What not to touch** | Pull normalization, voice loop, landing, deploy config |
| **Tests** | Unit: enriched fields present for all 8 incidents; no forbidden CRM/ticket wording in seed strings |
| **Go/no-go** | Seed files complete; flagship incidents (Gate B, Elevator 4, Section 112) have evidence + dispatch entries |
| **Expected commit summary** | `feat(data): enrich incident seeds with operational context for all eight incidents` |

---

### Batch 2: Re-index + seed health

| Field | Detail |
|-------|--------|
| **Scope** | Bootstrap mappings if needed; re-index Elastic; expand seed-health checks |
| **Files** | `lib/elastic/bootstrap.ts`, `lib/elastic/seed-health.ts`, `scripts/index-elastic-cli.ts` |
| **What not to touch** | Voice, agentic handlers, landing |
| **Tests** | `GET /api/ingest/status` reports ready; pull returns 8 incidents after bootstrap |
| **Go/no-go** | Dev cluster indexed; seed-health minimums pass |
| **Expected commit summary** | `chore(elastic): re-index enriched seeds and extend seed-health checks` |

---

### Batch 3: Retrieval / context wiring

| Field | Detail |
|-------|--------|
| **Scope** | Read dispatch timeline on pull; attach staff roster; pass enriched details + citations into Sentinel prompt; optional memory read |
| **Files** | `lib/elastic/pull.ts`, `lib/elastic/normalize-pull.ts`, `lib/elastic/pull-types.ts`, `lib/agent/sentinel-agent.ts`, `lib/agent/sentinel-prompt.ts` |
| **What not to touch** | Voice loop, approval phrases, landing layout |
| **Tests** | Unit: normalize merge, roster helper; real-demo checkpoint Q&A on “who is handling?” / location |
| **Go/no-go** | Sentinel answers correct for previously broken locations; dispatch visible in package context |
| **Expected commit summary** | `feat(retrieval): wire dispatch timeline, staff roster, and enriched details into Sentinel context` |

---

### Batch 4: Voice loop + stop phrases + copy cleanup

| Field | Detail |
|-------|--------|
| **Scope** | `speakAndMaybeListen`; auto-resume after answers; stop phrases; Ask Sentinel session toggle; remove typing copy; optional best-effort barge-in |
| **Files** | `components/dashboard/command-center.tsx`, `lib/sentinel-voice-phrases.ts`, `lib/sentinel-voice.ts`, `lib/sentinel-speech-output.ts`, `components/dashboard/sentinel-inline.tsx` |
| **What not to touch** | Agentic action types, landing, Elastic seeds, deploy |
| **Tests** | Unit: stop phrases, error copy; e2e: continuous loop, stop session, no “Type instead” |
| **Go/no-go** | E2e loop + stop phrases pass; no “report report” in intro (`formatIncidentReportPhrase`) |
| **Expected commit summary** | `feat(sentinel): continuous voice loop, session stop phrases, and voice-only error copy` |

---

### Batch 5: Compact exchange memory

| Field | Detail |
|-------|--------|
| **Scope** | `sentinelExchanges` max 3; compact UI in orb panel |
| **Files** | `components/dashboard/command-center.tsx`, `components/dashboard/sentinel-inline.tsx`, `app/globals.css` |
| **What not to touch** | Approval infrastructure, landing, Elastic pull |
| **Tests** | E2e: two questions → two exchange rows; panel width unchanged |
| **Go/no-go** | `data-testid="sentinel-exchange-history"` shows max 3 pairs |
| **Expected commit summary** | `feat(sentinel): compact last-three exchange memory in orb panel` |

---

### Batch 6: Approval infrastructure + agentic A–D

| Field | Detail |
|-------|--------|
| **Scope** | Approval/rejection classifiers with pending gate; staff update, report, next action, dispatch; `recommendedAction` bridge |
| **Files** | `lib/sentinel-voice-phrases.ts`, `lib/sentinel-command-agent.ts`, `lib/sentinel-speech-output.ts`, `lib/action-plan.ts`, `lib/sentinel-agent-client.ts`, `components/dashboard/command-center.tsx` |
| **What not to touch** | Landing, deploy, MCP bridge, timeline write route (keep existing behavior) |
| **Tests** | Unit: pending gate, safe-handler, `draft_staff_update`; e2e: dispatch approval, staff update tab, casual “yes” ignored |
| **Go/no-go** | All four capabilities behind explicit approval; staff update uses incident-record copy only |
| **Expected commit summary** | `feat(sentinel): guarded voice approval for staff update, report, next action, and dispatch` |

---

### Batch 7: Landing stats narrative cleanup

| Field | Detail |
|-------|--------|
| **Scope** | Inline proof lines; remove callout boxes |
| **Files** | `lib/landing-data.ts`, `components/landing/landing-hero.tsx`, `components/landing/landing-sections.tsx`, `app/globals.css` |
| **What not to touch** | Command center, Elastic, voice logic |
| **Tests** | E2e landing: forbidden wording, no MCP, no Technical Appendix |
| **Go/no-go** | Three stats woven into narrative; no standalone stat cards |
| **Expected commit summary** | `refactor(landing): weave proof stats into section narrative` |

---

### Batch 8: Deploy config + full verification + production smoke

| Field | Detail |
|-------|--------|
| **Scope** | `cloudbuild.yaml`; full test suite; single Cloud Run deploy; manual mic smoke; fc435af verification |
| **Files** | `cloudbuild.yaml`, `Dockerfile`, `e2e/*`, `tests/*`, deploy docs |
| **What not to touch** | Feature logic unless smoke reveals blocker bugs |
| **Tests** | `npm run lint`, `npm test`, `npm run test:e2e`, `REAL_DEMO_E2E=1` (if env), `npm run build`, §7 smoke checklist |
| **Go/no-go** | All automated tests green; image tag includes `fc435af`+; smoke checklist passed or partial only on barge-in step |
| **Expected commit summary** | `chore(deploy): add Cloud Build config and verify production smoke` |

---

### Optional Batch 9: External MCP proof

| Field | Detail |
|-------|--------|
| **Scope** | Agent Platform + ES\|QL bridge verification; recorded demo — **no in-app changes** |
| **Files** | `mcp/esql-bridge/`, `docs/ELASTIC_BUILDER_MCP_SETUP.md`, artifacts only |
| **What not to touch** | `/command`, landing copy, `/api/sentinel` runtime |
| **Tests** | `phase7-verify.mjs`; manual Agent Platform prompt |
| **Go/no-go** | External agent answers ES\|QL question on recording; zero user-facing MCP claims added |
| **Expected commit summary** | `docs: add external MCP verification artifact` (or artifacts-only, no app commit) |

---

## 5. MCP decision

| Topic | Decision |
|-------|----------|
| **Current classification** | **B** — MCP is **not** an in-app runtime capability |
| **Evidence** | No in-app MCP client; no `@modelcontextprotocol` in app path; `elasticMcpMode` is `"unused"`; `/api/sentinel` uses direct Elastic `_search`; tool schemas in `lib/elastic/tools.ts` are documentation boundary only |
| **Current app behavior** | Direct Elastic retrieval and write paths (`pull`, `retrieveSentinelElasticContext`, `timeline-write`, `memory`) |
| **UI / copy** | Do **not** claim MCP in landing or command UI |
| **E2E guard** | `e2e/landing-intake-flow.spec.ts` asserts no “Elastic MCP” on landing — keep passing |
| **Optional external proof** | Agent Platform agent + `mcp/esql-bridge` → `/api/esql` (documented in `artifacts/verification-summary.md`) — side-by-side or recorded demo, not embedded in voice loop |
| **In-app MCP** | **Deferred** unless it can be made real, tested, and demo-visible in `/command` without destabilizing the main demo (estimated high effort and regression risk) |

---

## 6. Deployment rule

### Do not

- Use `gcloud run deploy --source .`

### Do

1. **Inspect** existing pattern: `Dockerfile` (six `NEXT_PUBLIC_*` as `ARG`/`ENV`), `docs/INGESTION_DEPLOY_CHECKLIST.md`, `README.md`.
2. **Create or update** `cloudbuild.yaml` if missing — pass Docker `--build-arg` explicitly at image build time (Next.js inlines `NEXT_PUBLIC_*` during `npm run build`).
3. **Build** image via Cloud Build (or equivalent prebuild pipeline).
4. **Deploy** prebuilt image to Cloud Run:

```bash
gcloud run deploy stadium-sentinel \
  --image us-central1-docker.pkg.dev/stadium-sentinel/cloud-run-source-deploy/stadium-sentinel:<tag> \
  --region us-central1 \
  --project stadium-sentinel
```

### Required build args

| Build arg | Value |
|-----------|-------|
| `NEXT_PUBLIC_REAL_DEMO_FLOW` | `true` |
| `NEXT_PUBLIC_ENABLE_ELASTIC_PULL` | `true` |
| `NEXT_PUBLIC_ENABLE_SENTINEL_AGENT` | `true` |
| `NEXT_PUBLIC_ENABLE_SENTINEL_VOICE` | `true` |
| `NEXT_PUBLIC_SHOW_VENUE_ORIENTATION` | `false` |
| `NEXT_PUBLIC_SHOW_RADIO_TRANSCRIPT` | `false` |

### Post-deploy verification

- `git rev-parse --short HEAD` matches image tag or build metadata.
- Confirm **`fc435af` or later** is in the deployed image (fixes “report report” intro duplication).

---

## 7. Final smoke checklist

Run on deployed Cloud Run URL (Chrome + microphone). Record **pass / partial / fail** per item. Partial acceptable only for mid-TTS barge-in if post-TTS listen works.

### Command center and data

- [ ] `/command` loads
- [ ] Connect / bootstrap works (`POST /api/ingest/bootstrap`)
- [ ] Pull returns Elastic incidents (8 when configured)
- [ ] Corrected locations appear for previously mismatched incidents (e.g. aisle spill → Section 204, medical → Section 318)

### Sentinel voice

- [ ] Click **Ask Sentinel** once — panel opens; intro speaks
- [ ] Intro has no **“report report”** duplication
- [ ] Browser mic permission prompt; grant permission
- [ ] After intro, state shows **Listening** without extra click
- [ ] Follow-up by voice (e.g. “what happened”) — answer spoken; returns to **Listening** without re-click
- [ ] **“stop listening”** or **“alright I'm done”** ends session
- [ ] Mic denied / unsupported browser — error mentions mic/permissions only; **no “type instead”** copy
- [ ] Speak during Sentinel TTS — if not interrupted mid-speech, listening resumes after TTS ends (partial OK)

### Agentic and write-back

- [ ] Staff update: draft → explicit approval → saved to incident record / timeline (no “broadcast” wording)
- [ ] Report: draft approval separate from **“submit it”** for process
- [ ] Next action: safe path approves; unsafe path highlights workspace without fake completion
- [ ] Dispatch: propose → approve → timeline / source log updates where applicable
- [ ] Casual **“yes”** during open Q&A does **not** trigger submit

### Landing and wording

- [ ] Landing `/` has no Technical Appendix
- [ ] Landing has no MCP claim
- [ ] Stats are narrative proof lines, not standalone bordered cards
- [ ] No forbidden wording: Critical, Low, severity, confidence, score, Venue map, Seat map
- [ ] Priority labels only: Immediate, High, Moderate, Monitor

### Automated gate (before manual smoke)

```bash
npm run lint
npm test
npm run test:e2e
REAL_DEMO_E2E=1 npm run test:e2e -- e2e/real-demo-flow.spec.ts   # when env available
npm run verify:real-demo
npm run build
```

---

## 8. Preservation notes

This document consolidates decisions from three supporting plans. For deep audit tables, incident-by-incident enrichment content, state diagrams, and file-by-file change maps, consult:

| Document | Path | Contents |
|----------|------|----------|
| Elastic / MCP / Synthetic Data Audit Plan | `.cursor/plans/` or user plans: `elastic_mcp_data_audit_0f38614e.plan.md` | Elastic architecture, index inventory, location bugs, enrichment model, MCP classification B, incident enrichment tables |
| Sentinel Voice & Agentic Capabilities Plan | `.cursor/plans/sentinel_voice_audit_plan_a69e47a9.plan.md` | Voice loop audit, barge-in policy, approval safety rules, agentic A–D design, state/event flow, production mic steps |
| Master Execution Order | Produced in prior session (reconciles both plans) | Dependency analysis, overlap deduplication, batch go/no-go synthesis |

**Related repo docs (operational, not superseded):**

- `docs/STADIUM_SENTINEL_BUILD_PLAN.md` — broader build context
- `docs/INGESTION_DEPLOY_CHECKLIST.md` — ingest/deploy steps
- `docs/ELASTIC_BUILDER_MCP_SETUP.md` — external MCP setup only
- `docs/demo-recording-checklist.md`, `docs/real-demo-script.md` — demo scripts

**When to update this document:** After a phase or batch ships, mark completion in commit messages; amend this file only when scope, order, or guardrails change — not for routine task tracking.

---

*Last updated: planning consolidation. No implementation performed by this document.*
