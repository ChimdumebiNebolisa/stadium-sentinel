# Stadium Sentinel ES|QL MCP Bridge

Minimal MCP server that lets **Google Cloud Agent Platform** (or any MCP host) call Stadium Sentinel's bounded `/api/esql` endpoint without accepting raw ES|QL.

This bridge is **separate from the main Stadium Sentinel app**. It does not modify app behavior and is deployed as its own Cloud Run service when needed.

## Purpose

Phase 7 verification proved the chain:

**Agent Platform → MCP bridge → Stadium Sentinel `/api/esql` → Elasticsearch**

Managed Agents API does not provide a native HTTP/OpenAPI executor for custom `function` tools. This bridge exposes one MCP tool that performs the HTTP POST on behalf of the agent.

## Tool surface

**Single tool:** `stadium_incident_operations_esql`

**Input:** `operation` enum only (no raw ES|QL, no free-form query strings):

- `count_by_priority`
- `count_by_team`
- `recent_by_location`

**Behavior:**

1. Reject any `operation` outside the enum.
2. `POST` to `{STADIUM_SENTINEL_BASE_URL}/api/esql` with body `{"operation":"<enum>"}`.
3. Return the JSON response from Stadium Sentinel unchanged.

## Configuration

| Variable | Required | Description |
|----------|----------|-------------|
| `STADIUM_SENTINEL_BASE_URL` | Yes | Public base URL of the Stadium Sentinel Cloud Run service (no trailing slash). |
| `PORT` | No | HTTP listen port (default `8080`). |

No API keys or auth headers are stored in this service. The bridge only forwards enum-only requests to the public `/api/esql` route.

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/healthz` | Liveness check |
| `POST` | `/mcp` | MCP JSON-RPC (`initialize`, `tools/list`, `tools/call`) |

## Local run

```bash
cd mcp/esql-bridge
export STADIUM_SENTINEL_BASE_URL="https://your-stadium-sentinel-service.example"
npm start
```

Smoke test (replace host if not local):

```bash
curl -s -X POST http://127.0.0.1:8080/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"stadium_incident_operations_esql","arguments":{"operation":"count_by_priority"}}}'
```

## Cloud Run deploy (separate service)

Deploy from this directory as a **standalone** service (not the main `stadium-sentinel` app):

```bash
gcloud run deploy stadium-esql-mcp-bridge \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars STADIUM_SENTINEL_BASE_URL=https://your-stadium-sentinel-service.example
```

Register the service MCP URL (`https://<bridge-service>/mcp`) as an `mcp_server` tool in Google Cloud Agent Platform.

## Agent Platform wiring

In an interaction or agent config, add:

```json
{
  "type": "mcp_server",
  "name": "Stadium Sentinel ES|QL Bridge",
  "url": "https://<bridge-service>/mcp"
}
```

Example prompt for verification:

> How many incidents are in memory grouped by priority?

Expected: agent calls `stadium_incident_operations_esql` with `operation: count_by_priority`; response matches a direct `POST /api/esql` call with the same body.

## What this does not do

- Does not accept raw ES|QL or arbitrary SQL.
- Does not store secrets or credentials.
- Does not change the main Stadium Sentinel application.
- Does not replace Elastic MCP (Phase 6); it complements it for bounded HTTP API access.

## Related repo docs

- Tool schema: `lib/elastic/tools.ts` → `stadium_incident_operations_esql`
- Bounded API route: `app/api/esql/route.ts`
- External MCP setup: `docs/ELASTIC_BUILDER_MCP_SETUP.md`
