# Determinism and Fingerprinting

## Guarantee

Given identical venue file, scenario file, configuration, and engine version, Stadium Sentinel produces identical results — every number, ordering, and byte of JSON output. Verified by tests that run the pipeline twice and compare output strings exactly (`tests/determinism.test.ts`).

## How nondeterminism is excluded

| Threat | Control |
|---|---|
| Clocks / timestamps | Engine performs no time reads; durations are model seconds, not wall time |
| Randomness | No random sources exist anywhere in the engine (no PRNG at all) |
| Unordered iteration | All collections iterated in construction or sorted order; string comparisons use UTF-16 code units, never `localeCompare` |
| Environment | Engine reads no environment variables; all knobs are explicit `EffectiveConfig` values with documented defaults |
| Platform math | Only IEEE-754 double arithmetic in fixed operation order; JS number formatting is spec-stable (shortest round-trip) |
| Hashing | Pure-TypeScript SHA-256 (`engine/fingerprint.ts`); validated against FIPS 180-4 vectors; no platform crypto APIs |

## Canonical form

The fingerprint is SHA-256 over the canonical JSON of:

```json
{
  "engineVersion": "…",
  "venueSchemaVersion": "1",
  "scenarioSchemaVersion": "1",
  "config": { …fully expanded EffectiveConfig… },
  "venue": { …canonicalized venue document… },
  "scenario": { …as written… } | null
}
```

Rules:
1. Object keys are serialized sorted by code-unit order, recursively.
2. Arrays preserve order — except venue nodes (sorted by id) and venue edges (sorted by `(from, to, id)`), because the schema gives them no semantic order. Scenario operations keep file order; validation guarantees their order cannot change the effective model anyway.
3. The config is normalized to its full form first: an omitted field and an explicitly stated default produce identical hashes.

## What changes the fingerprint

Any change to: engine version, schema versions, any effective-config value, venue content, scenario content — including semantically tiny edits like a rename or description. Two runs over the same inputs always agree; the fixture regression tests pin exact fingerprint-bearing outputs via full-output equality.

## Byte stability

`analyze --json`, comparison `--json`, UI exports, and the markdown report are built by serializing the same result objects with fixed key insertion order and fixed templates. Identical inputs ⇒ identical files, confirmed for CLI output in tests and manually during development.
