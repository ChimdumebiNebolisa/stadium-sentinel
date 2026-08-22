import { compareStrings } from "./validation";
import { type CompiledArc, type CompiledGraph } from "./graph";

export interface OriginRoute {
  originId: string;
  occupancy: number;
  reachable: boolean;
  exitId?: string;
  cost?: number;
  pathNodeIds?: string[];
  pathArcKeys?: string[];
}

export interface RoutingResult {
  costMetric: "time" | "distance";
  costUnit: "seconds" | "meters";
  /** Least cost to the best open exit per node index (Infinity when unreachable). */
  dist: number[];
  /** Chosen outgoing arc index per node (-1 when none). */
  nextArcIndex: number[];
  routes: OriginRoute[];
}

/** Binary min-heap keyed by (dist, nodeId) with code-unit tie-breaking. */
class MinHeap {
  private keys: number[] = [];
  private ids: string[] = [];

  get size(): number {
    return this.keys.length;
  }

  push(dist: number, id: string): void {
    this.keys.push(dist);
    this.ids.push(id);
    let i = this.keys.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.before(i, parent)) {
        this.swap(i, parent);
        i = parent;
      } else break;
    }
  }

  pop(): { dist: number; id: string } | undefined {
    if (this.keys.length === 0) return undefined;
    const top = { dist: this.keys[0], id: this.ids[0] };
    const lastKey = this.keys.pop()!;
    const lastId = this.ids.pop()!;
    if (this.keys.length > 0) {
      this.keys[0] = lastKey;
      this.ids[0] = lastId;
      let i = 0;
      for (;;) {
        const left = i * 2 + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.keys.length && this.before(left, smallest)) smallest = left;
        if (right < this.keys.length && this.before(right, smallest)) smallest = right;
        if (smallest === i) break;
        this.swap(i, smallest);
        i = smallest;
      }
    }
    return top;
  }

  private before(a: number, b: number): boolean {
    const ka = this.keys[a];
    const kb = this.keys[b];
    if (ka !== kb) return ka < kb;
    return this.ids[a] < this.ids[b];
  }

  private swap(a: number, b: number): void {
    const k = this.keys[a];
    this.keys[a] = this.keys[b];
    this.keys[b] = k;
    const id = this.ids[a];
    this.ids[a] = this.ids[b];
    this.ids[b] = id;
  }
}

const INFINITY_DIST = Number.POSITIVE_INFINITY;

/**
 * Reverse Dijkstra from a virtual sink connected to all open exits with zero-cost
 * arcs. dist[v] is the least routing cost from v to its best reachable exit.
 *
 * Tie-breaking is fully deterministic: after distances converge, nodes are settled
 * in ascending-dist order and each node's chosen successor is the valid successor
 * arc (dist[u] === cost(arc) + dist[to]) with the lexicographically smallest
 * (toId, edgeId), compared by UTF-16 code units.
 */
export function computeRouting(graph: CompiledGraph): RoutingResult {
  const n = graph.nodes.length;
  const dist = new Array<number>(n).fill(INFINITY_DIST);
  const settled = new Array<boolean>(n).fill(false);
  const heap = new MinHeap();

  for (const exitId of graph.exitNodeIds) {
    const idx = graph.nodeIndex.get(exitId)!;
    dist[idx] = 0;
    heap.push(0, exitId);
  }

  while (heap.size > 0) {
    const top = heap.pop()!;
    const uIdx = graph.nodeIndex.get(top.id)!;
    if (settled[uIdx]) continue;
    // Lazy deletion: skip stale entries.
    if (top.dist !== dist[uIdx]) continue;
    settled[uIdx] = true;
    for (const arcIdx of graph.inArcIndices[uIdx]) {
      const arc = graph.arcs[arcIdx];
      const vIdx = graph.nodeIndex.get(arc.fromId)!;
      if (settled[vIdx]) continue;
      const candidate = dist[uIdx] + arc.cost;
      if (candidate < dist[vIdx]) {
        dist[vIdx] = candidate;
        heap.push(candidate, arc.fromId);
      }
    }
  }

  // Deterministic successor selection.
  const nextArcIndex = new Array<number>(n).fill(-1);
  const order = graph.nodes
    .map((node, idx) => ({ idx, id: node.id, dist: dist[idx] }))
    .sort((a, b) => a.dist - b.dist || compareStrings(a.id, b.id));
  for (const entry of order) {
    if (!Number.isFinite(entry.dist)) continue;
    const candidates = [...graph.outArcIndices[entry.idx]].sort((a, b) => {
      const arcA = graph.arcs[a];
      const arcB = graph.arcs[b];
      return (
        compareStrings(arcA.toId, arcB.toId) || compareStrings(arcA.edgeId, arcB.edgeId)
      );
    });
    for (const arcIdx of candidates) {
      const arc = graph.arcs[arcIdx];
      const toIdx = graph.nodeIndex.get(arc.toId)!;
      if (!Number.isFinite(dist[toIdx])) continue;
      if (entry.dist === arc.cost + dist[toIdx]) {
        nextArcIndex[entry.idx] = arcIdx;
        break;
      }
    }
  }

  const routes: OriginRoute[] = [];
  for (const originId of graph.occupiedOriginIds) {
    const originIdx = graph.nodeIndex.get(originId)!;
    const occupancy = graph.nodes[originIdx].occupancy;
    if (!Number.isFinite(dist[originIdx])) {
      routes.push({ originId, occupancy, reachable: false });
      continue;
    }
    const pathNodeIds: string[] = [originId];
    const pathArcKeys: string[] = [];
    let current = originIdx;
    const visited = new Set<number>([originIdx]);
    while (nextArcIndex[current] !== -1) {
      const arc: CompiledArc = graph.arcs[nextArcIndex[current]];
      pathArcKeys.push(arc.key);
      const toIdx = graph.nodeIndex.get(arc.toId)!;
      pathNodeIds.push(arc.toId);
      if (visited.has(toIdx)) break; // Defensive: zero-cost cycle guard.
      visited.add(toIdx);
      current = toIdx;
      if (graph.nodes[current].type === "gate") break;
    }
    const exitId = graph.nodes[current].type === "gate" ? graph.nodes[current].id : undefined;
    routes.push({
      originId,
      occupancy,
      reachable: exitId !== undefined,
      exitId,
      cost: dist[originIdx],
      pathNodeIds,
      pathArcKeys,
    });
  }
  routes.sort((a, b) => compareStrings(a.originId, b.originId));

  return {
    costMetric: graph.config.costMetric,
    costUnit: graph.config.costMetric === "distance" ? "meters" : "seconds",
    dist,
    nextArcIndex,
    routes,
  };
}
