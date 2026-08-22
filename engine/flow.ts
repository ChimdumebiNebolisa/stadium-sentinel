import { type CompiledGraph } from "./graph";

export type FlowArcRef =
  | { kind: "edge"; edgeId: string }
  | { kind: "nodeCapacity"; nodeId: string };

export interface ExitThroughput {
  exitId: string;
  flowPerMinute: number;
}

export interface MinCutResult {
  /** Arcs crossing from side A to side B (all saturated), mapped back to model references. */
  arcRefs: FlowArcRef[];
  /** Model node ids on the source side of the cut, sorted ascending. */
  sideANodeIds: string[];
}

export interface MaxFlowResult {
  maxFlowPerMinute: number;
  perExitThroughput: ExitThroughput[];
  minCut: MinCutResult;
  /** Total assigned flow per edge id (both directions summed), only positive entries. */
  flowByEdgeId: Record<string, number>;
}

export interface MaxFlowExclusions {
  excludedEdgeIds?: ReadonlySet<string>;
  excludedExitIds?: ReadonlySet<string>;
}

const SOURCE = 0;
const SINK = 1;

interface ForwardArcRecord {
  fromSlot: number;
  entryIndex: number;
  initialCap: number;
  ref: FlowArcRef | null;
}

/** Deterministic Dinic network with explicit parallel-arc pairing. */
class FlowNetwork {
  readonly slotCount: number;
  private to: number[][] = [];
  private cap: number[][] = [];
  private rev: number[][] = [];
  private forwards: ForwardArcRecord[] = [];

  constructor(slotCount: number) {
    this.slotCount = slotCount;
    for (let i = 0; i < slotCount; i++) {
      this.to.push([]);
      this.cap.push([]);
      this.rev.push([]);
    }
  }

  /** Adds a directed arc plus its zero-capacity reverse; returns forward record index. */
  addArc(fromSlot: number, toSlot: number, capacity: number, ref: FlowArcRef | null): number {
    const fwdEntry = this.to[fromSlot].length;
    const revEntry = this.to[toSlot].length;
    this.to[fromSlot].push(toSlot);
    this.cap[fromSlot].push(capacity);
    this.rev[fromSlot].push(revEntry);
    this.to[toSlot].push(fromSlot);
    this.cap[toSlot].push(0);
    this.rev[toSlot].push(fwdEntry);
    const recordIndex = this.forwards.length;
    this.forwards.push({ fromSlot, entryIndex: fwdEntry, initialCap: capacity, ref });
    return recordIndex;
  }

  residual(fromSlot: number, entryIndex: number): number {
    return this.cap[fromSlot][entryIndex];
  }

  maxFlow(source: number, sink: number): number {
    const level = new Array<number>(this.slotCount).fill(-1);
    const iterPtr = new Array<number>(this.slotCount).fill(0);

    const bfsLevels = (): boolean => {
      level.fill(-1);
      level[source] = 0;
      const queue: number[] = [source];
      for (let qh = 0; qh < queue.length; qh++) {
        const v = queue[qh];
        for (let e = 0; e < this.to[v].length; e++) {
          const w = this.to[v][e];
          if (this.cap[v][e] > 0 && level[w] === -1) {
            level[w] = level[v] + 1;
            queue.push(w);
          }
        }
      }
      return level[sink] !== -1;
    };

    const sendBlocking = (v: number, pushed: number): number => {
      if (v === sink || pushed === 0) return pushed;
      for (; iterPtr[v] < this.to[v].length; iterPtr[v]++) {
        const e = iterPtr[v];
        const w = this.to[v][e];
        if (this.cap[v][e] <= 0 || level[w] !== level[v] + 1) continue;
        const sent = sendBlocking(w, Math.min(pushed, this.cap[v][e]));
        if (sent > 0) {
          this.cap[v][e] -= sent;
          this.cap[w][this.rev[v][e]] += sent;
          return sent;
        }
      }
      return 0;
    };

    let total = 0;
    while (bfsLevels()) {
      iterPtr.fill(0);
      for (;;) {
        const pushed = sendBlocking(source, Number.POSITIVE_INFINITY);
        if (pushed === 0) break;
        total += pushed;
      }
    }
    return total;
  }

  /** Residual reachability side A from a node after flow has been run. */
  reachableSide(fromSlot: number): boolean[] {
    const side = new Array<boolean>(this.slotCount).fill(false);
    side[fromSlot] = true;
    const queue: number[] = [fromSlot];
    for (let qh = 0; qh < queue.length; qh++) {
      const v = queue[qh];
      for (let e = 0; e < this.to[v].length; e++) {
        const w = this.to[v][e];
        if (!side[w] && this.cap[v][e] > 0) {
          side[w] = true;
          queue.push(w);
        }
      }
    }
    return side;
  }

  getForwardRecords(): ForwardArcRecord[] {
    return this.forwards;
  }

  getForwardTarget(rec: ForwardArcRecord): number {
    return this.to[rec.fromSlot][rec.entryIndex];
  }

  usedFlow(recordIndex: number): number {
    const rec = this.forwards[recordIndex];
    return rec.initialCap - this.cap[rec.fromSlot][rec.entryIndex];
  }
}

/**
 * Dinic max-flow over the compiled graph with optional element exclusions.
 *
 * Modeling decisions (see docs/DESIGN.md §3.3):
 * - Super-source connects to every open occupied origin with a capacity far above any
 *   achievable flow, so the result measures the network's maximum sustainable egress
 *   rate (people/minute), independent of demand size.
 * - Nodes declaring `capacity` are split into in/out halves joined by an arc equal to
 *   the declared stock applied as people/minute-equivalent (one full turnover per
 *   minute assumption).
 * - Undirected edges contribute two independent directed arcs at full capacity each.
 * - Construction order is deterministic, so results — including flow assignment —
 *   are reproducible.
 */
export function computeMaxFlow(
  graph: CompiledGraph,
  exclusions: MaxFlowExclusions = {},
): MaxFlowResult {
  const excludedEdges = exclusions.excludedEdgeIds ?? new Set<string>();
  const excludedExits = exclusions.excludedExitIds ?? new Set<string>();

  const n = graph.nodes.length;
  const inSlot = new Array<number>(n);
  const outSlot = new Array<number>(n);
  let nextSlot = 2;
  for (let i = 0; i < n; i++) {
    inSlot[i] = nextSlot++;
    outSlot[i] = graph.nodes[i].capacity !== undefined ? nextSlot++ : inSlot[i];
  }

  const network = new FlowNetwork(nextSlot);
  const splitRecordByNode = new Map<number, number>();
  const traversalRecords: { recordIndex: number; edgeId: string }[] = [];
  const exitSinkRecords = new Map<string, number>();

  let capacityBound = 0;

  for (let i = 0; i < n; i++) {
    const node = graph.nodes[i];
    if (node.capacity !== undefined) {
      const rec = network.addArc(inSlot[i], outSlot[i], node.capacity, {
        kind: "nodeCapacity",
        nodeId: node.id,
      });
      splitRecordByNode.set(i, rec);
      capacityBound += node.capacity;
    }
  }

  for (const arc of graph.arcs) {
    if (excludedEdges.has(arc.edgeId)) continue;
    const fromIdx = graph.nodeIndex.get(arc.fromId)!;
    const toIdx = graph.nodeIndex.get(arc.toId)!;
    const rec = network.addArc(outSlot[fromIdx], inSlot[toIdx], arc.capacityPerMinute, {
      kind: "edge",
      edgeId: arc.edgeId,
    });
    traversalRecords.push({ recordIndex: rec, edgeId: arc.edgeId });
    capacityBound += arc.capacityPerMinute;
  }

  const BIG = capacityBound * 4 + 16;

  for (const exitId of graph.exitNodeIds) {
    if (excludedExits.has(exitId)) continue;
    const idx = graph.nodeIndex.get(exitId)!;
    const rec = network.addArc(inSlot[idx], SINK, BIG, null);
    exitSinkRecords.set(exitId, rec);
  }

  for (const originId of graph.occupiedOriginIds) {
    const idx = graph.nodeIndex.get(originId)!;
    network.addArc(SOURCE, inSlot[idx], BIG, null);
  }

  const totalFlow = network.maxFlow(SOURCE, SINK);

  // Min-cut via residual reachability.
  const side = network.reachableSide(SOURCE);
  const cutRefs: FlowArcRef[] = [];
  for (const rec of network.getForwardRecords()) {
    if (rec.ref === null) continue;
    if (side[rec.fromSlot] && !side[network.getForwardTarget(rec)]) {
      cutRefs.push(rec.ref);
    }
  }
  const sideANodeIds: string[] = [];
  for (let i = 0; i < n; i++) {
    if (side[inSlot[i]]) sideANodeIds.push(graph.nodes[i].id);
  }

  const perExitThroughput: ExitThroughput[] = [];
  for (const [exitId, rec] of [...exitSinkRecords].sort((a, b) =>
    a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
  )) {
    perExitThroughput.push({ exitId, flowPerMinute: network.usedFlow(rec) });
  }
  perExitThroughput.sort((a, b) =>
    b.flowPerMinute !== a.flowPerMinute
      ? b.flowPerMinute - a.flowPerMinute
      : a.exitId < b.exitId
        ? -1
        : 1,
  );

  const flowByEdgeId: Record<string, number> = {};
  for (const { recordIndex, edgeId } of traversalRecords) {
    const used = network.usedFlow(recordIndex);
    if (used > 0) {
      flowByEdgeId[edgeId] = (flowByEdgeId[edgeId] ?? 0) + used;
    }
  }

  return {
    maxFlowPerMinute: totalFlow,
    perExitThroughput,
    minCut: { arcRefs: cutRefs, sideANodeIds },
    flowByEdgeId,
  };
}

export interface CriticalityEntry {
  kind: "edge" | "exit";
  refId: string;
  deltaMaxFlow: number;
}

export interface CriticalityResult {
  entries: CriticalityEntry[];
  cappedAtLimit: boolean;
}

/**
 * Single-element removal impact on maximum flow, evaluated only for elements that
 * carried positive baseline flow: removing a zero-flow element cannot reduce
 * max-flow because the baseline assignment remains feasible without it.
 * Results sort by delta desc, then reference id ascending.
 */
export function computeFlowCriticality(
  graph: CompiledGraph,
  baseline: MaxFlowResult,
  limit: number,
): CriticalityResult {
  const candidates: { kind: "edge" | "exit"; refId: string }[] = [];
  for (const t of baseline.perExitThroughput) {
    if (t.flowPerMinute > 0) candidates.push({ kind: "exit", refId: t.exitId });
  }
  for (const edgeId of Object.keys(baseline.flowByEdgeId).sort()) {
    candidates.push({ kind: "edge", refId: edgeId });
  }

  const entries: CriticalityEntry[] = [];
  for (const candidate of candidates.slice(0, limit)) {
    const exclusions: MaxFlowExclusions =
      candidate.kind === "edge"
        ? { excludedEdgeIds: new Set([candidate.refId]) }
        : { excludedExitIds: new Set([candidate.refId]) };
    const reduced = computeMaxFlow(graph, exclusions);
    entries.push({
      kind: candidate.kind,
      refId: candidate.refId,
      deltaMaxFlow: baseline.maxFlowPerMinute - reduced.maxFlowPerMinute,
    });
  }

  entries.sort((a, b) =>
    b.deltaMaxFlow !== a.deltaMaxFlow
      ? b.deltaMaxFlow - a.deltaMaxFlow
      : a.refId < b.refId
        ? -1
        : 1,
  );
  return { entries, cappedAtLimit: candidates.length > limit };
}
