# Stadium Sentinel — MCP Appendix Demo Script

**Duration:** ~3–4 minutes  
**Purpose:** Show MCP-based Elastic access works **externally**, separate from the in-app demo.

**Important:** The main app uses **direct Elastic** retrieval and write paths. Do **not** claim MCP is used inside `/command` or the Sentinel voice loop.

---

## Opening (10 sec)

> "Stadium Sentinel's command center uses direct Elastic retrieval for live incidents, evidence, and Sentinel voice. This appendix shows MCP-based Elastic access as an external proof — not what's running inside the app."

---

## Part A — In-app direct Elastic (~90 sec)

1. Open https://stadium-sentinel-726236175501.us-central1.run.app/demo/intake → **Connect operations data** → **Open command center**.
2. Click **Pull latest reports** → confirm 8 incidents and corrected locations (East Screening, Section 112, Section 318, Section 204).
3. Select an incident → show evidence, timeline, staff update drawer.
4. Show **Venue Context** schematic: 3 incident markers, Gate A/B labels, compact ACTIVE label.
5. Click **Ask Sentinel** → brief voice Q&A if mic available ("what happened?" / "who's on it?").
6. **Do not** mention MCP in this section.

**Narration:**

> "This is the production demo path: direct Elastic ingest, retrieval, and Sentinel on Cloud Run."

---

## Part B — Bounded `/api/esql` baseline (~30 sec)

Read-only terminal or API client:

```bash
curl -X POST "https://stadium-sentinel-726236175501.us-central1.run.app/api/esql" \
  -H "Content-Type: application/json" \
  -d '{"operation":"count_by_priority"}'
```

**Narration:**

> "The app exposes enum-only bounded ES|QL for external agents — no raw SQL."

Show Immediate / High counts from `stadium_incident_memory`.

---

## Part C — External MCP bridge (~45 sec)

**Option 1 — MCP `tools/call`:**

```bash
curl -X POST "https://stadium-esql-mcp-bridge-7mbr5u6dja-uc.a.run.app/mcp" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"stadium_incident_operations_esql","arguments":{"operation":"count_by_priority"}}}'
```

**Option 2 — Google Cloud Agent Platform:**

- Agent: `stadium-sentinel-elastic-mcp`
- Tool: MCP server → Stadium Sentinel ES|QL Bridge
- Prompt: *"How many incidents are in memory grouped by priority?"*

**Narration:**

> "Agent Platform calls our external MCP bridge, which forwards only allowed operations to `/api/esql`. Same numbers as the direct API call."

---

## Part D — Elastic native MCP (optional, ~30 sec)

If Elastic MCP console is available (Phase 6 setup):

- Prompt: *"List stadium indices"* or *"Search playbooks for crowd evacuation"*

**Narration:**

> "Separately, Elastic's native MCP tools can query the same cluster. That's external to the Stadium Sentinel app binary."

---

## Closing (15 sec)

> "Summary: the app runtime is direct Elastic. MCP is an external integration path — documented, bounded, and verified — for Agent Platform and Elastic Builder demos. It is not embedded in `/command`."

**Redact:** API keys, Authorization headers, MCP tokens.

---

## Suggested read-only prompts

| Prompt | Expected path |
|--------|----------------|
| How many incidents are in memory grouped by priority? | `stadium_incident_operations_esql` → `count_by_priority` |
| Which teams appear most in incident memory? | `count_by_team` |
| What are the most recent incident locations in memory? | `recent_by_location` |
| Dispatch timeline / media metadata on live incidents | **In-app `/command` after pull** (not ES\|QL bridge) |
| List stadium indices | Elastic native MCP (Phase 6) |

Do **not** run write operations in this appendix.
