import { type AnalysisResult } from "./analyze";
import type { FlowArcRef } from "./flow";

export interface ComparisonRow {
  field: string;
  unit: string | null;
  baseline: number;
  scenario: number;
  delta: number;
}

export interface ExitThroughputComparison {
  exitId: string;
  baseline: number;
  scenario: number;
  delta: number;
}

export interface RouteChange {
  originId: string;
  baselineExitId: string | null;
  scenarioExitId: string | null;
}

export interface ComparisonResult {
  rows: ComparisonRow[];
  exitThroughput: ExitThroughputComparison[];
  routeChanges: RouteChange[];
  topBottlenecks: { baseline: string[]; scenario: string[] };
  cutSets: { baseline: FlowArcRef[]; scenario: FlowArcRef[] };
  fingerprints: { baseline: string; scenario: string };
}

function refKey(ref: FlowArcRef): string {
  return ref.kind === "edge" ? `edge:${ref.edgeId}` : `nodeCapacity:${ref.nodeId}`;
}

/** Deterministic field-by-field comparison of two analysis results. */
export function compareResults(
  baseline: AnalysisResult,
  scenario: AnalysisResult,
): ComparisonResult {
  const rows: ComparisonRow[] = [
    {
      field: "reachablePopulation",
      unit: "people",
      baseline: baseline.reachability.reachablePopulation,
      scenario: scenario.reachability.reachablePopulation,
      delta:
        scenario.reachability.reachablePopulation -
        baseline.reachability.reachablePopulation,
    },
    {
      field: "isolatedPopulation",
      unit: "people",
      baseline: baseline.reachability.isolatedPopulation,
      scenario: scenario.reachability.isolatedPopulation,
      delta:
        scenario.reachability.isolatedPopulation - baseline.reachability.isolatedPopulation,
    },
    {
      field: "estimatedClearanceTime",
      unit: "seconds",
      baseline: baseline.simulation.clearanceSeconds,
      scenario: scenario.simulation.clearanceSeconds,
      delta: scenario.simulation.clearanceSeconds - baseline.simulation.clearanceSeconds,
    },
    {
      field: "maxTheoreticalFlow",
      unit: "people/minute",
      baseline: baseline.flow.maxFlowPerMinute,
      scenario: scenario.flow.maxFlowPerMinute,
      delta: scenario.flow.maxFlowPerMinute - baseline.flow.maxFlowPerMinute,
    },
    {
      field: "simulatedEvacuated",
      unit: "people",
      baseline: baseline.simulation.evacuated,
      scenario: scenario.simulation.evacuated,
      delta: scenario.simulation.evacuated - baseline.simulation.evacuated,
    },
  ];

  const exitIds = [
    ...new Set([
      ...baseline.flow.perExitThroughput.map((t) => t.exitId),
      ...scenario.flow.perExitThroughput.map((t) => t.exitId),
    ]),
  ].sort();
  const baselineByExit = new Map(baseline.flow.perExitThroughput.map((t) => [t.exitId, t.flowPerMinute]));
  const scenarioByExit = new Map(scenario.flow.perExitThroughput.map((t) => [t.exitId, t.flowPerMinute]));
  const exitThroughput = exitIds.map((exitId) => {
    const b = baselineByExit.get(exitId) ?? 0;
    const s = scenarioByExit.get(exitId) ?? 0;
    return { exitId, baseline: b, scenario: s, delta: s - b };
  });

  const baselineByOrigin = new Map(
    baseline.reachability.occupiedOrigins
      .filter((o) => o.reachable)
      .map((o) => [o.originId, o.assignedExitId ?? null]),
  );
  const scenarioByOrigin = new Map(
    scenario.reachability.occupiedOrigins
      .filter((o) => o.reachable)
      .map((o) => [o.originId, o.assignedExitId ?? null]),
  );
  const originIds = [...new Set([...baselineByOrigin.keys(), ...scenarioByOrigin.keys()])].sort();
  const routeChanges: RouteChange[] = [];
  for (const originId of originIds) {
    const b = baselineByOrigin.get(originId) ?? null;
    const s = scenarioByOrigin.get(originId) ?? null;
    if (b !== s) routeChanges.push({ originId, baselineExitId: b, scenarioExitId: s });
  }

  return {
    rows,
    exitThroughput,
    routeChanges,
    topBottlenecks: {
      baseline: baseline.bottlenecks.map((b) => b.refId),
      scenario: scenario.bottlenecks.map((b) => b.refId),
    },
    cutSets: {
      baseline: [...baseline.flow.minCut.arcRefs].sort((a, b) =>
        refKey(a) < refKey(b) ? -1 : 1,
      ),
      scenario: [...scenario.flow.minCut.arcRefs].sort((a, b) =>
        refKey(a) < refKey(b) ? -1 : 1,
      ),
    },
    fingerprints: { baseline: baseline.fingerprint, scenario: scenario.fingerprint },
  };
}
