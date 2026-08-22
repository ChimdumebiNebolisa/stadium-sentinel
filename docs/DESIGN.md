# Stadium Sentinel — Engine Design (Phase B)

This document is the implementation contract for the deterministic venue-flow analysis engine. Schema details are normative in [`VENUE_SCHEMA.md`](VENUE_SCHEMA.md) and [`SCENARIO_SCHEMA.md`](SCENARIO_SCHEMA.md); this document defines semantics, algorithms, tie-breaking, invariants, output shape, and the fingerprint.

- **Engine version:** `1.0.0` (constant `ENGINE_VERSION` in `engine/version.ts`)
- **Venue schema version:** `"1"`
- **Scenario schema version:** `"1"`

---

## 1. Domain model

### 1.1 Venue graph

A venue is a versioned JSON document with `nodes` and `edges`.

**Nodes.** Types: `section`, `concourse`, `corridor`, `stairwell`, `ramp`, `gate`, `checkpoint`, `refuge`.

- `gate` nodes are the only exits (derived, not a separate flag).
- `occupancy` (integer ≥ 0) declares the standing population at a node; occupied nodes are demand sources.
- `capacity` (optional integer > 0) is a stock limit on simultaneous occupants. When declared, `occupancy ≤ capacity` is a validation invariant.
- `x`, `y` are visualization coordinates in an arbitrary local plane (finite numbers only; no georeferencing is implied anywhere in the product).
- `accessible` marks accessibility at the node level.

**Edges.**

- `from`, `to` reference node IDs. `directed: false` (default) means traversable in both directions.
- Traversal basis: `distanceMeters` and/or `travelTimeSeconds`. At least one is required. Raw values are preserved; derived values are computed at load:
  - If `travelTimeSeconds` is absent, free-flow time = `distanceMeters / walkingSpeedMetersPerSecond` (config, default `1.2 m/s`).
  - If both are present, `travelTimeSeconds` governs time costs; distance remains available for the distance cost metric.
- `capacityPerMinute` (number > 0) is throughput through the edge entrance, per direction (see below). Zero/negative capacity is rejected at validation; removing an edge is expressed with `enabled: false` or a closure operation, never a zero capacity.
- `widthMeters` is optional provenance metadata. The engine does not derive capacity from width automatically; operators who want width-derived capacities compute and store them explicitly. (Documented non-feature; avoids hidden empirical formulas.)
- Undirected edges are modeled as two independent directed arcs, each carrying the full `capacityPerMinute`. **Assumption:** a corridor's declared capacity is available to each direction independently (pedestrian corridors are commonly operated bidirectionally). This is deliberately conservative-free and simple; it is documented, tested, and applied identically everywhere.

### 1.2 Scenario patches

A scenario is an ordered list of typed operations applied over the base venue. Scenarios never mutate the base model; `applyScenario(base, scenario)` returns a new effective model. Supported operations:

| Operation | Effect |
|---|---|
| `disableEdge` / `enableEdge` | Set `enabled` false/true on an edge |
| `setEdgeCapacity` | Replace `capacityPerMinute` |
| `scaleEdgeCapacity` | Multiply `capacityPerMinute` by `factor` |
| `setNodeOccupancy` | Replace node `occupancy` |
| `scaleNodeOccupancy` | Multiply `occupancy` by `factor`, rounded half-up to integer |
| `closeNode` / `openNode` | Node closed/open (closed nodes block traversal and, for gates, remove the exit) |

**Contradiction rule.** Within one scenario, at most one operation may target a given (entity, field) pair — e.g., one capacity op per edge, one open/close op per edge, one occupancy op per node, one open/close op per node. A second op touching the same pair is rejected as `E_CONTRADICTORY_OPERATIONS`. Operation order therefore never changes the outcome; it is preserved for transparency and hashed into the fingerprint.

All numeric arguments must be finite; capacities/factors must be > 0; occupancies must be ≥ 0 and ≤ the node `capacity` when one is declared. Unknown schema versions, unknown ops, and unknown entity references are rejected.

### 1.3 Internal graph

`buildAnalysisGraph(effectiveModel, config)` compiles the model to directed arcs:

- Each enabled edge yields a forward arc (and a backward arc when undirected).
- Arc cost = free-flow seconds (metric `time`) or meters (metric `distance`).
- Arc capacity = `capacityPerMinute` (rate, people/minute).
- Node-capacity modeling: a node with declared `capacity` is split into `in`/`out` halves joined by a capacity arc. **Assumption (units):** stock capacity is converted to a rate by assuming one full turnover of the node per minute, i.e., the split arc capacity is `capacity` people/minute-equivalent. This affects max-flow/min-cut only; routing uses plain travel times and the simulation enforces queueing physically. Nodes without `capacity` are unsplit and unconstrained.

---

## 2. Validation

`validateVenue(model)` and `validateScenario(base, scenario)` return ordered, deterministic diagnostic lists `{ code, message, path }`. Errors have codes prefixed `E_`; warnings `W_`.

Rejections include (non-exhaustive): unsupported schema version; duplicate node/edge IDs; unknown edge endpoints; negative or zero capacity on an edge; non-finite numbers anywhere numeric; invalid coordinates (non-finite x/y); impossible occupancy (`occupancy > capacity`, negative); zero/invalid throughput; contradictory scenario operations (§1.2); scenario references to unknown entities.

**Disconnected occupied sections.** An occupied node with no path to any exit produces `E_DISCONNECTED_OCCUPIED_SECTION` from `validateVenue` — such a model is refused by the `validate` command because it declares an impossible evacuation. However, `analyze` accepts the model and reports the situation structurally (isolated population, unreachable origins) rather than refusing, because quantifying the isolation *is* the analysis result. This asymmetry is deliberate and documented.

No malformed input is ever silently repaired.

---

## 3. Analysis capabilities

### 3.1 Reachability

Backward BFS over enabled arcs from all open exits. Every occupied node inherits the set of reachable exits. Isolated population = sum of occupancy over origins with zero reachable exits.

Monotonic invariant (tested): disabling any set of edges/nodes never increases the set of reachable pairs (origin, exit).

### 3.2 Routing (least-cost paths)

- Metric: `costMetric: "time"` (default; free-flow travel seconds, walking-speed based) or `"distance"` (meters). The active metric name and unit appear in every output. Free-flow means: no congestion, no queueing — this is a lower bound, not a forecast.
- One reverse Dijkstra runs from a virtual sink joined to all open exits with zero-cost arcs, yielding `dist[v]` = least cost from `v` to its best exit for all nodes in one pass.
- **Tie-breaking (deterministic):** distances are compared with exact equality on doubles produced by a fixed summation order; when multiple successors satisfy `dist[v] = cost(v,w) + dist[w]`, the lexicographically smallest node ID wins. Route reconstruction applies the same rule hop by hop, so equal-cost paths resolve identically on every run and platform.
- Per occupied origin, output records the assigned exit, cost, cost unit, and full node path.

Shortest-distance and least-time paths are different results; the engine never blends them, and the chosen metric labels every route.

### 3.3 Max-flow and min-cut

- Super-source connects to every occupied origin; the sink collects all open exits. Super-source arc capacities are set to a finite sentinel larger than any achievable flow, so the result is the **maximum sustainable egress rate of the network itself, in people/minute, independent of declared demand** ("maximum theoretical throughput").
- Algorithm: Dinic (level graph + blocking flow) over arcs in deterministic construction order. Capacities are integers-plus-fractions represented exactly as doubles; all additions/subtractions preserve integrality because inputs are finite decimals summed in fixed order.
- Min-cut: after termination, nodes reachable from the super-source in the residual graph form side A; crossing saturated arcs form the reported cut set, mapped back to `edge` references (with direction) or `nodeCapacity` references (split arcs).
- Per-exit throughput shares come from the final flow assignment.
- Criticality: for every open exit and for every arc carrying positive baseline flow (removing a zero-flow arc cannot reduce max-flow — argued and tested), rerun max-flow without that element and record `deltaMaxFlow`. Arc evaluations are capped (default top 32 by baseline flow) for performance; the cap is recorded in output when hit.

**Known-answer tests** pin exact max-flow values and exact cut sets on hand-built fixtures (series, parallel, asymmetric, node-split cases).

### 3.4 Clearance simulation

Discrete time-step simulation, default `Δt = 1 s` (configurable `timeStepSeconds > 0`).

- Population model: each occupied, reachable origin's entire population walks its assigned route from §3.2. People are aggregate counts per `(node, next-arc)` bucket. Unreachable populations are excluded up front and reported as isolated.
- Step order (fixed):
  1. Process arrivals completing at this step, in ascending arrival step, ties broken by arc sort key (tail ID, then head ID).
  2. Compute each arc's discharge allowance: `credit[a] += capacityPerMinute[a] · Δt/60; sendable[a] = ⌊credit[a]⌋; credit[a] −= sendable[a]` (fractional carry keeps long-run rate exact; IEEE-754 double arithmetic in fixed order is platform-stable).
  3. Discharge arcs in sorted (tail, head) order; each sends `min(waitingBucket, sendable[a])` people, who enter in-transit with arrival step `max(step+1, ⌈(t + travelTime)/Δt⌉)`.
  4. Record statistics (flows, queues, saturation).
- Termination: all buckets and in-transit counts empty → `completed`; a step with zero movement and empty in-transit while people remain → `stranded` (defensive; should coincide with isolation exclusion); step budget exhausted (default 86 400 steps) → `step-limit`.
- Enforced invariants (asserted every step, tested):
  - Conservation: `initialSimulated = evacuated + inTransit + queued` at every step.
  - Rate cap: cumulative flow across any prefix of steps ≤ `capacityPerMinute · elapsedMinutes + ε` per arc.
  - Non-negativity: no queue, flow, or in-transit count is ever negative.
  - Completion: when reachability is guaranteed and total capacity is sufficient (fixture property), everyone evacuates (`status === "completed"`, `evacuated === simulatedPopulation`).
- `clearanceSeconds = lastArrivalStep · Δt` where the last arrival is the final person reaching an exit.
- Outputs include per-exit totals, per-arc totals/peak queues/saturation seconds, per-node peak queues, and a downsampled cumulative evacuation curve (~200 points) for UI charts.

Deliberately excluded: individual speeds, counter-flow friction, panic, merging turbulence, density–speed curves. The model is a transparent capacity/queue abstraction, and the docs say so.

### 3.5 Bottleneck ranking

Metrics per directed arc (and per closed-constrained node):

| Metric | Formula |
|---|---|
| `totalFlow` | people discharged by the arc over the simulation |
| `utilization` | `totalFlow / (capacityPerMinute · clearanceMinutes)` |
| `saturationSeconds` | Σ steps where `waitingBucket ≥ sendable` (demand met or exceeded supply) |
| `peakQueue` | max queued count waiting to enter the arc |
| `removalImpact` | `baselineMaxFlow − maxFlow(without arc)` (positive-flow arcs only) |
| `minCutMembership` | boolean, from §3.3 |

Rank order (deterministic): `removalImpact` desc → `saturationSeconds` desc → `totalFlow` desc → arc key asc. Top N (default 10) reported; full tables available in JSON output.

### 3.6 Failure scenarios

Generated programmatically from the effective base model:

- `fail-gate-<gateId>` — each gate closed individually (`closeNode`).
- `fail-edge-<edgeId>` — individually disabled edges from a selectable connector set. Default set: the top `topN` (default 8) edges by `capacityPerMinute`, restricted to those carrying positive baseline flow or marked `majorCorridor` in the fixture; overridable via `failureOptions.edgeIds`.
- `reduce-edge-<edgeId>-<pct>` — capacity reductions at configurable factors (default `[0.5]`).

Each generated scenario runs through the identical pipeline; results report deltas vs baseline: ΔmaxFlow, ΔclearanceSeconds, ΔisolatedPopulation, and the number of origins whose assigned exit changed.

### 3.7 Comparison

`compareResults(baseline, scenario)` emits row-wise diffs over: reachable population, isolated population, clearance seconds, max theoretical flow (people/min), per-exit throughput, top bottlenecks, critical cut-set members, and per-origin route changes. All values are engine outputs; the UI renders them verbatim.

---

## 4. Determinism and fingerprint

Given identical venue file, scenario file, configuration, and engine version, all outputs — including floating-point values, orderings, IDs — are identical. Sources of nondeterminism are eliminated by construction: no clocks, no randomness, no iteration over unordered collections, no environment reads inside the engine.

**Fingerprint** = lowercase hex SHA-256 of `canonicalJSON(bundle)` where `bundle = { engineVersion, venueSchemaVersion, scenarioSchemaVersion, config: normalizedConfig, venue: canonicalVenue, scenario: canonicalScenario | null }`:

- `canonicalJSON` recursively sorts object keys; arrays preserve order except: venue nodes sorted by ID; venue edges sorted by `(from, to, id)`. Scenario operations keep file order (§1.2).
- `normalizedConfig` fills all defaults explicitly, so omitting an optional field and stating its default hash identically.
- Numbers serialize via JavaScript's number-to-string; no locale formatting exists anywhere in the pipeline.

Same inputs ⇒ byte-stable JSON output (`--json`, report exports). Changing engine version, schema versions, config, venue, or scenario changes the fingerprint.

---

## 5. Packaging and boundaries

```
engine/            pure TypeScript domain core (no I/O, no env, no framework imports)
cli/stadium-sentinel.ts   thin fs/argv wrapper over the engine
app/, components/  Next.js UI — calls engine functions directly, client-side
fixtures/          versioned venue/scenario JSON documents (synthetic)
tests/             Vitest suites over engine + fixtures
```

- The CLI (`npm run sentinel -- …`) and the UI call the **same** exported functions; there is exactly one engine implementation.
- The UI never computes analysis results itself and never displays a number the engine did not emit. Natural-language renderings are template-fixed strings around engine fields; no generative text exists in the product.
- Engine modules perform no filesystem, network, clock, or environment access — verified by import discipline and by tests running the whole pipeline in plain Vitest.

## 6. Safety boundary

Stadium Sentinel is analytical software for scenario exploration. It is **not** a certified life-safety system, an emergency command authority, or a substitute for professional crowd engineering, fire-code analysis, venue operations planning, or local emergency procedures. All outputs are estimates under the documented assumptions above; the limitations document restates this in product-facing language.
