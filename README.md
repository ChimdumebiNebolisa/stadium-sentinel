# Stadium Sentinel

**Stadium Sentinel is a deterministic venue-flow and evacuation analysis engine.** It models a stadium or large venue as a capacity-constrained graph, evaluates routing and clearance scenarios, identifies bottlenecks and single points of failure, and compares operational changes using reproducible algorithms.

It runs entirely on your machine: **no AI, no LLMs, no model providers, no Elasticsearch, no Vertex AI, no cloud services, no API keys, no paid infrastructure.** Core analysis is reproducible from explicit local inputs plus the engine version, and every analysis carries a fingerprint that pins exactly those inputs.

> **Safety boundary:** Stadium Sentinel is analytical software for exploring scenarios under documented assumptions. It is **not** a certified life-safety system, an emergency command authority, or a substitute for professional crowd engineering, fire-code analysis, venue operations planning, or local emergency procedures. See [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md).

## Quick start

```bash
npm ci
npm test          # 71 known-answer / invariant tests
npm run build     # production build
npm run dev       # UI at http://localhost:3000
```

Headless analysis (same engine as the UI):

```bash
npm run sentinel -- validate fixtures/harborline-park.json
npm run sentinel -- analyze fixtures/harborline-park.json
npm run sentinel -- analyze fixtures/harborline-park.json --scenario fixtures/east-tunnel-closed.json
npm run sentinel -- compare fixtures/harborline-park.json - fixtures/east-tunnel-closed.json
npm run sentinel -- analyze fixtures/harborline-park.json --failures   # generated failure sweep
```

Add `--json` to any command for byte-stable structured output.

## What it computes

| Capability | Method |
|---|---|
| Reachability & isolation | Backward BFS from open exits |
| Least-cost routing | Reverse Dijkstra, deterministic lexicographic tie-breaking (`time` or `distance` metric) |
| Maximum theoretical throughput | Dinic max-flow with node-capacity splitting (people/minute) |
| Single points of failure | Residual min-cut + per-element removal criticality |
| Clearance estimation | Discrete-time queueing simulation with conservation and rate-cap invariants |
| Bottleneck ranking | Removal impact, saturation time, peak queues, utilization — explicit formulas |
| Scenario comparison | Field-by-field deltas: population, clearance, flow, exits, routes, cut sets |
| Reproducibility | SHA-256 fingerprint over canonicalized venue + scenario + config + engine version |

## The bundled demo fixture

`fixtures/harborline-park.json` is a clearly-labeled **synthetic** venue: 6 seating sections (7,500 people), a four-node concourse ring, four gates, stairs/ramp/checkpoint/refuge node types, and one deliberate bottleneck — an east tunnel rated at 300 people/min that serves ~4,200 people at baseline. Closing it reroutes three sections and changes both flow and clearance results. Two example scenario patches ship alongside it.

## Documentation

| Doc | Purpose |
|-----|---------|
| [docs/DESIGN.md](docs/DESIGN.md) | Implementation contract: model, algorithms, tie-breaking, output schema |
| [docs/VENUE_SCHEMA.md](docs/VENUE_SCHEMA.md) | Venue graph format (versioned) |
| [docs/SCENARIO_SCHEMA.md](docs/SCENARIO_SCHEMA.md) | Scenario patch format (versioned) |
| [docs/ALGORITHMS.md](docs/ALGORITHMS.md) | Algorithm choices, assumptions, formulas |
| [docs/DETERMINISM.md](docs/DETERMINISM.md) | Fingerprint definition and reproducibility guarantees |
| [docs/WALKTHROUGH.md](docs/WALKTHROUGH.md) | Sample CLI walkthrough of the demo fixture |
| [docs/TESTING.md](docs/TESTING.md) | Test methodology and invariant list |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Repository layout and UI/engine boundary |
| [docs/LIMITATIONS.md](docs/LIMITATIONS.md) | Model limits and safety boundary |
| [docs/MIGRATION.md](docs/MIGRATION.md) | Notes from the retired AI/Elastic incident-command product |
| [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md) | Baseline audit that motivated this rebuild |

## License

MIT.
