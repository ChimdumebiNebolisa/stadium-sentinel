# Limitations and Safety Boundary

## What this software is

Stadium Sentinel is analytical software for exploring venue-flow and evacuation scenarios under explicit, documented assumptions. It helps you reason about capacity, routing, bottlenecks, and the consequences of operational changes.

## What this software is not

- **Not a certified life-safety system.** Nothing here is egress-code compliant, tested against NFPA/Life Safety Code workflows, or suitable as a basis for life-safety decisions.
- **Not an emergency command authority.** It does not monitor venues, ingest live data, issue instructions, or interface with emergency services.
- **Not a substitute for professional crowd engineering, fire-code analysis, venue operations planning, or local emergency procedures.** Qualified professionals and official procedures govern real venues.

## Model limitations (what the numbers can and cannot mean)

1. **Inputs are hypothetical.** Occupancies, capacities, and travel times come from user-declared JSON. The engine validates structure, not truth. A wrong `capacityPerMinute` produces confident-looking nonsense.
2. **Routing is free-flow least-cost.** Paths ignore congestion; they are lower bounds, not predictions of where crowds will go. Route choice under stress, signage, staff guidance, or familiarity is out of scope.
3. **Corridor capacities are per-direction independent.** Real bidirectional corridors lose throughput to counter-flow interference; this model does not represent that.
4. **Node capacities use one-turnover-per-minute conversion** in flow analysis — an accounting assumption, not physics. The simulation handles node queueing directly but does not model density–speed degradation.
5. **No human behavior.** No panic, grouping, family cohesion, wheelchair speeds on stairs, counter-flow, or exit choice beyond assigned least-cost routes. Populations are indistinguishable counts.
6. **Clearance times are estimates with exact bookkeeping.** The simulation conserves people and respects declared rates precisely, but those rates are assumptions. Treat clearance outputs as comparisons between scenarios under identical assumptions, not as forecasts of real evacuations.
7. **Clearance time is not monotonic under closures** (see [ALGORITHMS.md §7](ALGORITHMS.md)): removing a constriction can shorten estimated clearance. Read scenario results as a system, never as "fewer routes = worse."
8. **Coordinates are schematic only.** The graph layout exists for visualization; it encodes no georeferencing and implies no distance fidelity beyond the declared `distanceMeters` values.
9. **Single fixed route set per run.** All people from an origin follow that origin's route; dynamic rerouting mid-simulation (e.g., around emerging queues) is not modeled.
10. **Scale unprofiled.** Correctness is size-independent by construction; performance beyond thousands of nodes/edges has not been characterized.

## Using results responsibly

- Use scenario *comparisons* (same inputs, one change) rather than absolute numbers when informing discussions.
- Have capacity values reviewed by someone qualified to estimate pedestrian flow rates for the specific venue geometry.
- Pair any analysis with professional judgment and the venue's actual emergency procedures.
