# Elastic Agent Builder / MCP Setup Guide

The Stadium Sentinel repository provides native building blocks for the Rapid Agent Elastic track, but **it does not deploy an Elastic Agent Builder instance or an active MCP proxy server on its own.**

This distinction is important. The backend securely implements:
1. Contextual Retrieval queries (existing).
2. Append-only Incident Memory logging (`/api/report` -> `stadium_incident_memory`).
3. Bounded ES|QL operations (`/api/esql` endpoint securely preventing arbitrary query injection).

To complete the hackathon model, you must use an external AI development environment (like Elastic Agent Builder or a custom MCP host) and wire these capabilities utilizing the schemas provided.

## Provisioning Agent Builder

1. Ensure your `.env` contains:
   - `ELASTICSEARCH_URL`
   - `ELASTICSEARCH_API_KEY`
   - `ELASTICSEARCH_INCIDENT_MEMORY_INDEX`

2. Open the Elastic Cloud Console and enter the **Agent Builder** section.

3. Under your new Agent Builder bot, define it with instructions:
   > "You are an assistant for Stadium Sentinel. You have tools capable of performing context searches over playbooks and analyzing historic memory via constrained ES|QL enumerations."

4. Map the MCP Tools:
   Copy the schemas from `./lib/elastic/tools.ts`:
   - `stadium_context_search`
   - `stadium_incident_operations_esql`
   
   If your external MCP host requires explicit URLs for operation mapping, point `stadium_incident_operations_esql` to the externally reachable `POST /api/esql` address of the production application.

## Verification Checklist

Before claiming the implementation is active, verify the following manually:
- [ ] Memory Write Success: Resolving an incident in the UI results in a new JSON document populated automatically in the `stadium_incident_memory` Elastic index.
- [ ] Fallback Consistency: Taking Elastic offline still successfully finalizes the report via `/api/report` (verified via 2000ms bounding timeout logic).
- [ ] ES|QL Execution: Hitting `/api/esql` with `{ "operation": "count_by_priority" }` returns the expected payload.
- [ ] ES|QL Bounding: Attempting to pass `DROP TABLE` or arbitrary SQL into the `operation` field results in a standard HTTP 400 rejection from the API route.

Do not claim live integration with Agent Builder simply by running the `stadium-sentinel` frontend. The connection must be externally provisioned via these documented schemas.
