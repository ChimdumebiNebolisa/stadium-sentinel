import {
  type Diagnostic,
  type ScenarioOperation,
  type ScenarioPatch,
  type VenueEdge,
  type VenueModel,
  type VenueNode,
  NODE_TYPES,
} from "./types";
import { SCENARIO_SCHEMA_VERSION, VENUE_SCHEMA_VERSION } from "./version";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value);
}

/** Compare strings by UTF-16 code units — locale-independent and stable across platforms. */
export function compareStrings(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const VENUE_TOP_KEYS = new Set([
  "schemaVersion",
  "id",
  "name",
  "description",
  "config",
  "nodes",
  "edges",
]);
const CONFIG_KEYS = new Set(["walkingSpeedMetersPerSecond", "costMetric"]);
const NODE_KEYS = new Set([
  "id",
  "label",
  "type",
  "occupancy",
  "capacity",
  "x",
  "y",
  "accessible",
]);
const EDGE_KEYS = new Set([
  "id",
  "from",
  "to",
  "directed",
  "distanceMeters",
  "travelTimeSeconds",
  "capacityPerMinute",
  "widthMeters",
  "enabled",
  "stepFree",
]);

function error(code: string, path: string, message: string): Diagnostic {
  return { severity: "error", code, message, path };
}

function checkUnknownKeys(
  obj: Record<string, unknown>,
  allowed: Set<string>,
  path: string,
  out: Diagnostic[],
): void {
  for (const key of Object.keys(obj)) {
    if (!allowed.has(key)) {
      out.push(error("E_UNKNOWN_FIELD", `${path}.${key}`, `Unknown field "${key}".`));
    }
  }
}

/**
 * Validates a raw parsed JSON document as a venue model.
 * Returns all diagnostics in deterministic order; model is undefined when any error exists.
 */
export function validateVenueDocument(input: unknown): {
  model?: VenueModel;
  diagnostics: Diagnostic[];
} {
  const diagnostics: Diagnostic[] = [];

  if (!isObject(input)) {
    return {
      diagnostics: [error("E_INVALID_ROOT", "", "Venue document must be a JSON object.")],
    };
  }

  checkUnknownKeys(input, VENUE_TOP_KEYS, "venue", diagnostics);

  if (input.schemaVersion !== VENUE_SCHEMA_VERSION) {
    diagnostics.push(
      error(
        "E_UNSUPPORTED_SCHEMA_VERSION",
        "venue.schemaVersion",
        `Unsupported venue schemaVersion ${JSON.stringify(input.schemaVersion)}; expected "${VENUE_SCHEMA_VERSION}".`,
      ),
    );
  }

  if (typeof input.id !== "string" || input.id.length === 0) {
    diagnostics.push(error("E_INVALID_FIELD", "venue.id", "venue.id must be a non-empty string."));
  }
  if (typeof input.name !== "string" || input.name.length === 0) {
    diagnostics.push(
      error("E_INVALID_FIELD", "venue.name", "venue.name must be a non-empty string."),
    );
  }
  if (
    input.description !== undefined &&
    (typeof input.description !== "string" || input.description.length === 0)
  ) {
    diagnostics.push(
      error("E_INVALID_FIELD", "venue.description", "venue.description must be a non-empty string."),
    );
  }

  let walkingSpeed = 1.2;
  let costMetric: "time" | "distance" = "time";
  if (input.config !== undefined) {
    if (!isObject(input.config)) {
      diagnostics.push(error("E_INVALID_FIELD", "venue.config", "venue.config must be an object."));
    } else {
      checkUnknownKeys(input.config, CONFIG_KEYS, "venue.config", diagnostics);
      const speed = input.config.walkingSpeedMetersPerSecond;
      if (speed !== undefined) {
        if (!isFiniteNumber(speed) || speed <= 0) {
          diagnostics.push(
            error(
              "E_INVALID_FIELD",
              "venue.config.walkingSpeedMetersPerSecond",
              "walkingSpeedMetersPerSecond must be a finite number greater than 0.",
            ),
          );
        } else {
          walkingSpeed = speed;
        }
      }
      const metric = input.config.costMetric;
      if (metric !== undefined) {
        if (metric !== "time" && metric !== "distance") {
          diagnostics.push(
            error(
              "E_INVALID_FIELD",
              "venue.config.costMetric",
              'costMetric must be "time" or "distance".',
            ),
          );
        } else {
          costMetric = metric;
        }
      }
    }
  }

  // Nodes.
  const nodes: VenueNode[] = [];
  const seenNodeIds = new Map<string, number>();
  if (!Array.isArray(input.nodes)) {
    diagnostics.push(error("E_INVALID_FIELD", "venue.nodes", "nodes must be an array."));
  } else if (input.nodes.length === 0) {
    diagnostics.push(error("E_INVALID_FIELD", "venue.nodes", "nodes must contain at least one node."));
  } else {
    for (let i = 0; i < input.nodes.length; i++) {
      const raw = input.nodes[i];
      const path = `venue.nodes[${i}]`;
      if (!isObject(raw)) {
        diagnostics.push(error("E_INVALID_FIELD", path, "Node must be an object."));
        continue;
      }
      checkUnknownKeys(raw, NODE_KEYS, path, diagnostics);

      const nodeId = raw.id;
      if (typeof nodeId !== "string" || nodeId.length === 0) {
        diagnostics.push(error("E_INVALID_FIELD", `${path}.id`, "id must be a non-empty string."));
      } else if (seenNodeIds.has(nodeId)) {
        diagnostics.push(
          error(
            "E_DUPLICATE_NODE_ID",
            `${path}.id`,
            `Duplicate node id "${nodeId}" (first defined at venue.nodes[${seenNodeIds.get(nodeId)!}]).`,
          ),
        );
      } else {
        seenNodeIds.set(nodeId, i);
      }

      if (typeof raw.label !== "string" || raw.label.length === 0) {
        diagnostics.push(error("E_INVALID_FIELD", `${path}.label`, "label must be a non-empty string."));
      }

      if (typeof raw.type !== "string" || !NODE_TYPES.includes(raw.type as never)) {
        diagnostics.push(
          error(
            "E_UNKNOWN_NODE_TYPE",
            `${path}.type`,
            `type must be one of: ${NODE_TYPES.join(", ")}.`,
          ),
        );
      }

      if (raw.occupancy !== undefined) {
        if (!isInteger(raw.occupancy) || raw.occupancy < 0) {
          diagnostics.push(
            error(
              "E_INVALID_FIELD",
              `${path}.occupancy`,
              "occupancy must be an integer greater than or equal to 0.",
            ),
          );
        }
      }

      if (raw.capacity !== undefined && (!isInteger(raw.capacity) || raw.capacity <= 0)) {
        diagnostics.push(
          error(
            "E_INVALID_FIELD",
            `${path}.capacity`,
            "capacity must be an integer greater than 0 when present.",
          ),
        );
      }

      if (
        isInteger(raw.occupancy) &&
        raw.occupancy >= 0 &&
        isInteger(raw.capacity) &&
        raw.capacity > 0 &&
        raw.occupancy > raw.capacity
      ) {
        diagnostics.push(
          error(
            "E_IMPOSSIBLE_OCCUPANCY",
            `${path}.occupancy`,
            `occupancy ${raw.occupancy} exceeds declared capacity ${raw.capacity}.`,
          ),
        );
      }

      if (!isFiniteNumber(raw.x) || !isFiniteNumber(raw.y)) {
        diagnostics.push(
          error("E_INVALID_COORDINATES", `${path}.x`, "x and y must be finite numbers."),
        );
      }

      if (raw.accessible !== undefined && typeof raw.accessible !== "boolean") {
        diagnostics.push(
          error("E_INVALID_FIELD", `${path}.accessible`, "accessible must be a boolean."),
        );
      }

      if (
        typeof nodeId === "string" &&
        nodeId.length > 0 &&
        typeof raw.label === "string" &&
        raw.label.length > 0 &&
        typeof raw.type === "string" &&
        NODE_TYPES.includes(raw.type as never) &&
        isFiniteNumber(raw.x) &&
        isFiniteNumber(raw.y)
      ) {
        const node: VenueNode = {
          id: nodeId,
          label: raw.label,
          type: raw.type as VenueNode["type"],
          x: raw.x,
          y: raw.y,
        };
        if (isInteger(raw.occupancy) && raw.occupancy >= 0) node.occupancy = raw.occupancy;
        if (isInteger(raw.capacity) && raw.capacity > 0) node.capacity = raw.capacity;
        if (typeof raw.accessible === "boolean") node.accessible = raw.accessible;
        nodes.push(node);
      }
    }
  }

  // Edges.
  const edges: VenueEdge[] = [];
  const seenEdgeIds = new Map<string, number>();
  if (!Array.isArray(input.edges)) {
    diagnostics.push(error("E_INVALID_FIELD", "venue.edges", "edges must be an array."));
  } else {
    for (let i = 0; i < input.edges.length; i++) {
      const raw = input.edges[i];
      const path = `venue.edges[${i}]`;
      if (!isObject(raw)) {
        diagnostics.push(error("E_INVALID_FIELD", path, "Edge must be an object."));
        continue;
      }
      checkUnknownKeys(raw, EDGE_KEYS, path, diagnostics);

      const edgeId = raw.id;
      if (typeof edgeId !== "string" || edgeId.length === 0) {
        diagnostics.push(error("E_INVALID_FIELD", `${path}.id`, "id must be a non-empty string."));
      } else if (seenEdgeIds.has(edgeId)) {
        diagnostics.push(
          error(
            "E_DUPLICATE_EDGE_ID",
            `${path}.id`,
            `Duplicate edge id "${edgeId}" (first defined at venue.edges[${seenEdgeIds.get(edgeId)!}]).`,
          ),
        );
      } else {
        seenEdgeIds.set(edgeId, i);
      }

      for (const endpointKey of ["from", "to"] as const) {
        const endpoint = raw[endpointKey];
        if (typeof endpoint !== "string" || endpoint.length === 0) {
          diagnostics.push(
            error("E_INVALID_FIELD", `${path}.${endpointKey}`, `${endpointKey} must be a non-empty string.`),
          );
        } else if (!seenNodeIds.has(endpoint)) {
          diagnostics.push(
            error(
              "E_UNKNOWN_EDGE_ENDPOINT",
              `${path}.${endpointKey}`,
              `${endpointKey} references unknown node "${endpoint}".`,
            ),
          );
        }
      }
      if (
        typeof raw.from === "string" &&
        typeof raw.to === "string" &&
        raw.from.length > 0 &&
        raw.from === raw.to
      ) {
        diagnostics.push(error("E_SELF_LOOP_EDGE", path, "Edges cannot connect a node to itself."));
      }

      for (const flagKey of ["directed", "enabled", "stepFree"] as const) {
        if (raw[flagKey] !== undefined && typeof raw[flagKey] !== "boolean") {
          diagnostics.push(
            error("E_INVALID_FIELD", `${path}.${flagKey}`, `${flagKey} must be a boolean.`),
          );
        }
      }

      if (raw.distanceMeters !== undefined && (!isFiniteNumber(raw.distanceMeters) || raw.distanceMeters <= 0)) {
        diagnostics.push(
          error(
            "E_INVALID_FIELD",
            `${path}.distanceMeters`,
            "distanceMeters must be a finite number greater than 0 when present.",
          ),
        );
      }
      if (
        raw.travelTimeSeconds !== undefined &&
        (!isFiniteNumber(raw.travelTimeSeconds) || raw.travelTimeSeconds < 0)
      ) {
        diagnostics.push(
          error(
            "E_INVALID_FIELD",
            `${path}.travelTimeSeconds`,
            "travelTimeSeconds must be a finite number greater than or equal to 0 when present.",
          ),
        );
      }
      if (raw.distanceMeters === undefined && raw.travelTimeSeconds === undefined) {
        diagnostics.push(
          error(
            "E_MISSING_TRAVERSAL_BASIS",
            path,
            "Every edge requires distanceMeters or travelTimeSeconds.",
          ),
        );
      }
      if (raw.capacityPerMinute === undefined) {
        diagnostics.push(
          error("E_MISSING_FIELD", `${path}.capacityPerMinute`, "capacityPerMinute is required."),
        );
      } else if (!isFiniteNumber(raw.capacityPerMinute) || raw.capacityPerMinute <= 0) {
        diagnostics.push(
          error(
            "E_ZERO_OR_NEGATIVE_CAPACITY",
            `${path}.capacityPerMinute`,
            `capacityPerMinute must be a finite number greater than 0; use enabled:false to remove an edge.`,
          ),
        );
      }
      if (raw.widthMeters !== undefined && (!isFiniteNumber(raw.widthMeters) || raw.widthMeters <= 0)) {
        diagnostics.push(
          error(
            "E_INVALID_FIELD",
            `${path}.widthMeters`,
            "widthMeters must be a finite number greater than 0 when present.",
          ),
        );
      }

      if (
        typeof edgeId === "string" &&
        edgeId.length > 0 &&
        typeof raw.from === "string" &&
        typeof raw.to === "string" &&
        seenNodeIds.has(raw.from) &&
        seenNodeIds.has(raw.to) &&
        raw.from !== raw.to &&
        isFiniteNumber(raw.capacityPerMinute) &&
        raw.capacityPerMinute > 0 &&
        (isFiniteNumber(raw.distanceMeters) ||
          isFiniteNumber(raw.travelTimeSeconds))
      ) {
        const edge: VenueEdge = {
          id: edgeId,
          from: raw.from,
          to: raw.to,
          capacityPerMinute: raw.capacityPerMinute,
        };
        if (typeof raw.directed === "boolean") edge.directed = raw.directed;
        if (isFiniteNumber(raw.distanceMeters) && raw.distanceMeters > 0)
          edge.distanceMeters = raw.distanceMeters;
        if (isFiniteNumber(raw.travelTimeSeconds) && raw.travelTimeSeconds >= 0)
          edge.travelTimeSeconds = raw.travelTimeSeconds;
        if (isFiniteNumber(raw.widthMeters) && raw.widthMeters > 0)
          edge.widthMeters = raw.widthMeters;
        if (typeof raw.enabled === "boolean") edge.enabled = raw.enabled;
        if (typeof raw.stepFree === "boolean") edge.stepFree = raw.stepFree;
        edges.push(edge);
      }
    }
  }

  // Connectivity sanity: every occupied node must reach some gate using enabled edges.
  if (diagnostics.every((d) => d.code !== "E_UNKNOWN_EDGE_ENDPOINT")) {
    const adjacency = new Map<string, string[]>();
    for (const edge of edges) {
      if (edge.enabled === false) continue;
      pushAdjacency(adjacency, edge.from, edge.to);
      if (!edge.directed) pushAdjacency(adjacency, edge.to, edge.from);
    }
    const exitReachable = reverseReachabilityFromGates(nodes, adjacency);
    for (const node of nodes) {
      if ((node.occupancy ?? 0) > 0 && !exitReachable.has(node.id)) {
        diagnostics.push(
          error(
            "E_DISCONNECTED_OCCUPIED_SECTION",
            `venue.nodes[id=${node.id}]`,
            `Occupied node "${node.id}" has no path to any gate through enabled edges.`,
          ),
        );
      }
    }
  }

  if (diagnostics.some((d) => d.severity === "error")) {
    return { diagnostics };
  }

  const model: VenueModel = {
    schemaVersion: VENUE_SCHEMA_VERSION,
    id: input.id as string,
    name: input.name as string,
    nodes,
    edges,
  };
  if (typeof input.description === "string") model.description = input.description;
  if (input.config !== undefined) {
    model.config = {
      ...(walkingSpeed !== 1.2 ? { walkingSpeedMetersPerSecond: walkingSpeed } : {}),
      ...(costMetric !== "time" ? { costMetric } : {}),
    };
    if (Object.keys(model.config).length === 0) delete model.config;
  }
  return { model, diagnostics };
}

function pushAdjacency(map: Map<string, string[]>, from: string, to: string): void {
  const list = map.get(from);
  if (list) {
    list.push(to);
  } else {
    map.set(from, [to]);
  }
}

/** Nodes from which some gate (type "gate") is reachable, following directed adjacency. */
function reverseReachabilityFromGates(
  nodes: VenueNode[],
  adjacency: Map<string, string[]>,
): Set<string> {
  // Forward BFS from gates over reversed adjacency == nodes that can reach a gate.
  const reversed = new Map<string, string[]>();
  for (const [from, tos] of adjacency) {
    for (const to of tos) {
      pushAdjacency(reversed, to, from);
    }
  }
  const queue: string[] = nodes.filter((n) => n.type === "gate").map((n) => n.id);
  const visited = new Set(queue);
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const prev of reversed.get(current) ?? []) {
      if (!visited.has(prev)) {
        visited.add(prev);
        queue.push(prev);
      }
    }
  }
  return visited;
}

const SCENARIO_TOP_KEYS = new Set(["schemaVersion", "id", "name", "description", "operations"]);

const OP_SPECS: Record<
  string,
  { fields: { name: string; kind: "string" | "positive" | "nonNegativeInt" | "factor" }[] }
> = {
  disableEdge: { fields: [{ name: "edgeId", kind: "string" }] },
  enableEdge: { fields: [{ name: "edgeId", kind: "string" }] },
  setEdgeCapacity: {
    fields: [
      { name: "edgeId", kind: "string" },
      { name: "capacityPerMinute", kind: "positive" },
    ],
  },
  scaleEdgeCapacity: {
    fields: [
      { name: "edgeId", kind: "string" },
      { name: "factor", kind: "factor" },
    ],
  },
  setNodeOccupancy: {
    fields: [
      { name: "nodeId", kind: "string" },
      { name: "occupancy", kind: "nonNegativeInt" },
    ],
  },
  scaleNodeOccupancy: {
    fields: [
      { name: "nodeId", kind: "string" },
      { name: "factor", kind: "factor" },
    ],
  },
  closeNode: { fields: [{ name: "nodeId", kind: "string" }] },
  openNode: { fields: [{ name: "nodeId", kind: "string" }] },
};

/**
 * Structural validation of a scenario document (references are checked separately
 * by validateScenarioAgainstVenue once a base venue exists).
 */
export function validateScenarioDocument(input: unknown): {
  scenario?: ScenarioPatch;
  diagnostics: Diagnostic[];
} {
  const diagnostics: Diagnostic[] = [];

  if (!isObject(input)) {
    return {
      diagnostics: [error("E_INVALID_ROOT", "", "Scenario document must be a JSON object.")],
    };
  }

  checkUnknownKeys(input, SCENARIO_TOP_KEYS, "scenario", diagnostics);

  if (input.schemaVersion !== SCENARIO_SCHEMA_VERSION) {
    diagnostics.push(
      error(
        "E_UNSUPPORTED_SCHEMA_VERSION",
        "scenario.schemaVersion",
        `Unsupported scenario schemaVersion ${JSON.stringify(input.schemaVersion)}; expected "${SCENARIO_SCHEMA_VERSION}".`,
      ),
    );
  }
  if (typeof input.id !== "string" || input.id.length === 0) {
    diagnostics.push(
      error("E_INVALID_FIELD", "scenario.id", "scenario.id must be a non-empty string."),
    );
  }
  if (typeof input.name !== "string" || input.name.length === 0) {
    diagnostics.push(
      error("E_INVALID_FIELD", "scenario.name", "scenario.name must be a non-empty string."),
    );
  }
  if (
    input.description !== undefined &&
    (typeof input.description !== "string" || input.description.length === 0)
  ) {
    diagnostics.push(
      error(
        "E_INVALID_FIELD",
        "scenario.description",
        "scenario.description must be a non-empty string.",
      ),
    );
  }

  const operations: ScenarioOperation[] = [];
  if (!Array.isArray(input.operations)) {
    diagnostics.push(
      error("E_INVALID_FIELD", "scenario.operations", "operations must be an array."),
    );
  } else {
    for (let i = 0; i < input.operations.length; i++) {
      const raw = input.operations[i];
      const path = `scenario.operations[${i}]`;
      if (!isObject(raw)) {
        diagnostics.push(error("E_INVALID_FIELD", path, "Operation must be an object."));
        continue;
      }
      const opName = raw.op;
      if (typeof opName !== "string") {
        diagnostics.push(error("E_INVALID_OPERATION", `${path}.op`, `"op" must be a string.`));
        continue;
      }
      const spec = OP_SPECS[opName];
      if (!spec) {
        const known = Object.keys(OP_SPECS).sort(compareStrings).join(", ");
        diagnostics.push(
          error(
            "E_UNKNOWN_OPERATION",
            `${path}.op`,
            `Unknown operation "${opName}"; known operations: ${known}.`,
          ),
        );
        continue;
      }
      const allowed = new Set(["op", ...spec.fields.map((f) => f.name)]);
      checkUnknownKeys(raw, allowed, path, diagnostics);

      let valid = true;
      const built: Record<string, unknown> = { op: opName };
      for (const fieldSpec of spec.fields) {
        const value = raw[fieldSpec.name];
        switch (fieldSpec.kind) {
          case "string":
            if (typeof value !== "string" || value.length === 0) {
              diagnostics.push(
                error(
                  "E_INVALID_FIELD",
                  `${path}.${fieldSpec.name}`,
                  `${fieldSpec.name} must be a non-empty string.`,
                ),
              );
              valid = false;
            }
            break;
          case "positive":
            if (!isFiniteNumber(value) || value <= 0) {
              diagnostics.push(
                error(
                  "E_INVALID_FIELD",
                  `${path}.${fieldSpec.name}`,
                  `${fieldSpec.name} must be a finite number greater than 0.`,
                ),
              );
              valid = false;
            }
            break;
          case "factor":
            if (!isFiniteNumber(value) || value <= 0) {
              diagnostics.push(
                error(
                  "E_INVALID_FIELD",
                  `${path}.${fieldSpec.name}`,
                  `${fieldSpec.name} must be a finite number greater than 0.`,
                ),
              );
              valid = false;
            }
            break;
          case "nonNegativeInt":
            if (!isInteger(value) || value < 0) {
              diagnostics.push(
                error(
                  "E_INVALID_FIELD",
                  `${path}.${fieldSpec.name}`,
                  `${fieldSpec.name} must be an integer greater than or equal to 0.`,
                ),
              );
              valid = false;
            }
            break;
        }
        if (valid) built[fieldSpec.name] = value;
      }
      if (valid) operations.push(built as unknown as ScenarioOperation);
    }
  }

  if (diagnostics.some((d) => d.severity === "error")) {
    return { diagnostics };
  }

  const scenario: ScenarioPatch = {
    schemaVersion: SCENARIO_SCHEMA_VERSION,
    id: input.id as string,
    name: input.name as string,
    operations,
  };
  if (typeof input.description === "string") scenario.description = input.description;
  return { scenario, diagnostics };
}

/**
 * Semantic validation of a structurally valid scenario against its base venue:
 * reference resolution, contradiction rule, and value feasibility.
 */
export function validateScenarioAgainstVenue(
  base: VenueModel,
  scenario: ScenarioPatch,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const nodeById = new Map(base.nodes.map((n) => [n.id, n]));
  const edgeById = new Map(base.edges.map((e) => [e.id, e]));

  /** One op per (entity, field-pair): capacity ops on edges, enable/disable ops on
   * edges, occupancy ops on nodes, open/close ops on nodes. */
  const touchedEdgeCapacity = new Set<string>();
  const touchedEdgeEnabled = new Set<string>();
  const touchedNodeOccupancy = new Set<string>();
  const touchedNodeOpenClose = new Set<string>();

  for (let i = 0; i < scenario.operations.length; i++) {
    const op = scenario.operations[i];
    const path = `scenario.operations[${i}]`;
    const isEdgeOp =
      op.op === "disableEdge" ||
      op.op === "enableEdge" ||
      op.op === "setEdgeCapacity" ||
      op.op === "scaleEdgeCapacity";
    const targetId = isEdgeOp ? op.edgeId : (op as { nodeId: string }).nodeId;

    if (isEdgeOp) {
      const edge = edgeById.get(targetId);
      if (!edge) {
        diagnostics.push(
          error("E_UNKNOWN_REFERENCE", `${path}.edgeId`, `Unknown edge "${targetId}".`),
        );
        continue;
      }
      if (op.op === "setEdgeCapacity" || op.op === "scaleEdgeCapacity") {
        if (touchedEdgeCapacity.has(targetId)) {
          diagnostics.push(
            error(
              "E_CONTRADICTORY_OPERATIONS",
              path,
              `More than one capacity operation targets edge "${targetId}".`,
            ),
          );
          continue;
        }
        touchedEdgeCapacity.add(targetId);
        if (op.op === "setEdgeCapacity") continue;
        const factor = op.factor;
        const resulting = edge.capacityPerMinute * factor;
        if (!Number.isFinite(resulting) || resulting <= 0) {
          diagnostics.push(
            error(
              "E_ZERO_OR_NEGATIVE_CAPACITY",
              `${path}.factor`,
              `Scaling edge "${targetId}" by ${factor} yields non-positive capacity ${resulting}.`,
            ),
          );
          continue;
        }
      } else if (touchedEdgeEnabled.has(targetId)) {
        diagnostics.push(
          error(
            "E_CONTRADICTORY_OPERATIONS",
            path,
            `More than one enable/disable operation targets edge "${targetId}".`,
          ),
        );
        continue;
      } else {
        touchedEdgeEnabled.add(targetId);
      }
      continue;
    }

    const node = nodeById.get(targetId);
    if (!node) {
      diagnostics.push(
        error("E_UNKNOWN_REFERENCE", `${path}.nodeId`, `Unknown node "${targetId}".`),
      );
      continue;
    }
    if (op.op === "setNodeOccupancy" || op.op === "scaleNodeOccupancy") {
      if (touchedNodeOccupancy.has(targetId)) {
        diagnostics.push(
          error(
            "E_CONTRADICTORY_OPERATIONS",
            path,
            `More than one occupancy operation targets node "${targetId}".`,
          ),
        );
        continue;
      }
      touchedNodeOccupancy.add(targetId);
      const current = node.occupancy ?? 0;
      const resulting =
        op.op === "setNodeOccupancy" ? op.occupancy : Math.round(current * op.factor);
      if (resulting < 0) {
        diagnostics.push(
          error(
            "E_IMPOSSIBLE_OCCUPANCY",
            path,
            `Resulting occupancy ${resulting} for node "${targetId}" is negative.`,
          ),
        );
        continue;
      }
      if (node.capacity !== undefined && resulting > node.capacity) {
        diagnostics.push(
          error(
            "E_IMPOSSIBLE_OCCUPANCY",
            path,
            `Resulting occupancy ${resulting} for node "${targetId}" exceeds declared capacity ${node.capacity}.`,
          ),
        );
        continue;
      }
    } else if (op.op === "closeNode" || op.op === "openNode") {
      if (touchedNodeOpenClose.has(targetId)) {
        diagnostics.push(
          error(
            "E_CONTRADICTORY_OPERATIONS",
            path,
            `More than one open/close operation targets node "${targetId}".`,
          ),
        );
        continue;
      }
      touchedNodeOpenClose.add(targetId);
    }
  }

  return diagnostics;
}
