export type CostMetric = "time" | "distance";

export type NodeType =
  | "section"
  | "concourse"
  | "corridor"
  | "stairwell"
  | "ramp"
  | "gate"
  | "checkpoint"
  | "refuge";

export const NODE_TYPES: readonly NodeType[] = [
  "section",
  "concourse",
  "corridor",
  "stairwell",
  "ramp",
  "gate",
  "checkpoint",
  "refuge",
];

export interface VenueConfigPartial {
  walkingSpeedMetersPerSecond?: unknown;
  costMetric?: unknown;
}

/** Config shape after validation. */
export interface ParsedVenueConfig {
  walkingSpeedMetersPerSecond?: number;
  costMetric?: CostMetric;
}

export interface VenueNode {
  id: string;
  label: string;
  type: NodeType;
  occupancy?: number;
  capacity?: number;
  x: number;
  y: number;
  accessible?: boolean;
}

export interface VenueEdge {
  id: string;
  from: string;
  to: string;
  directed?: boolean;
  distanceMeters?: number;
  travelTimeSeconds?: number;
  capacityPerMinute: number;
  widthMeters?: number;
  enabled?: boolean;
  /** false marks a step-restricted connector (e.g., stairs). */
  stepFree?: boolean;
}

export interface VenueModel {
  schemaVersion: string;
  id: string;
  name: string;
  description?: string;
  config?: ParsedVenueConfig;
  nodes: VenueNode[];
  edges: VenueEdge[];
}

export interface EffectiveConfig {
  walkingSpeedMetersPerSecond: number;
  costMetric: CostMetric;
  timeStepSeconds: number;
  maxSimulationSteps: number;
  criticalityArcLimit: number;
  bottleneckTopN: number;
  failureConnectorTopN: number;
  failureCapacityFactors: number[];
  /** When true, edges flagged accessibleOnly are excluded from traversal everywhere. */
  requireStepFreeTraversal: boolean;
}

export const DEFAULT_CONFIG: EffectiveConfig = {
  walkingSpeedMetersPerSecond: 1.2,
  costMetric: "time",
  timeStepSeconds: 1,
  maxSimulationSteps: 86400,
  criticalityArcLimit: 32,
  bottleneckTopN: 10,
  failureConnectorTopN: 8,
  failureCapacityFactors: [0.5],
  requireStepFreeTraversal: false,
};

export type ScenarioOperation =
  | { op: "disableEdge"; edgeId: string }
  | { op: "enableEdge"; edgeId: string }
  | { op: "setEdgeCapacity"; edgeId: string; capacityPerMinute: number }
  | { op: "scaleEdgeCapacity"; edgeId: string; factor: number }
  | { op: "setNodeOccupancy"; nodeId: string; occupancy: number }
  | { op: "scaleNodeOccupancy"; nodeId: string; factor: number }
  | { op: "closeNode"; nodeId: string }
  | { op: "openNode"; nodeId: string };

export interface ScenarioPatch {
  schemaVersion: string;
  id: string;
  name: string;
  description?: string;
  operations: ScenarioOperation[];
}

export type DiagnosticSeverity = "error" | "warning";

export interface Diagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  path: string;
}

export class EngineValidationError extends Error {
  readonly diagnostics: Diagnostic[];

  constructor(diagnostics: Diagnostic[]) {
    super(
      `Validation failed with ${diagnostics.length} diagnostic(s): ${diagnostics
        .map((d) => `${d.code} (${d.path})`)
        .join("; ")}`,
    );
    this.name = "EngineValidationError";
    this.diagnostics = diagnostics;
  }
}
