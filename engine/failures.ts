import { type ScenarioPatch } from "./types";
import { SCENARIO_SCHEMA_VERSION } from "./version";
import { applyScenario, type EffectiveVenue } from "./graph";
import { compareResults } from "./compare";
import { analyzeVenue, resolveConfig, type AnalysisResult } from "./analyze";

export interface FailureSweepEntry {
  scenarioId: string;
  scenarioName: string;
  summary: {
    maxFlowPerMinute: number;
    clearanceSeconds: number;
    isolatedPopulation: number;
    reachablePopulation: number;
  };
  delta: {
    maxFlowPerMinute: number;
    clearanceSeconds: number;
    isolatedPopulation: number;
    changedExitAssignments: number;
  };
}

export interface FailureSweepResult {
  baseline: AnalysisResult;
  entries: FailureSweepEntry[];
}

function makePatch(
  id: string,
  name: string,
  operations: ScenarioPatch["operations"],
): ScenarioPatch {
  return { schemaVersion: SCENARIO_SCHEMA_VERSION, id, name, operations };
}

/**
 * Generates deterministic single-element failure scenarios:
 * - every open gate closed individually,
 * - the top-N connectors (by baseline carried flow, then declared capacity) removed individually,
 * - capacity reductions on those connectors at configured factors.
 */
export function generateFailureScenarios(
  effectiveBase: EffectiveVenue,
  options: {
    connectorTopN: number;
    capacityFactors: number[];
    baselineFlowByEdgeId: Record<string, number>;
  },
): ScenarioPatch[] {
  const patches: ScenarioPatch[] = [];

  const gates = effectiveBase.nodes
    .filter((n) => n.type === "gate" && !n.closed)
    .map((n) => n.id)
    .sort();
  for (const gateId of gates) {
    patches.push(
      makePatch(`fail-gate-${gateId}`, `Close ${gateId}`, [
        { op: "closeNode", nodeId: gateId },
      ]),
    );
  }

  const connectors = effectiveBase.edges
    .filter((e) => e.enabled)
    .slice()
    .sort((a, b) => {
      const fa = options.baselineFlowByEdgeId[a.id] ?? 0;
      const fb = options.baselineFlowByEdgeId[b.id] ?? 0;
      if (fa !== fb) return fb - fa;
      if (a.capacityPerMinute !== b.capacityPerMinute) {
        return b.capacityPerMinute - a.capacityPerMinute;
      }
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    })
    .slice(0, options.connectorTopN);

  for (const edge of connectors) {
    patches.push(
      makePatch(`fail-edge-${edge.id}`, `Remove connector ${edge.id}`, [
        { op: "disableEdge", edgeId: edge.id },
      ]),
    );
  }
  for (const edge of connectors) {
    for (const factor of options.capacityFactors) {
      const pct = Math.round((1 - factor) * 100);
      patches.push(
        makePatch(`reduce-edge-${edge.id}-${pct}pct`, `Reduce ${edge.id} to ${pct}%`, [
          { op: "scaleEdgeCapacity", edgeId: edge.id, factor },
        ]),
      );
    }
  }

  return patches;
}

/** Baseline analysis plus a full sweep of generated failure scenarios with deltas. */
export function runFailureSweep(
  venue: Parameters<typeof analyzeVenue>[0],
  configOverrides?: Partial<Parameters<typeof resolveConfig>[1]>,
): FailureSweepResult {
  const config = resolveConfig(venue, configOverrides);
  const baseline = analyzeVenue(venue, null, configOverrides);
  const effective = applyScenario(venue, null);
  const patches = generateFailureScenarios(effective, {
    connectorTopN: config.failureConnectorTopN,
    capacityFactors: config.failureCapacityFactors,
    baselineFlowByEdgeId: baseline.flow.flowByEdgeId,
  });

  const entries: FailureSweepEntry[] = [];
  for (const patch of patches) {
    const result = analyzeVenue(venue, patch, configOverrides);
    const comparison = compareResults(baseline, result);
    entries.push({
      scenarioId: patch.id,
      scenarioName: patch.name,
      summary: {
        maxFlowPerMinute: result.flow.maxFlowPerMinute,
        clearanceSeconds: result.simulation.clearanceSeconds,
        isolatedPopulation: result.reachability.isolatedPopulation,
        reachablePopulation: result.reachability.reachablePopulation,
      },
      delta: {
        maxFlowPerMinute: comparison.rows.find((r) => r.field === "maxTheoreticalFlow")!
          .delta,
        clearanceSeconds: comparison.rows.find((r) => r.field === "estimatedClearanceTime")!
          .delta,
        isolatedPopulation: comparison.rows.find((r) => r.field === "isolatedPopulation")!
          .delta,
        changedExitAssignments: comparison.routeChanges.length,
      },
    });
  }
  return { baseline, entries };
}
