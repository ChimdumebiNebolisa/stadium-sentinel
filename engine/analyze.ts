import { DEFAULT_CONFIG, type EffectiveConfig, type VenueModel, type ScenarioPatch, type CostMetric } from "./types";
import { ENGINE_VERSION, SCENARIO_SCHEMA_VERSION, VENUE_SCHEMA_VERSION } from "./version";
import {
  applyScenario,
  compileGraph,
  type CompiledGraph,
} from "./graph";
import { computeRouting, type RoutingResult } from "./routing";
import {
  computeFlowCriticality,
  computeMaxFlow,
  type CriticalityEntry,
  type FlowArcRef,
  type MaxFlowResult,
} from "./flow";
import {
  simulateClearance,
  type SimArcStat,
  type SimulationResult,
} from "./simulate";
import { canonicalVenue, sha256Hex, canonicalJsonString } from "./fingerprint";

export interface OriginAnalysis {
  originId: string;
  label: string;
  occupancy: number;
  reachable: boolean;
  /** Every exit reachable from this origin under the scenario (sorted ascending). */
  reachableExitIds: string[];
  assignedExitId?: string;
  routeCost?: number;
  routePathNodeIds?: string[];
}

export interface RankedBottleneck {
  rank: number;
  refId: string;
  metrics: {
    totalFlowPeople: number;
    utilization: number | null;
    saturationSeconds: number;
    peakQueue: number;
    /** Baseline max-flow minus max-flow without this edge; null when not evaluated. */
    removalImpact: number | null;
    minCutMember: boolean;
  };
}

export interface AnalysisResult {
  engineVersion: string;
  venueSchemaVersion: string;
  scenarioSchemaVersion: string;
  fingerprint: string;
  venueId: string;
  venueName: string;
  scenarioId: string | null;
  scenarioName: string | null;
  config: EffectiveConfig;
  costMetric: CostMetric;
  costUnit: "seconds" | "meters";
  reachability: {
    occupiedOrigins: OriginAnalysis[];
    reachablePopulation: number;
    isolatedPopulation: number;
    isolatedOriginIds: string[];
  };
  flow: {
    maxFlowPerMinute: number;
    perExitThroughput: { exitId: string; flowPerMinute: number }[];
    /** Assigned flow per edge id (both directions summed), only positive entries. */
    flowByEdgeId: Record<string, number>;
    minCut: { arcRefs: FlowArcRef[]; sideANodeIds: string[] };
    criticality: CriticalityEntry[];
    criticalityCapped: boolean;
  };
  simulation: SimulationResult;
  bottlenecks: RankedBottleneck[];
}

export function resolveConfig(
  venue: VenueModel,
  overrides?: Partial<EffectiveConfig>,
): EffectiveConfig {
  return {
    ...DEFAULT_CONFIG,
    ...(venue.config?.walkingSpeedMetersPerSecond !== undefined
      ? { walkingSpeedMetersPerSecond: venue.config.walkingSpeedMetersPerSecond }
      : {}),
    ...(venue.config?.costMetric !== undefined ? { costMetric: venue.config.costMetric } : {}),
    ...overrides,
  };
}

/** Nodes that can reach each exit, computed once via reverse BFS per exit. */
function computeNodesReachingExits(graph: CompiledGraph): Map<string, Set<string>> {
  const nodesReachingExit = new Map<string, Set<string>>();
  for (const exitId of graph.exitNodeIds) {
    const reached = new Set<string>([exitId]);
    const queue: string[] = [exitId];
    for (let qh = 0; qh < queue.length; qh++) {
      const current = queue[qh]!;
      const idx = graph.nodeIndex.get(current)!;
      for (const arcIdx of graph.inArcIndices[idx]) {
        const prev = graph.arcs[arcIdx]!.fromId;
        if (!reached.has(prev)) {
          reached.add(prev);
          queue.push(prev);
        }
      }
    }
    nodesReachingExit.set(exitId, reached);
  }
  return nodesReachingExit;
}

function aggregateEdgeSimStats(simulation: SimulationResult): Map<string, SimArcStat[]> {
  const byEdge = new Map<string, SimArcStat[]>();
  for (const stat of simulation.arcStats) {
    const list = byEdge.get(stat.edgeId);
    if (list) list.push(stat);
    else byEdge.set(stat.edgeId, [stat]);
  }
  return byEdge;
}

function rankBottlenecks(
  graph: CompiledGraph,
  simulation: SimulationResult,
  flow: MaxFlowResult,
  criticality: CriticalityEntry[],
): RankedBottleneck[] {
  const byEdge = aggregateEdgeSimStats(simulation);
  const impactByEdge = new Map<string, number>();
  for (const entry of criticality) {
    if (entry.kind === "edge") impactByEdge.set(entry.refId, entry.deltaMaxFlow);
  }
  const cutEdges = new Set<string>();
  for (const ref of flow.minCut.arcRefs) {
    if (ref.kind === "edge") cutEdges.add(ref.edgeId);
  }

  const candidates: RankedBottleneck[] = [];
  for (const [edgeId, stats] of byEdge) {
    const totalFlow = stats.reduce((sum, s) => sum + s.totalFlow, 0);
    if (totalFlow === 0 && !cutEdges.has(edgeId)) continue;
    const saturationSeconds = stats.reduce((sum, s) => sum + s.saturationSeconds, 0);
    const peakQueue = stats.reduce((max, s) => Math.max(max, s.peakQueue), 0);
    const capacity = graph.venue.edges.find((e) => e.id === edgeId)?.capacityPerMinute ?? 0;
    const minutes =
      simulation.clearanceSeconds > 0 ? simulation.clearanceSeconds / 60 : null;
    candidates.push({
      rank: 0,
      refId: edgeId,
      metrics: {
        totalFlowPeople: totalFlow,
        utilization: minutes !== null && capacity > 0 ? totalFlow / (capacity * minutes) : null,
        saturationSeconds,
        peakQueue,
        removalImpact: impactByEdge.get(edgeId) ?? null,
        minCutMember: cutEdges.has(edgeId),
      },
    });
  }

  candidates.sort((a, b) => {
    const ia = a.metrics.removalImpact ?? -1;
    const ib = b.metrics.removalImpact ?? -1;
    if (ia !== ib) return ib - ia;
    if (a.metrics.saturationSeconds !== b.metrics.saturationSeconds) {
      return b.metrics.saturationSeconds - a.metrics.saturationSeconds;
    }
    if (a.metrics.totalFlowPeople !== b.metrics.totalFlowPeople) {
      return b.metrics.totalFlowPeople - a.metrics.totalFlowPeople;
    }
    return a.refId < b.refId ? -1 : a.refId > b.refId ? 1 : 0;
  });

  return candidates.slice(0, graph.config.bottleneckTopN).map((candidate, i) => ({
    ...candidate,
    rank: i + 1,
  }));
}

/**
 * Runs every analysis stage over an already-validated venue/scenario pair.
 * Inputs are trusted: callers must validate first (CLI and UI do).
 */
export function analyzeVenue(
  venue: VenueModel,
  scenario: ScenarioPatch | null,
  configOverrides?: Partial<EffectiveConfig>,
): AnalysisResult {
  const config = resolveConfig(venue, configOverrides);
  const effective = applyScenario(venue, scenario);
  const graph = compileGraph(effective, config);

  const routing: RoutingResult = computeRouting(graph);
  const nodesReachingExit = computeNodesReachingExits(graph);

  const occupiedOrigins: OriginAnalysis[] = [];
  let reachablePopulation = 0;
  let isolatedPopulation = 0;
  const isolatedOriginIds: string[] = [];

  for (const route of routing.routes) {
    const nodeIdx = graph.nodeIndex.get(route.originId)!;
    const reachableExitIds = graph.exitNodeIds
      .filter((exitId) => nodesReachingExit.get(exitId)?.has(route.originId))
      .sort();
    if (route.reachable) {
      reachablePopulation += route.occupancy;
      occupiedOrigins.push({
        originId: route.originId,
        label: graph.nodes[nodeIdx].label,
        occupancy: route.occupancy,
        reachable: true,
        reachableExitIds,
        assignedExitId: route.exitId,
        routeCost: route.cost,
        routePathNodeIds: route.pathNodeIds,
      });
    } else {
      isolatedPopulation += route.occupancy;
      isolatedOriginIds.push(route.originId);
      occupiedOrigins.push({
        originId: route.originId,
        label: graph.nodes[nodeIdx].label,
        occupancy: route.occupancy,
        reachable: false,
        reachableExitIds: [],
      });
    }
  }
  occupiedOrigins.sort((a, b) => (a.originId < b.originId ? -1 : a.originId > b.originId ? 1 : 0));

  const flow = computeMaxFlow(graph);
  const criticality = computeFlowCriticality(graph, flow, config.criticalityArcLimit);
  const simulation = simulateClearance(graph, routing);
  const bottlenecks = rankBottlenecks(graph, simulation, flow, criticality.entries);

  const fingerprintBundle = {
    engineVersion: ENGINE_VERSION,
    venueSchemaVersion: VENUE_SCHEMA_VERSION,
    scenarioSchemaVersion: SCENARIO_SCHEMA_VERSION,
    config,
    venue: canonicalVenue(venue),
    scenario: scenario ?? null,
  };

  return {
    engineVersion: ENGINE_VERSION,
    venueSchemaVersion: VENUE_SCHEMA_VERSION,
    scenarioSchemaVersion: SCENARIO_SCHEMA_VERSION,
    fingerprint: sha256Hex(canonicalJsonString(fingerprintBundle)),
    venueId: venue.id,
    venueName: venue.name,
    scenarioId: scenario?.id ?? null,
    scenarioName: scenario?.name ?? null,
    config,
    costMetric: config.costMetric,
    costUnit: config.costMetric === "distance" ? "meters" : "seconds",
    reachability: {
      occupiedOrigins,
      reachablePopulation,
      isolatedPopulation,
      isolatedOriginIds,
    },
    flow: {
      maxFlowPerMinute: flow.maxFlowPerMinute,
      perExitThroughput: flow.perExitThroughput,
      flowByEdgeId: flow.flowByEdgeId,
      minCut: flow.minCut,
      criticality: criticality.entries,
      criticalityCapped: criticality.cappedAtLimit,
    },
    simulation,
    bottlenecks,
  };
}
