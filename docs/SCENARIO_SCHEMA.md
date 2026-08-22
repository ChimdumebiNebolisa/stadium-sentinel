# Scenario Schema — version `"1"`

A scenario is a transparent, ordered patch over a base venue document. Scenarios never mutate the base model; applying a scenario produces a new *effective model* used by every analysis stage.

```json
{
  "schemaVersion": "1",
  "id": "close-gate-east",
  "name": "Close East Gate",
  "description": "Operational closure of the east gate during egress.",
  "operations": [ ... ]
}
```

| Field | Type | Required | Rules |
|---|---|---|---|
| `schemaVersion` | string | yes | must be `"1"` |
| `id` | string | yes | non-empty |
| `name` | string | yes | non-empty |
| `description` | string | no | |
| `operations` | array | yes | may be empty (identity patch); see rules |

## Operations

Every operation is an object with `"op"` plus fields below. Unknown ops, missing fields, unknown IDs, and non-finite numbers are rejected.

| Op | Fields | Effect |
|---|---|---|
| `disableEdge` | `edgeId` | edge removed from traversal and flow |
| `enableEdge` | `edgeId` | re-enables an edge |
| `setEdgeCapacity` | `edgeId`, `capacityPerMinute` (> 0) | replaces edge throughput |
| `scaleEdgeCapacity` | `edgeId`, `factor` (> 0) | multiplies edge throughput |
| `setNodeOccupancy` | `nodeId`, `occupancy` (integer ≥ 0) | replaces standing population; must respect node `capacity` |
| `scaleNodeOccupancy` | `nodeId`, `factor` (> 0) | multiplies occupancy, rounded half-up to integer; result must respect node `capacity` |
| `closeNode` | `nodeId` | node closed: blocks traversal; if it is a gate, that exit is unavailable; any occupancy at a closed node becomes isolated population (reported, never hidden) |
| `openNode` | `nodeId` | reopens a closed node |

## Contradiction rule

Within one scenario, **at most one operation may target each (entity, field) pair**: one capacity op per edge, one enable/disable op per edge, one occupancy op per node, one open/close op per node. A second operation touching the same pair is rejected (`E_CONTRADICTORY_OPERATIONS`). Consequently operation order cannot change the resulting effective model; order is preserved for transparency and included in the fingerprint as written.

## Example

```json
{
  "schemaVersion": "1",
  "id": "east-corridor-half-and-gate-closed",
  "name": "East corridor at half capacity, Gate East closed",
  "operations": [
    { "op": "scaleEdgeCapacity", "edgeId": "e-con-east-2", "factor": 0.5 },
    { "op": "closeNode", "nodeId": "gate-east" }
  ]
}
```
