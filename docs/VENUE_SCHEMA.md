# Venue Schema — version `"1"`

A venue is a single JSON document describing a venue as a capacity-constrained graph. The engine validates strictly: unknown fields, wrong types, and out-of-range values are rejected with precise diagnostics — nothing is repaired or defaulted silently except fields explicitly marked optional below.

## Top level

| Field | Type | Required | Rules |
|---|---|---|---|
| `schemaVersion` | string | yes | must be `"1"` |
| `id` | string | yes | non-empty |
| `name` | string | yes | non-empty |
| `description` | string | no | |
| `config` | object | no | see §Config |
| `nodes` | array | yes | ≥ 1 node |
| `edges` | array | yes | may be empty (analysis will report isolation) |

## Config (all optional)

| Field | Type | Default | Meaning |
|---|---|---|---|
| `walkingSpeedMetersPerSecond` | number > 0 | `1.2` | used to derive travel time from `distanceMeters` |
| `costMetric` | `"time"` \| `"distance"` | `"time"` | routing cost metric; named in all outputs |

## Node

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | non-empty, unique |
| `label` | string | yes | non-empty |
| `type` | enum | yes | `section` \| `concourse` \| `corridor` \| `stairwell` \| `ramp` \| `gate` \| `checkpoint` \| `refuge` |
| `occupancy` | integer | no | ≥ 0; occupied nodes are demand sources; ≤ `capacity` when capacity declared |
| `capacity` | integer | no | > 0; stock limit for node-capacity modeling |
| `x`, `y` | number | yes | finite; visualization coordinates only |
| `accessible` | boolean | no | default `true`; node-level accessibility |

Semantics:

- **Exits** are exactly the nodes with `type: "gate"`. There is no separate exit flag.
- Coordinates carry no units and no georeferencing; they exist for schematic rendering.

## Edge

| Field | Type | Required | Rules |
|---|---|---|---|
| `id` | string | yes | non-empty, unique |
| `from`, `to` | string | yes | must reference existing nodes; `from ≠ to` |
| `directed` | boolean | no | default `false` (traversable both ways) |
| `distanceMeters` | number | one of these two required | > 0, finite |
| `travelTimeSeconds` | number | " | ≥ 0, finite; takes precedence for time costs when both present |
| `capacityPerMinute` | number | yes | > 0, finite; throughput per direction |
| `widthMeters` | number | no | > 0; provenance metadata only — never auto-converted to capacity |
| `enabled` | boolean | no | default `true`; disabled edges are excluded from analysis |
| `stepFree` | boolean | no | default `true`; `false` marks a step-restricted connector (e.g., stairs), excluded when step-free traversal is required |

Undirected edges are compiled to two directed arcs, each carrying the full `capacityPerMinute` (documented assumption in [`DESIGN.md`](DESIGN.md) §1.3).

## Example

```json
{
  "schemaVersion": "1",
  "id": "example-oval",
  "name": "Example Oval",
  "config": { "walkingSpeedMetersPerSecond": 1.2 },
  "nodes": [
    { "id": "sec-a", "label": "Section A", "type": "section", "occupancy": 200,
      "x": 20, "y": 30 },
    { "id": "con-1", "label": "North Concourse", "type": "concourse",
      "x": 50, "y": 15 },
    { "id": "gate-n", "label": "North Gate", "type": "gate", "x": 50, "y": 5 }
  ],
  "edges": [
    { "id": "e1", "from": "sec-a", "to": "con-1",
      "distanceMeters": 40, "capacityPerMinute": 300 },
    { "id": "e2", "from": "con-1", "to": "gate-n",
      "travelTimeSeconds": 25, "capacityPerMinute": 600 }
  ]
}
```

See `fixtures/` for complete synthetic venues.
