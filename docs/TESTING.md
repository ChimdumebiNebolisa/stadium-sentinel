# Testing Methodology

Run everything with `npm test` (Vitest, node environment, no jsdom). The suite is pure-logic and deterministic: no network, no filesystem fixtures beyond the repo, no timing sensitivity.

## Principles

1. **Known answers over vibes.** Every algorithm stage is pinned to hand-computed fixtures where the expected value is derivable with pencil and paper (series bottleneck = min capacity; 60 people/min at Δt=1s = exactly one person per step; SHA-256 FIPS vectors).
2. **Invariants as executable statements.** Properties that must hold for *all* inputs (conservation, rate caps, reachability monotonicity) are asserted either inside the engine (thrown on violation) or as property-style loops over every element of the demo fixture.
3. **Tie-breaking must be proven, not assumed.** The lexicographic tie-break test renames nodes so the geometrically identical situation flips its winner — demonstrating the rule, not an accident of layout.
4. **Regression pins on the shipped fixture.** Harborline Park results (routing assignments, max-flow 3500, per-exit splits, tunnel flow 4200, scenario deltas) are exact-valued tests; any engine change that alters results fails loudly here.
5. **Contract tests for the CLI.** The CLI is spawned as a real process; exit codes, diagnostics codes, JSON stability across runs, and comparison output are checked.

## Invariant checklist (mapped to tests)

| Required behavior | Test |
|---|---|
| Single origin / single exit | `routing.test.ts` — unique path & cost |
| Two equal paths → deterministic tie-break | `routing.test.ts` — lexicographic rule + rename flip |
| Disconnected origin | `routing.test.ts`, `validation.test.ts` |
| Zero/invalid throughput rejected | `validation.test.ts` (`E_ZERO_OR_NEGATIVE_CAPACITY`) |
| Bottleneck corridor | `harborline.test.ts` (east tunnel), `flow.test.ts` (series chain) |
| Two exits, asymmetric capacity | `flow.test.ts`, `simulate.test.ts` |
| Gate closure | `invariants.test.ts`, `harborline.test.ts`, `simulate.test.ts` |
| Corridor closure | `simulate.test.ts`, `routing.test.ts` |
| Capacity reduction | `simulate.test.ts`, `harborline.test.ts` |
| Cycles terminate correctly | `routing.test.ts` |
| Directed edges respected | `routing.test.ts`, `flow.test.ts` |
| Duplicate IDs rejected | `validation.test.ts` |
| Invalid edge reference rejected | `validation.test.ts` |
| Conservation of population | Engine asserts every step; `simulate.test.ts` verifies totals |
| No arc exceeds declared capacity | `simulate.test.ts` rate-cap check + engine credit arithmetic |
| No negative queue/flow | Engine throws; `simulate.test.ts` re-checks stats |
| Full evacuation when guaranteed | `simulate.test.ts` |
| Closing an edge never increases reachability | `invariants.test.ts` — loop over all edges and hub nodes |
| Max-flow known answers | `flow.test.ts` |
| Min-cut known answers | `flow.test.ts` |
| Fingerprint stability | `determinism.test.ts` |
| Byte-stable structured output | `determinism.test.ts`, `cli.test.ts` |

## Documented non-invariants

`invariants.test.ts` pins the fact that clearance time is **not** monotonic under closures (closing a constriction can speed up clearance). We assert the actual behavior instead of pretending a convenient law holds.

## What is not covered

- Browser rendering of the UI (manual smoke test only; the UI contains no analysis logic that could drift from tested engine outputs).
- Very large venues (thousands of nodes): correctness is size-independent by construction, but performance characteristics are unprofiled.
