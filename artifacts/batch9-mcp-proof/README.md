# Batch 9 — External MCP Proof Artifact

**Verification date:** 2026-06-12  
**App checkpoint:** `55466d9` (deployed as Cloud Run revision `stadium-sentinel-00019-kjs`)  
**Production URL:** https://stadium-sentinel-726236175501.us-central1.run.app

This folder is **external proof only**. It does not change `/command`, landing copy, or `/api/sentinel` runtime.

---

## MCP status classification

| Scope | Classification | Status |
|-------|----------------|--------|
| **In-app** (`/command`, Sentinel, pull) | **B** — docs/bridge only, not runtime | Direct Elastic `_search` / ingest; `elasticMcpMode: "unused"` |
| **Bounded `/api/esql`** | Supporting API | Verified read-only (enum-only ops) |
| **ES\|QL MCP bridge** (`mcp/esql-bridge/`) | **C/D** — external path verified | Deployed `stadium-esql-mcp-bridge`; `tools/call` parity with direct API |
| **Google Agent Platform → bridge** | **D** — demo-usable | Agent `stadium-sentinel-elastic-mcp` completed ES\|QL tool call |
| **Elastic native MCP** | Historical (Phase 5–6) | Not re-run in this batch; see `artifacts/verification-summary.md` |

**Overall:** External MCP proof is **verified and demo-usable** for appendix/submission. The main app demo does **not** depend on MCP.

---

## What was inspected

| Path | Role |
|------|------|
| `mcp/esql-bridge/server.mjs` | MCP JSON-RPC bridge → `POST /api/esql` |
| `mcp/esql-bridge/README.md` | Deploy and Agent Platform wiring |
| `app/api/esql/route.ts` | Bounded ES\|QL HTTP route |
| `lib/elastic/esql.ts` | Enum → ES\|QL on `stadium_incident_memory` |
| `lib/elastic/tools.ts` | Tool schemas for external Agent Builder mapping |
| `docs/ELASTIC_BUILDER_MCP_SETUP.md` | External MCP setup guide |
| `artifacts/verification-summary.md` | Phase 5–7 historical proof |
| `artifacts/phase7-esql-mcp-bridge/phase7-verify.mjs` | Prior Agent Platform verifier |
| `artifacts/batch9-mcp-proof/batch9-verify.mjs` | Batch 9 read-only verifier |

---

## Proof status

| Check | Result |
|-------|--------|
| Direct `/api/esql` (3 ops + invalid guard) | **Verified** |
| MCP bridge `tools/list` + `tools/call` | **Verified** |
| Bridge ↔ direct API parity | **Verified** (`BRIDGE_DIRECT_PARITY=true`) |
| Agent Platform → bridge | **Verified** |
| Elastic native MCP re-verify | **Skipped** (Phase 6 artifact sufficient) |
| Main app redeploy for MCP | **Not performed** |
| In-app MCP claims added | **None** |

---

## Commands run (no secrets)

> Branch note: `main` is now the canonical branch. The historical push command below records the old `codex/ui-polish-command-center-fit` branch used for Batch 9; that Codex branch is obsolete and should not be used for new work.

```bash
# Pre-push verification (repo root)
npm test
npm run build
npx playwright test e2e/queue-completion.spec.ts
npx playwright test e2e/demo-flow.spec.ts --grep "venue context marker|marker|drawer|Ask Sentinel|completed"
npx playwright test e2e/landing-intake-flow.spec.ts
npm run test:e2e

# Push
git push -u origin codex/ui-polish-command-center-fit

# Deploy prebuilt image (tag = short SHA)
gcloud builds submit --config cloudbuild.yaml --substitutions=_TAG=55466d9 --project stadium-sentinel
gcloud run deploy stadium-sentinel \
  --image us-central1-docker.pkg.dev/stadium-sentinel/cloud-run-source-deploy/stadium-sentinel:55466d9 \
  --region us-central1 \
  --project stadium-sentinel

# Batch 9 read-only MCP verification
node artifacts/batch9-mcp-proof/batch9-verify.mjs
```

**Cloud Build ID:** `6f840bfe-23f0-4aeb-8b7f-844b1aceca82`  
**Image tag:** `55466d9`  
**Cloud Run revision:** `stadium-sentinel-00019-kjs`

Full verifier log: [`verification-output.txt`](verification-output.txt)

---

## External endpoints (public URLs only)

| Service | URL |
|---------|-----|
| Stadium Sentinel | `https://stadium-sentinel-726236175501.us-central1.run.app` |
| ES\|QL MCP bridge | `https://stadium-esql-mcp-bridge-7mbr5u6dja-uc.a.run.app/mcp` |
| Agent Platform agent | `stadium-sentinel-elastic-mcp` (project `stadium-sentinel`) |

Do not commit or paste API keys, Authorization headers, or MCP tokens.

---

## Safe vs unsafe claims

**Safe**

- Main app uses **direct Elastic** retrieval/write paths in `/command`.
- External Agent Platform can call a **separate MCP bridge** that invokes enum-only `/api/esql`.
- Tool schemas in `lib/elastic/tools.ts` document the bounded boundary.

**Do not claim**

- MCP is built into `/command`, Sentinel voice, or landing UI.
- Arbitrary ES\|QL is accepted.
- `stadium_context_search` is a live in-app HTTP route.

---

## Related files in this folder

- [`verification-results.md`](verification-results.md) — per-query results
- [`demo-script.md`](demo-script.md) — appendix recording narration
- [`batch9-verify.mjs`](batch9-verify.mjs) — repeatable read-only verifier
