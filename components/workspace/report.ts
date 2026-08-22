import type { AnalysisResult } from "@/engine/analyze";
import type { ComparisonResult } from "@/engine/compare";
import type { FailureSweepEntry } from "@/engine/failures";
import type { ScenarioPatch, VenueModel } from "@/engine/types";
import { ENGINE_VERSION } from "@/engine/version";

export function fmtNumber(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const rounded = Math.round(value * 100) / 100;
  return String(rounded);
}

export function fmtSeconds(value: number): string {
  if (!Number.isFinite(value)) return "—";
  if (value === 0) return "0s";
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value - hours * 3600) / 60);
  const seconds = Math.round((value - hours * 3600 - minutes * 60) * 100) / 100;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function mdCell(value: string): string {
  return value.replace(/\|/g, "\\|");
}

function refLabel(ref: { kind: string; edgeId?: string; nodeId?: string }): string {
  return ref.kind === "edge" ? (ref.edgeId ?? "?") : `capacity(${ref.nodeId ?? "?"})`;
}

const LIMITATIONS_TEXT = `Stadium Sentinel is analytical software for exploring venue-flow scenarios.
It is not a certified life-safety system, an emergency command authority, or a substitute
for professional crowd engineering, fire-code analysis, venue operations planning, or local
emergency procedures. All figures are estimates under the documented model assumptions:
free-flow least-cost routing, independent per-direction corridor capacities, one-turnover-
per-minute node capacities, and a queueing-only clearance simulation without individual
behaviour.`;

export interface ReportInput {
  venue: VenueModel;
  scenario: ScenarioPatch | null;
  baseline: AnalysisResult;
  scenarioResult: AnalysisResult | null;
  comparison: ComparisonResult | null;
  failures: FailureSweepEntry[] | null;
}

/** Builds the exportable markdown report deterministically from engine outputs. */
export function buildMarkdownReport(input: ReportInput): string {
  const { venue, scenario, baseline, scenarioResult, comparison, failures } = input;
  const lines: string[] = [];

  lines.push(`# Stadium Sentinel Analysis Report`);
  lines.push("");
  lines.push(`- Engine version: ${ENGINE_VERSION}`);
  lines.push(
    `- Venue: ${venue.name} (\`${venue.id}\`), venue schema \`${baseline.venueSchemaVersion}\``,
  );
  lines.push(
    `- Scenario: ${scenario ? `${scenario.name} (\`${scenario.id}\`)` : "(none — baseline)"}`,
  );
  lines.push(`- Baseline fingerprint: \`${baseline.fingerprint}\``);
  if (scenarioResult) {
    lines.push(`- Scenario fingerprint: \`${scenarioResult.fingerprint}\``);
  }
  lines.push(
    `- Routing metric: least-${baseline.costMetric} (${baseline.costUnit}); walking speed ${fmtNumber(baseline.config.walkingSpeedMetersPerSecond)} m/s`,
  );
  lines.push("");
  lines.push(LIMITATIONS_TEXT);
  lines.push("");

  lines.push(`## Inputs`);
  lines.push("");
  lines.push(
    `- Model size: ${venue.nodes.length} nodes, ${venue.edges.length} edges.`,
  );
  const declaredPopulation = baseline.reachability.reachablePopulation + baseline.reachability.isolatedPopulation;
  lines.push(`- Declared occupied population: ${declaredPopulation}.`);
  lines.push("");
  lines.push(`### Scenario operations`);
  lines.push("");
  if (!scenario || scenario.operations.length === 0) {
    lines.push(`None (baseline).`);
  } else {
    for (const op of scenario.operations) {
      lines.push(`- \`${JSON.stringify(op)}\``);
    }
  }
  lines.push("");

  const routeSections: [string, AnalysisResult][] = [["Baseline", baseline]];
  if (scenarioResult) routeSections.push(["Scenario", scenarioResult]);
  for (const [label, result] of routeSections) {
    lines.push(`## ${label}: reachability and routes`);
    lines.push("");
    lines.push(
      `Reachable population ${result.reachability.reachablePopulation}; isolated population ${result.reachability.isolatedPopulation}${
        result.reachability.isolatedOriginIds.length > 0
          ? ` (isolated: ${result.reachability.isolatedOriginIds.map(mdCell).join(", ")})`
          : ""
      }.`,
    );
    lines.push("");
    lines.push(`| Origin | People | Assigned exit | Route cost (${result.costUnit}) | Path |`);
    lines.push(`|---|---:|---|---:|---|`);
    for (const origin of result.reachability.occupiedOrigins) {
      if (!origin.reachable) {
        lines.push(`| ${mdCell(origin.originId)} | ${origin.occupancy} | ISOLATED | — | — |`);
        continue;
      }
      lines.push(
        `| ${mdCell(origin.originId)} | ${origin.occupancy} | ${mdCell(origin.assignedExitId ?? "?")} | ${fmtNumber(origin.routeCost ?? NaN)} | ${origin.routePathNodeIds?.map(mdCell).join(" → ") ?? ""} |`,
      );
    }
    lines.push("");
  }

  const flowSections: [string, AnalysisResult][] = [["Baseline", baseline]];
  if (scenarioResult) flowSections.push(["Scenario", scenarioResult]);
  for (const [label, result] of flowSections) {
    lines.push(`## ${label}: capacity flow`);
    lines.push("");
    lines.push(`Maximum theoretical throughput: **${result.flow.maxFlowPerMinute} people/minute**.`);
    lines.push("");
    lines.push(`| Exit | Throughput (people/min) | Share |`);
    lines.push(`|---|---:|---:|`);
    for (const t of result.flow.perExitThroughput) {
      const share =
        result.flow.maxFlowPerMinute > 0
          ? `${Math.round((t.flowPerMinute / result.flow.maxFlowPerMinute) * 1000) / 10}%`
          : "—";
      lines.push(`| ${mdCell(t.exitId)} | ${t.flowPerMinute} | ${share} |`);
    }
    lines.push("");
    lines.push(
      `Minimum cut: ${result.flow.minCut.arcRefs.map((ref) => `\`${mdCell(refLabel(ref))}\``).join(", ") || "none"}.`,
    );
    lines.push("");
    if (result.flow.criticality.length > 0) {
      lines.push(`Removal criticality (Δ max flow when removed individually):`);
      lines.push("");
      lines.push(`| Element | Δ max flow (people/min) |`);
      lines.push(`|---|---:|`);
      for (const entry of result.flow.criticality.slice(0, 10)) {
        lines.push(`| ${entry.kind === "edge" ? "edge" : "exit"} \`${mdCell(entry.refId)}\` | ${entry.deltaMaxFlow} |`);
      }
      lines.push("");
    }
  }

  for (const [label, result] of flowSections) {
    const sim = result.simulation;
    lines.push(`## ${label}: clearance simulation (${sim.timeStepSeconds}s steps)`);
    lines.push("");
    lines.push(
      `- Status: \`${sim.status}\`; evacuated **${sim.evacuated}/${sim.simulatedPopulation}** in **${fmtSeconds(sim.clearanceSeconds)}**.`,
    );
    lines.push(
      `- Per exit: ${sim.perExitEvacuated.map((e) => `${e.exitId} ${e.people}`).join(", ") || "none"}.`,
    );
    lines.push("");
  }

  lines.push(`## ${scenarioResult ? "Scenario" : "Baseline"} bottlenecks (top ranked)`);
  lines.push("");
  const ranked = scenarioResult?.bottlenecks ?? baseline.bottlenecks;
  if (ranked.length === 0) {
    lines.push("No bottlenecks recorded (no simulated flow).");
  } else {
    lines.push(`| Rank | Edge | Flow (people) | Utilization | Saturated | Peak queue | Min-cut | Removal impact (people/min) |`);
    lines.push(`|---:|---|---:|---:|---:|---:|---|---:|`);
    for (const b of ranked) {
      const m = b.metrics;
      lines.push(
        `| ${b.rank} | \`${mdCell(b.refId)}\` | ${fmtNumber(m.totalFlowPeople)} | ${
          m.utilization === null ? "—" : `${Math.round(m.utilization * 100)}%`
        } | ${fmtSeconds(m.saturationSeconds)} | ${m.peakQueue} | ${m.minCutMember ? "yes" : "no"} | ${
          m.removalImpact === null ? "—" : m.removalImpact
        } |`,
      );
    }
    lines.push("");
  }

  if (comparison) {
    lines.push(`## Baseline vs scenario`);
    lines.push("");
    lines.push(`| Metric | Baseline | Scenario | Delta | Unit |`);
    lines.push(`|---|---:|---:|---:|---|`);
    for (const row of comparison.rows) {
      lines.push(
        `| ${mdCell(row.field)} | ${fmtNumber(row.baseline)} | ${fmtNumber(row.scenario)} | ${fmtNumber(row.delta)} | ${row.unit ?? ""} |`,
      );
    }
    lines.push("");
    if (comparison.routeChanges.length > 0) {
      lines.push(`Route changes:`);
      lines.push("");
      for (const change of comparison.routeChanges) {
        lines.push(
          `- \`${change.originId}\`: ${change.baselineExitId ?? "none"} → ${change.scenarioExitId ?? "none"}`,
        );
      }
      lines.push("");
    }
  }

  if (failures && failures.length > 0) {
    lines.push(`## Generated failure sweep`);
    lines.push("");
    lines.push(`| Scenario | Max flow (people/min) | Clearance | Isolated | Changed exit assignments |`);
    lines.push(`|---|---:|---:|---:|---:|`);
    for (const entry of failures) {
      lines.push(
        `| \`${mdCell(entry.scenarioId)}\` | ${entry.summary.maxFlowPerMinute} | ${fmtSeconds(entry.summary.clearanceSeconds)} | ${entry.summary.isolatedPopulation} | ${entry.delta.changedExitAssignments} |`,
      );
    }
    lines.push("");
  }

  return lines.join("\n");
}
