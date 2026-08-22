# Sample Walkthrough — Harborline Park

All commands run from a clean clone; no configuration required. Outputs below are recorded from actual runs of engine 1.0.0.

## 1. Validate the venue

```bash
npm run sentinel -- validate fixtures/harborline-park.json
```

```
VALID: fixtures/harborline-park.json (18 nodes, 24 edges)
```

The fixture is **synthetic**: 6 seating sections (7,500 people), a four-node concourse ring, four gates, stairs/ramp/checkpoint/refuge node types, and one deliberate bottleneck — an east tunnel rated at 300 people/min that serves ~4,200 people on the east side.

## 2. Baseline analysis

```bash
npm run sentinel -- analyze fixtures/harborline-park.json
```

Key results (abridged):

- **Routing** — least-time assignments:
  - sec-nw, sec-w, sec-sw → gate-west (through the checkpoint chain)
  - sec-ne, sec-e, sec-se → gate-east **through the tunnel**
  - nobody chooses the north or south gates at baseline: the tunnel is closer in time than the ring detour.
- **Flow** — max theoretical throughput **3,500 people/min** (north 1200, south 1200, west 800, east 300). Min cut includes `e-tunnel-east`: the network literally cannot move more people east than the tunnel admits.
- **Clearance** — all 7,500 simulated people out in **14 m 33 s**, dominated by the tunnel queue (4,200 people through 300/min ≈ 14 minutes of saturation).
- **Bottlenecks** — ranked by removal impact then saturation: the tunnel carries 4,200 people with a peak queue of ~2,900 and stays saturated for nearly the whole run.

## 3. A failure scenario

```bash
npm run sentinel -- analyze fixtures/harborline-park.json --scenario fixtures/east-tunnel-closed.json
npm run sentinel -- compare fixtures/harborline-park.json - fixtures/east-tunnel-closed.json
```

Comparison output (recorded):

```
Comparing "(baseline)" -> "east-tunnel-closed"
fingerprints: 604a8cb39a60f442… -> 34d5e922cfae3f91…

  reachablePopulation            7500 people   ->       7500 (delta 0)
  isolatedPopulation                0 people   ->          0 (delta 0)
  estimatedClearanceTime          873 seconds  ->        387 (delta -486)
  maxTheoreticalFlow             3500 p/min    ->       3200 (delta -300)
  route changes:
    sec-e: gate-east -> gate-north
    sec-ne: gate-east -> gate-north
    sec-se: gate-east -> gate-south
```

Read that carefully: closing the tunnel *reduces* max theoretical flow by exactly the tunnel's capacity (-300) yet *shortens* estimated clearance. The tunnel was itself the binding constraint — without it, demand redistributes across three exits whose combined service rate is much higher. This is the documented non-invariant in action: reachability never grows under closures, but clearance time is not monotonic. The engine reports both facts instead of hiding either.

## 4. Capacity reduction (flow ceiling vs routed behavior)

```bash
npm run sentinel -- analyze fixtures/harborline-park.json --scenario fixtures/reduce-east-tunnel-half.json
```

Halving the tunnel to 150 people/min keeps max theoretical flow at 3,350 (the concourse ring lets some flow detour to other exits) while simulated clearance degrades to **28 m 33 s** — everyone still walks their least-time route into the narrower queue. Flow ceilings and routed behavior are different statements; both are reported separately by design.

## 5. Generated failure sweep

```bash
npm run sentinel -- analyze fixtures/harborline-park.json --failures
```

Generates every gate closure plus top-connector removals/reductions and prints a delta table (20 scenarios for this fixture). Notable rows: closing `gate-west` reassigns three origins; closing `gate-north` changes nothing because no section routes there at baseline; removing either checkpoint edge drops west-side throughput to zero contribution.

## 6. Structured output

Add `--json` to any command for the byte-stable machine-readable result (fingerprint first). The UI's Report tab downloads the same data as JSON or as a deterministic markdown report.

## 7. Same analysis in the browser

`npm run dev` → http://localhost:3000 renders the identical engine results: graph overlays (congestion, closures, min-cut glow, route highlight), per-origin routing table, flow panel, clearance chart, bottleneck ranking, failure sweep, comparison view, and exports.
