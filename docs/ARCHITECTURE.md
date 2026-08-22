# Architecture

```
┌────────────────────────────────────────────────────────────┐
│                      engine/  (pure TS)                    │
│  types · validation · graph · routing · flow · simulate    │
│  bottlenecks/analyze · compare · failures · fingerprint    │
│  No I/O. No env reads. No clocks. No randomness.           │
└──────────▲─────────────────────────────▲───────────────────┘
           │ same exported functions     │
┌──────────┴──────────┐      ┌─────────────┴─────────────────┐
│  cli/stadium-       │      │  components/workspace/*       │
│  sentinel.ts        │      │  Next.js client workspace     │
│  fs + argv only     │      │  static fixture imports       │
└─────────────────────┘      └───────────────────────────────┘
```

## Layers

1. **`engine/` — the domain core.** Every analysis stage is a pure function over validated inputs. Modules never touch the filesystem, network, environment, or clock, which is what makes results byte-stable and lets the exact same code run in Node (CLI) and the browser (UI).
2. **`cli/stadium-sentinel.ts`** — thin wrapper: reads JSON files, validates, calls engine functions, prints human summaries or stable JSON (`--json`). Exit codes: `0` success, `1` validation failure, `2` usage/IO error.
3. **`components/workspace/` + `app/page.tsx`** — the UI is a single client-side workspace that imports the bundled fixtures and renders engine outputs verbatim. It contains no analysis logic of its own: every number shown traces to an `AnalysisResult` field.

## UI/engine boundary

- The UI calls `analyzeVenue(venue, scenario | null, configOverrides)` for baseline/scenario runs and `runFailureSweep` for the failure tab.
- Scenario selection, route metric (`time`/`distance`), and step-free traversal are UI controls that feed `configOverrides`; they change results by changing documented engine configuration — nothing else is configurable implicitly.
- Natural-language strings in the UI/report are fixed templates around engine fields. The product generates no free-form claims beyond what the evidence supports.
- Exports (markdown report, analysis JSON) are serialized from the same in-memory results, so downloads match on-screen values exactly.

## Data flow

```
venue.json ──validateVenueDocument──► VenueModel ─┐
scenario.json ─validateScenarioDocument───────────┤
                     │ (references checked        │ applyScenario
                     │  against venue)            ▼
                     │                      EffectiveVenue ──compileGraph──► CompiledGraph
                     │                                                        │
                     │      ┌─────────────────────────────────────────────────┤
                     │      ▼                    ▼                            ▼
                     │ computeRouting      computeMaxFlow            simulateClearance
                     │      └────────────► analyzeVenue ◄──────────────────────┘
                     │                        │
                     │                        ▼
                     │              AnalysisResult (+ fingerprint)
                     │                        │
                     └── diagnostics ──► CLI / UI rendering, exports
```

## Versioning

- Engine version: constant in `engine/version.ts`, part of every output and fingerprint.
- Venue schema `"1"`, scenario schema `"1"`: documents declare their version; unsupported versions are rejected with precise diagnostics rather than guessed at.
