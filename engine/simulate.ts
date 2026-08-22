import { type CompiledGraph } from "./graph";
import { type RoutingResult } from "./routing";

export interface SimArcStat {
  arcKey: string;
  edgeId: string;
  fromId: string;
  toId: string;
  capacityPerMinute: number;
  /** People discharged by this arc across the whole run. */
  totalFlow: number;
  /** Time during which waiting demand strictly exceeded the arc's discharge allowance. */
  saturationSeconds: number;
  /** Largest number of people ever waiting to enter this arc. */
  peakQueue: number;
}

export type SimulationStatus = "completed" | "stranded" | "step-limit-reached";

export interface SimulationResult {
  status: SimulationStatus;
  timeStepSeconds: number;
  simulatedPopulation: number;
  evacuated: number;
  clearanceSeconds: number;
  perExitEvacuated: { exitId: string; people: number }[];
  arcStats: SimArcStat[];
  nodePeakQueue: Record<string, number>;
  curve: { tSeconds: number; evacuated: number }[];
}

/**
 * Deterministic discrete-time clearance simulation.
 *
 * Every person walks the route assigned to their origin by computeRouting. State is
 * aggregate integer counts per (node, next-arc) bucket plus per-arc in-transit
 * arrivals scheduled by step. Step order is fixed:
 *   1. process arrivals scheduled for this step (arc order),
 *   2. record queue statistics,
 *   3. discharge arcs in sorted order using a per-arc fractional credit carry
 *      (credit += capacityPerMinute * dt / 60; sendable = floor(credit)),
 *   4. run termination checks.
 * A person departing on an arc at step k arrives at step k + max(1, ceil(travelTime/dt)).
 *
 * Invariants enforced and asserted every step:
 *   simulatedPopulation === evacuated + inTransit + queued
 *   no queue, flow, or in-transit quantity is ever negative.
 */
export function simulateClearance(
  graph: CompiledGraph,
  routing: RoutingResult,
): SimulationResult {
  const dt = graph.config.timeStepSeconds;
  const m = graph.arcs.length;
  const n = graph.nodes.length;

  let simulatedPopulation = 0;
  const buckets: Map<number, number>[] = [];
  for (let v = 0; v < n; v++) buckets.push(new Map());

  // Seed reachable origins along their route's first hop.
  for (const route of routing.routes) {
    if (!route.reachable) continue;
    simulatedPopulation += route.occupancy;
    const originIdx = graph.nodeIndex.get(route.originId)!;
    const firstArcIndex = routing.nextArcIndex[originIdx];
    if (firstArcIndex === -1) {
      throw new Error(
        `Reachable origin "${route.originId}" has no first hop; routing inconsistency.`,
      );
    }
    const bucket = buckets[originIdx];
    bucket.set(firstArcIndex, (bucket.get(firstArcIndex) ?? 0) + route.occupancy);
  }

  if (simulatedPopulation === 0) {
    return {
      status: "completed",
      timeStepSeconds: dt,
      simulatedPopulation: 0,
      evacuated: 0,
      clearanceSeconds: 0,
      perExitEvacuated: [],
      arcStats: [],
      nodePeakQueue: {},
      curve: [{ tSeconds: 0, evacuated: 0 }],
    };
  }

  const pendingArrivals = new Map<number, { arcIdx: number; count: number }[]>();
  let inTransitTotal = 0;

  const arcFlow = new Array<number>(m).fill(0);
  const arcSaturationSteps = new Array<number>(m).fill(0);
  const arcPeakQueue = new Array<number>(m).fill(0);
  const credit = new Array<number>(m).fill(0);
  const nodePeakQueue = new Array<number>(n).fill(0);

  let evacuatedTotal = 0;
  const evacuatedByExitIdx = new Map<number, number>();
  let lastArrivalStep = 0;
  let status: SimulationStatus = "completed";
  const minutesPerStep = dt / 60;
  const evacuatedHistory: number[] = [];

  for (let step = 0; step < graph.config.maxSimulationSteps; step++) {
    // 1. Arrivals scheduled for this step (processed in arc order).
    const arrivals = pendingArrivals.get(step);
    if (arrivals !== undefined) {
      pendingArrivals.delete(step);
      arrivals.sort((a, b) => a.arcIdx - b.arcIdx);
      for (const { arcIdx, count } of arrivals) {
        const headId = graph.arcs[arcIdx].toId;
        const headIdx = graph.nodeIndex.get(headId)!;
        inTransitTotal -= count;
        if (graph.nodes[headIdx].type === "gate") {
          evacuatedTotal += count;
          evacuatedByExitIdx.set(headIdx, (evacuatedByExitIdx.get(headIdx) ?? 0) + count);
        } else {
          const nextArcIdx = routing.nextArcIndex[headIdx];
          if (nextArcIdx === -1) {
            throw new Error(
              `Arrival at non-exit node "${headId}" without a successor arc; routing inconsistency.`,
            );
          }
          const bucket = buckets[headIdx];
          bucket.set(nextArcIdx, (bucket.get(nextArcIdx) ?? 0) + count);
        }
        lastArrivalStep = Math.max(lastArrivalStep, step);
      }
    }

    // 2. Queue statistics snapshots.
    for (let v = 0; v < n; v++) {
      let waitingAtNode = 0;
      for (const count of buckets[v].values()) waitingAtNode += count;
      if (waitingAtNode > nodePeakQueue[v]) nodePeakQueue[v] = waitingAtNode;
    }
    for (let a = 0; a < m; a++) {
      const tailIdx = graph.nodeIndex.get(graph.arcs[a].fromId)!;
      const waiting = buckets[tailIdx].get(a) ?? 0;
      if (waiting > arcPeakQueue[a]) arcPeakQueue[a] = waiting;
    }

    // 3. Discharge arcs in sorted order with fractional credit carry.
    let movedThisStep = 0;
    for (let a = 0; a < m; a++) {
      const arc = graph.arcs[a];
      const tailIdx = graph.nodeIndex.get(arc.fromId)!;
      const bucket = buckets[tailIdx];
      const waiting = bucket.get(a);
      if (waiting === undefined || waiting === 0) continue;
      const headIdx = graph.nodeIndex.get(arc.toId)!;
      const headIsGate = graph.nodes[headIdx].type === "gate";
      if (!headIsGate && routing.nextArcIndex[headIdx] === -1) continue;

      credit[a] += arc.capacityPerMinute * minutesPerStep;
      let sendable = Math.floor(credit[a]);
      credit[a] -= sendable;
      if (waiting <= sendable) {
        sendable = waiting;
      } else {
        arcSaturationSteps[a] += 1;
      }

      bucket.set(a, waiting - sendable);
      arcFlow[a] += sendable;
      movedThisStep += sendable;
      inTransitTotal += sendable;
      const arrivalStep = step + Math.max(1, Math.ceil(arc.travelTimeSeconds / dt));
      lastArrivalStep = Math.max(lastArrivalStep, arrivalStep);
      const list = pendingArrivals.get(arrivalStep);
      if (list === undefined) {
        pendingArrivals.set(arrivalStep, [{ arcIdx: a, count: sendable }]);
      } else {
        list.push({ arcIdx: a, count: sendable });
      }
    }

    // Invariants (running totals; totalQueued also re-checks non-negativity).
    const queuedTotal = totalQueued(buckets);
    const accounted = evacuatedTotal + inTransitTotal + queuedTotal;
    if (
      accounted !== simulatedPopulation ||
      inTransitTotal < 0 ||
      evacuatedTotal < 0 ||
      movedThisStep < 0
    ) {
      throw new Error(
        `Simulation invariant violated at step ${step}: accounted=${accounted} simulated=${simulatedPopulation} inTransit=${inTransitTotal} evacuated=${evacuatedTotal}`,
      );
    }

    // 4. Termination checks.
    evacuatedHistory.push(evacuatedTotal);
    if (inTransitTotal === 0 && queuedTotal === 0) break;
    if (movedThisStep === 0 && inTransitTotal === 0) {
      status = "stranded";
      break;
    }
    if (step === graph.config.maxSimulationSteps - 1) {
      status = "step-limit-reached";
    }
  }

  const clearanceSeconds =
    status === "completed" || status === "stranded"
      ? lastArrivalStep * dt
      : graph.config.maxSimulationSteps * dt;

  const arcStats: SimArcStat[] = [];
  for (let a = 0; a < m; a++) {
    if (arcFlow[a] === 0 && arcPeakQueue[a] === 0) continue;
    const arc = graph.arcs[a];
    arcStats.push({
      arcKey: arc.key,
      edgeId: arc.edgeId,
      fromId: arc.fromId,
      toId: arc.toId,
      capacityPerMinute: arc.capacityPerMinute,
      totalFlow: arcFlow[a],
      saturationSeconds: arcSaturationSteps[a] * dt,
      peakQueue: arcPeakQueue[a],
    });
  }
  arcStats.sort((a, b) =>
    a.arcKey < b.arcKey ? -1 : a.arcKey > b.arcKey ? 1 : 0,
  );

  const perExitEvacuated = [...evacuatedByExitIdx.entries()]
    .map(([idx, people]) => ({ exitId: graph.nodes[idx].id, people }))
    .sort((a, b) => (a.exitId < b.exitId ? -1 : a.exitId > b.exitId ? 1 : 0));

  const nodePeakQueueMap: Record<string, number> = {};
  for (let v = 0; v < n; v++) {
    if (nodePeakQueue[v] > 0) nodePeakQueueMap[graph.nodes[v].id] = nodePeakQueue[v];
  }

  return {
    status,
    timeStepSeconds: dt,
    simulatedPopulation,
    evacuated: evacuatedTotal,
    clearanceSeconds,
    perExitEvacuated,
    arcStats,
    nodePeakQueue: nodePeakQueueMap,
    curve: buildCurve(evacuatedHistory, dt),
  };
}

/** Downsample the per-step evacuation history to at most ~200 points, ending at the final state. */
function buildCurve(
  history: number[],
  dt: number,
): { tSeconds: number; evacuated: number }[] {
  const curve: { tSeconds: number; evacuated: number }[] = [];
  curve.push({ tSeconds: 0, evacuated: 0 });
  if (history.length === 0) return curve;
  const stride = Math.max(1, Math.ceil(history.length / 200));
  for (let i = stride - 1; i < history.length; i += stride) {
    curve.push({ tSeconds: (i + 1) * dt, evacuated: history[i] });
  }
  const last = curve[curve.length - 1]!;
  const finalPoint = {
    tSeconds: history.length * dt,
    evacuated: history[history.length - 1]!,
  };
  if (last.tSeconds !== finalPoint.tSeconds) curve.push(finalPoint);
  return curve;
}

function totalQueued(buckets: Map<number, number>[]): number {
  let total = 0;
  for (const bucket of buckets) {
    for (const count of bucket.values()) {
      if (count < 0) throw new Error("Negative queue invariant violated.");
      total += count;
    }
  }
  return total;
}
