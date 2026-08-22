import {
  type EffectiveConfig,
  type ScenarioPatch,
  type VenueModel,
  type NodeType,
} from "./types";

export interface EffectiveNode {
  id: string;
  label: string;
  type: NodeType;
  x: number;
  y: number;
  occupancy: number;
  capacity?: number;
  accessible: boolean;
  closed: boolean;
}

export interface EffectiveEdge {
  id: string;
  from: string;
  to: string;
  directed: boolean;
  distanceMeters?: number;
  travelTimeSeconds?: number;
  capacityPerMinute: number;
  widthMeters?: number;
  enabled: boolean;
  stepFree: boolean;
}

export interface EffectiveVenue {
  id: string;
  name: string;
  nodes: EffectiveNode[];
  edges: EffectiveEdge[];
}

/** A directed traversal unit compiled from an edge (undirected edges compile to two arcs). */
export interface CompiledArc {
  key: string;
  edgeId: string;
  fromId: string;
  toId: string;
  capacityPerMinute: number;
  travelTimeSeconds: number;
  /** Routing cost under the active metric: seconds ("time") or meters ("distance"). */
  cost: number;
}

export interface CompiledGraph {
  venue: EffectiveVenue;
  config: EffectiveConfig;
  /** Nodes sorted by id; index positions used throughout the engine. */
  nodes: EffectiveNode[];
  nodeIndex: Map<string, number>;
  /** Traversable directed arcs, sorted by (fromId, toId, edgeId). */
  arcs: CompiledArc[];
  arcByKey: Map<string, CompiledArc>;
  outArcIndices: number[][];
  inArcIndices: number[][];
  exitNodeIds: string[];
  occupiedOriginIds: string[];
}

function normalizeVenue(base: VenueModel): EffectiveVenue {
  const nodes: EffectiveNode[] = base.nodes.map((node) => ({
    id: node.id,
    label: node.label,
    type: node.type,
    x: node.x,
    y: node.y,
    occupancy: node.occupancy ?? 0,
    capacity: node.capacity,
    accessible: node.accessible ?? true,
    closed: false,
  }));
  const edges: EffectiveEdge[] = base.edges.map((edge) => ({
    id: edge.id,
    from: edge.from,
    to: edge.to,
    directed: edge.directed ?? false,
    distanceMeters: edge.distanceMeters,
    travelTimeSeconds: edge.travelTimeSeconds,
    capacityPerMinute: edge.capacityPerMinute,
    widthMeters: edge.widthMeters,
    enabled: edge.enabled ?? true,
    stepFree: edge.stepFree ?? true,
  }));
  return { id: base.id, name: base.name, nodes, edges };
}

/**
 * Applies a validated scenario patch over a base venue. The base venue is never
 * mutated. Validation has already enforced at most one operation per
 * (entity, field) pair, so application order cannot change the outcome.
 */
export function applyScenario(
  base: VenueModel,
  scenario: ScenarioPatch | null,
): EffectiveVenue {
  const effective = normalizeVenue(base);
  if (!scenario) return effective;

  const nodeById = new Map(effective.nodes.map((n) => [n.id, n]));
  const edgeById = new Map(effective.edges.map((e) => [e.id, e]));

  for (const op of scenario.operations) {
    switch (op.op) {
      case "disableEdge":
        edgeById.get(op.edgeId)!.enabled = false;
        break;
      case "enableEdge":
        edgeById.get(op.edgeId)!.enabled = true;
        break;
      case "setEdgeCapacity":
        edgeById.get(op.edgeId)!.capacityPerMinute = op.capacityPerMinute;
        break;
      case "scaleEdgeCapacity": {
        const edge = edgeById.get(op.edgeId)!;
        edge.capacityPerMinute = edge.capacityPerMinute * op.factor;
        break;
      }
      case "setNodeOccupancy":
        nodeById.get(op.nodeId)!.occupancy = op.occupancy;
        break;
      case "scaleNodeOccupancy": {
        const node = nodeById.get(op.nodeId)!;
        node.occupancy = Math.round(node.occupancy * op.factor);
        break;
      }
      case "closeNode":
        nodeById.get(op.nodeId)!.closed = true;
        break;
      case "openNode":
        nodeById.get(op.nodeId)!.closed = false;
        break;
    }
  }
  return effective;
}

/** Deterministic arc key: tail | head | edgeId. */
export function makeArcKey(fromId: string, toId: string, edgeId: string): string {
  return `${fromId}|${toId}|${edgeId}`;
}

export function compileGraph(
  effective: EffectiveVenue,
  config: EffectiveConfig,
): CompiledGraph {
  const nodes = [...effective.nodes].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const nodeIndex = new Map(nodes.map((n, i) => [n.id, i]));
  const venue: EffectiveVenue = { ...effective, nodes };

  const closedOrBlocked = (edge: EffectiveEdge): boolean => {
    const fromNode = nodes[nodeIndex.get(edge.from)!];
    const toNode = nodes[nodeIndex.get(edge.to)!];
    return (
      !edge.enabled ||
      fromNode.closed ||
      toNode.closed ||
      (config.requireStepFreeTraversal && !edge.stepFree)
    );
  };

  const arcs: CompiledArc[] = [];
  for (const edge of venue.edges) {
    if (closedOrBlocked(edge)) continue;
    const travelTime =
      edge.travelTimeSeconds ?? edge.distanceMeters! / config.walkingSpeedMetersPerSecond;
    const cost = config.costMetric === "distance" ? edge.distanceMeters! : travelTime;
    arcs.push({
      key: makeArcKey(edge.from, edge.to, edge.id),
      edgeId: edge.id,
      fromId: edge.from,
      toId: edge.to,
      capacityPerMinute: edge.capacityPerMinute,
      travelTimeSeconds: travelTime,
      cost,
    });
    if (!edge.directed) {
      arcs.push({
        key: makeArcKey(edge.to, edge.from, edge.id),
        edgeId: edge.id,
        fromId: edge.to,
        toId: edge.from,
        capacityPerMinute: edge.capacityPerMinute,
        travelTimeSeconds: travelTime,
        cost,
      });
    }
  }

  arcs.sort(
    (a, b) =>
      compareStr(a.fromId, b.fromId) ||
      compareStr(a.toId, b.toId) ||
      compareStr(a.edgeId, b.edgeId),
  );

  const arcByKey = new Map(arcs.map((a) => [a.key, a]));
  const outArcIndices: number[][] = nodes.map(() => []);
  const inArcIndices: number[][] = nodes.map(() => []);
  arcs.forEach((arc, i) => {
    outArcIndices[nodeIndex.get(arc.fromId)!].push(i);
    inArcIndices[nodeIndex.get(arc.toId)!].push(i);
  });

  const exitNodeIds = nodes.filter((n) => n.type === "gate" && !n.closed).map((n) => n.id);
  const occupiedOriginIds = nodes
    .filter((n) => n.occupancy > 0 && !n.closed)
    .map((n) => n.id);

  return {
    venue,
    config,
    nodes,
    nodeIndex,
    arcs,
    arcByKey,
    outArcIndices,
    inArcIndices,
    exitNodeIds,
    occupiedOriginIds,
  };
}

function compareStr(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
