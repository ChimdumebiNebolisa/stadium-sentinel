# Stadium Sentinel — Baseline Audit and Salvage Analysis

- **Audit date:** 2026-08-21
- **Audited commit:** `11bcd426c94d8820503aad02bcd68b4038ef9603` (branch `main`, remote `origin/main`)
- **Working tree at audit time:** clean (no untracked or modified tracked files)
- **Audit mode:** read-only baseline audit per `ADVERSARIAL_CODEBASE_AUDIT_PROTOCOL.md`, authorized for teardown/rebuild afterward
- **Status:** **AUDIT COMPLETE WITH LIMITATIONS** (Playwright e2e suites not executed against a live dev server during the baseline pass; no external Elastic/Vertex environment was available, which is itself the point of the rebuild)

---

## 1. Executive verdict

The repository is a hackathon-built **AI incident-command center**, not an evacuation-analysis engine. Its core runtime promises (README "Features") are structurally dependent on two external services:

1. **Elasticsearch operational memory** — raw-`fetch` client, 14 indices, pull/write-back/bootstrap paths (`lib/elastic/*`, `app/api/ingest/*`, `app/api/timeline/write`).
2. **Google Vertex AI / Gemini** — hand-rolled JWT/ADC auth + REST generateContent (`lib/agent/vertex.ts`), gated behind `AGENT_BACKEND_ENABLED`.

Neither service is needed to *boot* the UI: a demo/local fallback layer keeps the app functional with zero configuration. That is good engineering for a demo and irrelevant to the locked product direction, which requires a deterministic venue-flow engine.

**Overall codebase risk for the new product direction: High** — not because the code is broken (it builds, 206 unit tests pass), but because ~70% of the active source implements capabilities the new product must not have, and the domain model (incidents, evidence, radio transcripts) shares nothing with the required model (venue graph, capacity, flow).

**Audit confidence: High** for the coupling map and salvage inventory; Medium for runtime behavior of credentialed paths (no Elastic/Vertex instance was available; behavior verified from code and mocked tests only).

### Top five risks in the baseline

| # | Risk | Evidence |
|---|------|----------|
| 1 | Product identity mismatch: README sells live incident command with voice AI; the rebuild contract is deterministic flow analysis | `README.md:28-56` |
| 2 | Hard dependency on Elasticsearch for the "operational memory" promise; `/api/esql` returns HTTP 500 without it | `lib/elastic/esql.ts:6-8`, route map §5 |
| 3 | Vertex/Gemini path with hand-rolled service-account JWT signing and metadata-server auth — large attack/maintenance surface for zero value in the new product | `lib/agent/vertex.ts:165-330` |
| 4 | Browser speech recognition as a headline capability (`Web Speech API`) — explicitly removed from scope | `lib/sentinel-voice.ts:47-59` |
| 5 | Cloud-only deployment assumptions baked into config and docs (Cloud Build → hardcoded Artifact Registry path, Cloud Run docs) | `cloudbuild.yaml:9`, `docs/INGESTION_DEPLOY_CHECKLIST.md` |

**Strongest counterargument to teardown:** the fallback architecture is genuinely well built — every route degrades locally, tests are logic-only and fast, and the venue schematic module contains reusable geometry utilities. **Assessment:** this saves maybe 10% of the migration effort. The domain models are disjoint; incremental retrofit would leave dead incident/Elastic abstractions throughout the UI layer. Teardown-with-salvage (as authorized) is cheaper than repair.

---

## 2. Repository state and census

- 225 tracked files; no submodules; no LFS; shallow clone not used.
- Toolchain observed on Windows 11 / win32: Node v24.14.1, npm 11.11.0, git 2.51.0.
- Stack: Next.js **16.2.7** (App Router, Turbopack default build), React 19.2.4, TypeScript 5.x strict, Tailwind CSS v4, Vitest 4, Playwright 1.60.
- Notably, `package.json` has **no SDK dependencies for Elastic or Vertex** — both integrations are hand-written HTTP clients. This makes removal mechanically simple.

### Coverage ledger (grouped; full file list via `git ls-files`)

| Path group | Files | Classification | Depth | Status |
|---|---:|---|---|---|
| `app/api/**` | 15 | Application source (server) | Full (route-by-route trace) | Inspected |
| `app/{page,layout,command,demo-intake,globals.css}` | 5 | Application source (UI shell) | Full | Inspected |
| `components/dashboard/**` | 27 | UI components | Structural review + spot reads | Partially inspected |
| `components/landing/**` | 9 | UI components | Structural review | Partially inspected |
| `lib/elastic/**` | 13 | Integration layer | Full | Inspected |
| `lib/agent/**` | 12 | Integration layer | Full | Inspected |
| `lib/*.ts` (domain/demo/voice/misc) | 45 | Domain logic | Role-level + spot reads of salvage candidates | Partially inspected |
| `lib/venue-schematic.ts` | 1 | Salvage candidate | Full | Inspected |
| `tests/**` | 44 | Test suites (206 tests) | All executed; winners read | Dynamically exercised |
| `e2e/**` | 5 | Playwright specs | Config reviewed; not executed | Partially inspected |
| `data/**` | 17 | Seed fixtures | Schema reviewed | Partially inspected |
| `scripts/**`, `mcp/esql-bridge/**` | 4 | Ops tooling | Full | Inspected |
| `artifacts/batch9-mcp-proof/**` | 5 | Historical proof artifact | Referential check only (no code imports) | Metadata only |
| `docs/**` | 6 | Documentation | Read | Inspected |
| Build/deploy/config (`Dockerfile`, `cloudbuild.yaml`, `.gcloudignore`, `.dockerignore`, `next.config.ts`, `eslint.config.mjs`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig.json`, `.env.example`) | 10 | Configuration | Full | Inspected |

Critical paths (API routes, elastic/agent layers, schematic engine) received full inspection. No critical path is marked metadata-only.

---

## 3. Product reconstruction

**What it claims (README):** live incident operations tool — Elastic-backed pull, enriched context, dispatch queue, venue-context schematic, Sentinel voice Q&A over Vertex Gemini, guarded approval write-back, Cloud Run production deploy.

**What it actually does (verified):**

- Boots fully offline into a deterministic demo mode; all client fetches are same-origin.
- With credentials set, pulls incidents/context from Elasticsearch across 13 indices and can write approved timeline/memory entries back via `_bulk`.
- With Vertex configured *and* `AGENT_BACKEND_ENABLED=true`, generates LLM answers/drafts; otherwise falls back to rule-based deterministic responses.
- Voice I/O is browser Web Speech API only (no cloud STT/TTS).
- `/api/esql` hard-fails (500) without Elastic; everything else degrades gracefully.

**Capability matrix (claim vs implementation):**

| Claim | Source | Implementation | Runtime evidence | Status |
|---|---|---|---|---|
| Elastic-backed pull | README:30 | `lib/elastic/pull.ts` (+ demo pool fallback) | Unit tests with mocked fetch; live path untested here | Verified (code) / unverified (live) |
| Voice agent w/ guarded approvals | README:37-39 | `lib/sentinel-*`, `app/api/sentinel/route.ts` | Fallback-path unit tests; browser-dependent | Partial |
| Approved write-back | README:39 | `lib/elastic/timeline-write.ts`, `memory.ts` | Mocked tests; silently skipped when unconfigured | Verified (code) |
| Venue Context schematic | README:34 | `components/dashboard/venue-context-card.tsx` + `lib/venue-schematic.ts` | Tests pass; static coordinates | Verified |
| Production Cloud Run deploy | README:40 | `cloudbuild.yaml`, `Dockerfile` | Not exercised in this environment | Unverifiable here |

**Hidden/undocumented behavior worth recording:**
- `NEXT_PUBLIC_*` flags are **build-time** inlined; changing them after deploy silently does nothing (documented in `.env.example` header, easy to miss).
- Write-back failures are logged-and-suppressed by design (2s timeout races); UI shows success with `elasticWritten:false`.
- GCP project ID and project number are hardcoded in committed artifacts (`cloudbuild.yaml:9`, `artifacts/batch9-mcp-proof/*`). No secret values found anywhere; only placeholder env templates are committed.

---

## 4. Architecture map (as found)

```
Browser ── same-origin /api/* ── Next.js server routes
                                   ├─ lib/agent/stadium-agent.ts ─┬─ lib/elastic/search.ts ──► Elasticsearch (fetch)
                                   │                              └─ lib/agent/vertex.ts ────► Vertex AI (REST+JWT)
                                   ├─ lib/agent/sentinel-agent.ts ┘ (same deps, voice Q&A)
                                   ├─ lib/elastic/pull.ts ────────► Elasticsearch
                                   ├─ lib/elastic/timeline-write/memory ─► Elasticsearch (_bulk)
                                   └─ lib/data.ts + lib/demo*.ts ◄─ data/*.json (local corpus)
Browser voice: Web Speech API (client-only)
Deploy: Dockerfile(standalone) → cloudbuild.yaml → Cloud Run
MCP bridge (mcp/esql-bridge) → proxies /api/esql — external proof artifact only
```

State ownership: incidents/timelines live in Elastic when configured, else in `localStorage`/hardcoded pools — two sources of truth reconciled only by feature flags. No database, no migrations.

Trust boundaries: single public web app; no auth anywhere; write-back endpoints are unauthenticated by design (acceptable for a hackathon demo, unacceptable for anything else, and moot after rebuild).

---

## 5. Verification results (baseline)

| Check | Command | Result | Notes |
|---|---|---|---|
| Install | `npm ci` | Pass | npm audit reports advisories (dev-toolchain level); not remediated pre-teardown |
| Unit tests | `npm test` | Pass — 43 files / 206 tests | All logic-only, node env, fast (~22s) |
| Lint | `npm run lint` | **Fail — 6 errors, 5 warnings** | Includes `react-hooks/set-state-in-effect` errors in dashboard components |
| Production build | `npm run build` | Pass | 20 routes compiled (Turbopack) |
| E2E | `npm run test:e2e` | Not executed | Requires dev-server run; flows target old product surfaces scheduled for deletion |

Interpretation: green tests + green build coexist with failing lint and with a product whose central claims depend on absent infrastructure. The test suite validates the *fallback* logic thoroughly and the *credentialed* logic only through mocks.

---

## 6. Findings relevant to the rebuild decision

| ID | Severity | Confidence | Finding |
|---|---|---|---|
| A-1 | High | High | Product identity is an AI/Elastic incident-command system; incompatible with locked direction. Removal targets enumerated in §7. |
| A-2 | High | High | `/api/esql` hard-fails without Elastic while every other route degrades — inconsistent failure semantics across one API surface (`lib/elastic/esql.ts:6-8`). |
| A-3 | Medium | High | Hand-rolled OAuth-JWT/metadata auth in `lib/agent/vertex.ts` re-implements what an SDK would own; high maintenance surface, zero value post-rebuild. |
| A-4 | Medium | High | Two sources of truth for operational state (Elastic vs localStorage/hardcoded pools) switched by build-time flags; behavior depends on build environment, not runtime config alone. |
| A-5 | Low | High | Baseline lint fails (6 errors). Pre-existing; noted so the rebuild's clean-lint gate is understood as a change. |
| A-6 | Informational | High | No secrets committed; ignore files correctly exclude env/credential files. |

No finding above justifies keeping the affected subsystems; each maps to a removal item in the rebuild authorization.

---

## 7. Removal list (authorized teardown scope)

Active-runtime removal targets, all verified reachable from routes/UI:

- `lib/elastic/**` (13 files), all `app/api/**` routes (15), `scripts/index-elastic*`, `mcp/esql-bridge/`
- `lib/agent/**` incl. `vertex.ts`/`gemini.ts`; Sentinel prompt/schema/validation stack
- `lib/sentinel-voice*.ts`, `lib/sentinel-speech-output.ts` (browser speech)
- Incident-domain libs that exist only to serve the old product (`incident-*`, `demo-agent-workflow`, `command-state-normalizer`, `radio-transcript-intake`, etc.)
- `cloudbuild.yaml`, `.gcloudignore`, Cloud Run instructions in docs; hardcoded AR path
- `artifacts/batch9-mcp-proof/`, Devpost/demo-recording docs
- Playwright e2e specs bound to deleted flows (Playwright dep removed with them)
- Old landing copy claiming voice-AI capability

## 8. Salvage list

| Asset | Disposition |
|---|---|
| Next.js 16 + React 19 + TS strict + Tailwind 4 scaffolding (`app/layout.tsx` pattern, `postcss.config.mjs`, `eslint.config.mjs`) | Keep as base |
| Vitest setup (`vitest.config.ts`, `@` alias, `server-only` stub pattern) | Keep |
| `lib/venue-schematic.ts` geometry ideas (`normalizeSchematicCoords`, label-placement scoring, viewBox discipline) + accessible clickable-SVG marker pattern from `venue-context-card.tsx` | Reimplemented in new graph viz (pattern-level salvage; old module is coupled to incident data and will be deleted) |
| Dark ops design tokens from `app/globals.css` (`:root` palette, panel/heading classes) | Adapted into new stylesheet |
| IBM Plex Sans/Mono font wiring | Keep |
| `data/locations.json` coordinate style (plane x/y 0–100) | Informs fixture coordinate convention |
| Test philosophy: pure-function, deterministic, no jsdom | Keep |

## 9. Residual unknowns

- Live-service behavior of credentialed paths (Elastic query shapes against a real cluster, Vertex token exchange end-to-end) was verified from code + mocked tests only. This does not block the rebuild; those paths are being removed.
- Playwright e2e behavior on the baseline was not exercised. The suites target surfaces being deleted; they are removed rather than preserved.

---

## 10. Consequence for Phase B–D

Proceed to rebuild per the locked product direction: a versioned local venue-graph + scenario-patch model; deterministic reachability, least-cost routing, max-flow/min-cut, time-step clearance simulation with conservation invariants; bottleneck ranking; failure-scenario generation; baseline/scenario comparison; analysis fingerprint; CLI + UI sharing one engine; known-answer and invariant tests; rewritten documentation with explicit model limitations and the analytical-software safety boundary.
