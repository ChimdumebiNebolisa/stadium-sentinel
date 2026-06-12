# Batch 9 — Verification Results

**Run:** 2026-06-12T13:05:39Z  
**Verifier:** `node artifacts/batch9-mcp-proof/batch9-verify.mjs`  
**Log:** [`verification-output.txt`](verification-output.txt)  
**App deploy:** `55466d9` → revision `stadium-sentinel-00019-kjs`

---

## Summary

| Path | Result |
|------|--------|
| Direct `/api/esql` | **PASS** |
| MCP bridge | **PASS** |
| Agent Platform → bridge | **PASS** |

---

## 1. How many active incidents are in Elastic? (memory aggregations)

| Field | Value |
|-------|-------|
| **Prompt / query** | `{"operation":"count_by_priority"}` |
| **Tool / path** | Direct `POST /api/esql` |
| **HTTP** | 200 |
| **Result summary** | `Immediate`: 193 rows; `High`: 3 rows in `stadium_incident_memory` (aggregated memory index, not live 8-incident queue) |
| **Notes** | Live operational queue (8 incidents) comes from `POST /api/ingest/pull` — separate direct-Elastic path |

---

## 2. List Immediate priority incidents (bounded memory view)

| Field | Value |
|-------|-------|
| **Prompt / query** | Agent Platform: *"How many incidents are in memory grouped by priority?"* (verifier uses same `count_by_priority` op) |
| **Tool / path** | Agent `stadium-sentinel-elastic-mcp` → MCP bridge `stadium_incident_operations_esql` |
| **Interaction ID** | `ChA1NjkxNDY0NjlhZmVkMzAzEAgaATAqBG1haW4` |
| **HTTP / status** | Interaction `completed`; `AGENT_HAS_ESQL_TOOL=true`; `AGENT_HAS_COUNT_BY_PRIORITY=true` |
| **Result summary** | Agent invoked ES\|QL tool; counts include Immediate and High priority buckets |
| **Log reference** | `verification-output.txt` lines 19–26 |

---

## 3. Which incidents have dispatch timeline entries?

| Field | Value |
|-------|-------|
| **Prompt / query** | Not answerable via bounded `/api/esql` or ES\|QL bridge |
| **Tool / path** | Requires in-app pull (`stadium_dispatch_timeline` merge) or Elastic native MCP search |
| **Result summary** | **Out of bridge scope** — show in `/command` after pull (direct Elastic) |
| **Blocker notes** | By design: bridge exposes only `count_by_priority`, `count_by_team`, `recent_by_location` |

---

## 4. Which incidents reference media metadata?

| Field | Value |
|-------|-------|
| **Prompt / query** | Not answerable via bounded `/api/esql` |
| **Tool / path** | In-app enriched `details` on pull, or Elastic native MCP |
| **Result summary** | **Out of bridge scope** |
| **Blocker notes** | Phase 6 Elastic MCP evidence covers index/search; not re-run here |

---

## 5. Show operational memory entries for one incident

| Field | Value |
|-------|-------|
| **Prompt / query** | `{"operation":"recent_by_location"}` |
| **Tool / path** | Direct `POST /api/esql` |
| **HTTP** | 200 |
| **Result summary** | Recent rows include `incidentId`, `title`, `locationLabel`, `timestamp` from `stadium_incident_memory` |
| **Notes** | Truncated preview in log; read-only |

---

## MCP bridge path (Path B)

| Field | Value |
|-------|-------|
| **Endpoint** | `https://stadium-esql-mcp-bridge-7mbr5u6dja-uc.a.run.app/mcp` |
| **tools/list** | HTTP 200; tool: `stadium_incident_operations_esql` |
| **tools/call** | HTTP 200; `count_by_priority` payload |
| **Parity** | `BRIDGE_DIRECT_PARITY=true` (row order normalized) |
| **Log reference** | `verification-output.txt` lines 12–18 |

---

## Injection guard (negative test)

| Field | Value |
|-------|-------|
| **Query** | `{"operation":"DROP TABLE"}` |
| **Path** | Direct `POST /api/esql` |
| **HTTP** | 400 |
| **Body** | `Invalid ES|QL operation. Must be one of: count_by_priority, count_by_team, recent_by_location` |

---

## Production smoke (main app, direct Elastic)

Manual/browser checks on deployed `55466d9` (2026-06-12):

| Check | Result |
|-------|--------|
| `/command` loads | **Pass** |
| Connect + pull → 8 Elastic incidents | **Pass** |
| Corrected locations (East Screening, Section 112, Section 318) | **Pass** |
| 3 incident markers on venue schematic | **Pass** |
| Reference dots not clickable | **Pass** (5 refs, 0 `role=button`) |
| ACTIVE label present | **Pass** |
| Gate B label on schematic | **Pass** |
| Ask Sentinel opens; no `\breport report\b`; no "Type instead" | **Pass** |
| Landing: no Technical Appendix; no "Elastic MCP" | **Pass** |
| Queue completion ordering | **Not exercised** in browser smoke (covered by focused e2e) |

**Manual-only (mic):** not run in this session — requires operator with microphone.

---

## Skipped / not verified in this run

- Elastic native MCP (`platform_core_list_indices`, etc.) — historical proof in `artifacts/verification-summary.md`
- Dispatch timeline / media metadata via MCP — use in-app demo or Phase 6 native MCP
- Write operations to Elastic — intentionally excluded (read-only batch)
