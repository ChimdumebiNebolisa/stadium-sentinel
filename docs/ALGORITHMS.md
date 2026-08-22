# Algorithms and Assumptions

This document states exactly what each analysis stage computes, the assumptions it needs, and the formulas behind every reported metric. The implementation contract is [`DESIGN.md`](DESIGN.md); this page explains and justifies.

## 1. Routing — least-cost paths (reverse Dijkstra)

**Metric.** `costMetric: "time"` (default) uses free-flow travel seconds: `travelTimeSeconds` if declared, otherwise `distanceMeters / walkingSpeedMetersPerSecond` (default speed 1.2 m/s). `costMetric: "distance"` uses meters. The active metric name and unit appear in every output. Free-flow means no congestion: a route is a lower bound on travel time, not a forecast.

**Algorithm.** One reverse Dijkstra from a virtual sink joined to all open exits with zero-cost arcs yields `dist[v]` = least cost from every node to its best exit in a single pass.

**Tie-breaking.** After distances converge, nodes are processed in ascending-dist order (id as secondary key). Each node's successor is the valid arc (`dist[u] === cost(arc) + dist[to]`) with the lexicographically smallest `(toId, edgeId)`, compared by UTF-16 code units. Equal-cost alternatives therefore resolve identically everywhere; the tie-break is exercised by a test that renames nodes to flip the winner.

**What routing ignores:** capacities, queues, other people. Capacity effects are modeled by flow analysis and the simulation, never blended into path costs.

## 2. Reachability

Backward BFS over enabled arcs from each open exit marks every node that can reach that exit. Isolated population = sum of occupancy over origins with no reachable exit. Monotonic property (tested over every edge and node of the fixture): closures can only shrink the reachable pair set.

## 3. Max-flow and min-cut (Dinic)

**Question answered:** *how many people per minute can this network pass toward exits at most?* — a ceiling independent of demand size.

**Model construction.**
- Super-source → each open occupied origin with capacity far above any achievable flow.
- Each open exit → sink likewise.
- Undirected edges become two independent directed arcs at full `capacityPerMinute`. **Assumption:** both directions of a corridor can run at declared capacity simultaneously.
- A node declaring `capacity` (a stock limit) is split into in/out halves joined by an arc capped at the declared number. **Assumption (units):** stock is converted to a rate assuming one full turnover of the node per minute. This affects flow/min-cut only; the simulation enforces queueing physically instead.

**Algorithm:** Dinic (BFS level graph + blocking-flow DFS), arcs inserted in deterministic order so the particular max-flow assignment — not just its value — is reproducible.

**Min-cut:** after termination, side A = nodes reachable from the super-source in the residual graph. Every arc crossing from A to B is saturated; those arcs are mapped back to model references (edges, or node-capacity splits).

**Criticality:** for each element carrying positive baseline flow (removing a zero-flow element cannot reduce max-flow, since the baseline assignment remains feasible), rerun max-flow without it and report `deltaMaxFlow = baseline − reduced`. Evaluations are capped (`criticalityArcLimit`, default 32); the cap is flagged when hit.

## 4. Clearance simulation

Discrete time steps, default Δt = 1 s. Each person walks their origin's assigned least-cost route. State is integer counts per `(node, next-arc)` bucket plus scheduled arrivals.

Per step, in fixed order:
1. Process arrivals due this step (arc order). People reaching a gate are evacuated; others join the tail queue of their route's next arc.
2. Snapshot queue statistics.
3. Discharge arcs in sorted order with fractional credit carry:
   `credit[a] += capacityPerMinute[a] · Δt/60; sendable = ⌊credit[a]⌋; credit[a] -= sendable`.
   The carry keeps long-run throughput exact without floating people. A person departing at step k arrives at step `k + max(1, ⌈travelTime/Δt⌉)`.
4. Assert conservation and non-negativity; check termination.

Termination: everything evacuated or isolated-excluded → `completed`; nothing moving with people stranded → `stranded` (defensive); step budget exhausted → `step-limit-reached`.

**Invariants enforced every step (asserted in code):**
- `simulatedPopulation === evacuated + inTransit + queued`
- cumulative arc flow ≤ `capacityPerMinute × elapsedMinutes` (+1 person step-granularity tolerance)
- no negative queues, flows, or in-transit counts

**Deliberately excluded physics:** individual speeds, counter-flow friction, density–speed curves, panic, merging turbulence, grouping. The model trades realism for transparency and provable invariants.

## 5. Bottleneck metrics (exact formulas)

For each edge with simulated activity:

| Metric | Formula |
|---|---|
| `totalFlowPeople` | Σ discharged people across both directions |
| `utilization` | `totalFlow / (capacityPerMinute × clearanceMinutes)` |
| `saturationSeconds` | `Σ Δt` over steps where waiting demand strictly exceeded the discharge allowance |
| `peakQueue` | max people ever waiting to enter the edge |
| `removalImpact` | baseline max-flow − max-flow without this edge (positive-flow edges only) |
| `minCutMember` | membership in the reported residual min-cut |

Rank order: `removalImpact` desc → `saturationSeconds` desc → `totalFlowPeople` desc → id asc. Top N (default 10) reported.

## 6. Failure sweep

Generated deterministically from the base model: every open gate closed individually; top-N connectors (by baseline carried flow, then capacity) removed individually; configurable capacity reductions on those connectors. Each runs through the identical pipeline; deltas are computed against the current baseline result.

## 7. Known non-invariants

- **Clearance time is not monotonic under closures.** Removing a constriction (like Harborline's east tunnel) can reduce estimated clearance because queueing dominated the baseline. Only reachability is monotonic; the tests pin this distinction explicitly.
- Max theoretical flow can stay constant while simulated clearance worsens (e.g., halving the tunnel keeps some ring-detourable flow but queues everyone on shortest paths). Flow ceilings and routed behavior are different statements; the product reports both separately.
