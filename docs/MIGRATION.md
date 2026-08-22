# Migration Note — from the AI/Elastic Incident-Command Product

## What this repository used to be

Through commit `11bcd42` (August 2026), Stadium Sentinel was a hackathon-built **incident command center**: a Next.js app that pulled live incident packages from Elasticsearch "operational memory", enriched them with a Vertex AI/Gemini voice agent ("Sentinel"), drafted staff updates behind approval gates, and deployed to Google Cloud Run. A summary of that audit is preserved in [`AUDIT_REPORT.md`](AUDIT_REPORT.md).

## What it is now

The product direction changed to a **deterministic venue-flow and evacuation analysis engine**. The current repository has no runtime dependence on Elasticsearch, Vertex AI/Gemini, browser speech APIs, MCP artifacts, Cloud Run, or any API keys. Analysis is reproducible from local JSON inputs plus the engine version, with fingerprints pinning every result.

## Removed (with rationale)

| Old capability | Reason removed |
|---|---|
| Elasticsearch pull/bootstrap/write-back (`lib/elastic/**`, ingest APIs, seeding scripts) | External operational memory contradicts the deterministic, local-only contract |
| Vertex AI / Gemini agent + prompt/validation stack | No AI in the product; LLM output cannot be reproducible |
| Sentinel voice loop (Web Speech API) | Voice was the old interaction model, not an analysis capability |
| Incident/evidence/timeline domain models and command-center UI | Disjoint from venue-graph analysis; retrofit would have left dead abstractions everywhere |
| MCP proof artifacts, Devpost/demo docs, Cloud Build/Run config | Hackathon plumbing with hardcoded GCP project references |
| Playwright e2e specs | Bound exclusively to deleted surfaces |

Nothing from the old stack remains on any active code path.

## Salvaged

- Next.js 16 + React 19 + TypeScript strict + Tailwind 4 scaffolding and tooling choices.
- Vitest configuration patterns (path aliases, `server-only` stub approach — now unused but harmless).
- Design lessons: dark ops palette, IBM Plex fonts, accessible clickable-SVG marker pattern, and coordinate normalization ideas from the old venue-context schematic informed the new graph view.
- Test philosophy: pure-function, fast, logic-only suites.

## If you depended on the old product

The old incident-command behavior does not exist in this line of development. Its last state lives at commit `11bcd42` on GitHub if you need it. Environment variables from that era (`ELASTICSEARCH_*`, `AGENT_BACKEND_ENABLED`, `GOOGLE_CLOUD_*`, `VERTEX_MODEL`, all `NEXT_PUBLIC_*` flags) are gone; the new product needs none.
