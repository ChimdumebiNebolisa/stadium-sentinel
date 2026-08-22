#!/usr/bin/env tsx
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  analyzeVenue,
  type AnalysisResult,
} from "../engine/analyze";
import { compareResults } from "../engine/compare";
import { runFailureSweep } from "../engine/failures";
import {
  EngineValidationError,
  type Diagnostic,
  type ScenarioPatch,
  type VenueModel,
} from "../engine/types";
import {
  validateScenarioAgainstVenue,
  validateScenarioDocument,
  validateVenueDocument,
} from "../engine/validation";

const USAGE = `stadium-sentinel — deterministic venue-flow analysis engine

Usage:
  npm run sentinel -- validate  <venue.json>
  npm run sentinel -- analyze   <venue.json> [--scenario <scenario.json>] [--json] [--out <file>] [--failures]
  npm run sentinel -- compare   <venue.json> <scenarioA.json|-> <scenarioB.json> [--json]

Exit codes: 0 ok, 1 validation failure, 2 usage or IO error.`;

function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(2);
}

function readJson(path: string): unknown {
  const absolute = resolve(process.cwd(), path);
  let raw: string;
  try {
    raw = readFileSync(absolute, "utf8");
  } catch (err) {
    return fail(`cannot read ${path}: ${(err as Error).message}`);
  }
  try {
    return JSON.parse(raw);
  } catch (err) {
    return fail(`${path} is not valid JSON: ${(err as Error).message}`);
  }
}

function loadVenue(path: string): VenueModel {
  const { model, diagnostics } = validateVenueDocument(readJson(path));
  if (!model) {
    printDiagnostics(path, diagnostics);
    process.exit(1);
  }
  return model;
}

function loadScenario(venue: VenueModel, path: string): ScenarioPatch {
  const { scenario, diagnostics } = validateScenarioDocument(readJson(path));
  if (!scenario) {
    printDiagnostics(path, diagnostics);
    process.exit(1);
  }
  const semantic = validateScenarioAgainstVenue(venue, scenario);
  if (semantic.length > 0) {
    printDiagnostics(path, semantic);
    process.exit(1);
  }
  return scenario;
}

function printDiagnostics(source: string, diagnostics: Diagnostic[]): void {
  for (const d of diagnostics) {
    console.error(
      `${d.severity.toUpperCase()} ${d.code} at ${source}${d.path ? `#${d.path}` : ""}: ${d.message}`,
    );
  }
}

function formatSeconds(value: number): string {
  if (value >= 3600 && Number.isInteger(value / 60)) {
    const h = Math.floor(value / 3600);
    const m = Math.round((value - h * 3600) / 60);
    return `${h}h ${m}m`;
  }
  if (value >= 60) {
    const m = Math.floor(value / 60);
    const s = Math.round((value - m * 60) * 100) / 100;
    return `${m}m ${s}s`;
  }
  return `${Math.round(value * 1000) / 1000}s`;
}

function printAnalysisSummary(result: AnalysisResult): void {
  const label = result.scenarioId
    ? `venue "${result.venueId}" · scenario "${result.scenarioId}"`
    : `venue "${result.venueId}" · baseline`;
  console.log(`Stadium Sentinel analysis — ${label}`);
  console.log(`fingerprint ${result.fingerprint}`);
  console.log("");
  console.log("Reachability:");
  console.log(
    `  reachable population ${result.reachability.reachablePopulation}, isolated population ${result.reachability.isolatedPopulation}`,
  );
  for (const origin of result.reachability.occupiedOrigins) {
    if (!origin.reachable) {
      console.log(`  ISOLATED ${origin.originId} (${origin.label}): no reachable exit`);
      continue;
    }
    console.log(
      `  ${origin.originId} (${origin.occupancy} people) -> exit ${origin.assignedExitId} in ${formatSeconds(origin.routeCost ?? 0)} via ${origin.routePathNodeIds?.join(" -> ")}`,
    );
  }
  console.log("");
  console.log("Flow:");
  console.log(
    `  max theoretical throughput ${result.flow.maxFlowPerMinute} people/minute`,
  );
  for (const t of result.flow.perExitThroughput) {
    console.log(`  exit ${t.exitId}: ${t.flowPerMinute} people/minute`);
  }
  console.log(
    `  min cut: ${result.flow.minCut.arcRefs
      .map((ref) => (ref.kind === "edge" ? ref.edgeId : `capacity(${ref.nodeId})`))
      .join(", ") || "none"}`,
  );
  console.log("");
  console.log("Clearance simulation:");
  console.log(
    `  status ${result.simulation.status}; evacuated ${result.simulation.evacuated}/${result.simulation.simulatedPopulation} in ${formatSeconds(result.simulation.clearanceSeconds)}`,
  );
  for (const b of result.bottlenecks) {
    const m = b.metrics;
    console.log(
      `  bottleneck #${b.rank} edge ${b.refId}: flow ${m.totalFlowPeople} people, peak queue ${m.peakQueue}, saturated ${formatSeconds(m.saturationSeconds)}${m.minCutMember ? ", min-cut member" : ""}${m.removalImpact !== null ? `, removal impact ${m.removalImpact} people/min` : ""}`,
    );
  }
}

function parseArgs(argv: string[]): { positionals: string[]; flags: Map<string, string | boolean> } {
  const positionals: string[] = [];
  const flags = new Map<string, string | boolean>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--json") {
      flags.set("json", true);
    } else if (arg === "--failures") {
      flags.set("failures", true);
    } else if (arg === "--scenario" || arg === "--out") {
      const value = argv[++i];
      if (value === undefined) fail(`missing value after ${arg}`);
      flags.set(arg.slice(2), value);
    } else {
      positionals.push(arg);
    }
  }
  return { positionals, flags };
}

function emitJson(payload: unknown, outPath?: string): void {
  const text = `${JSON.stringify(payload, null, 2)}\n`;
  if (outPath) {
    writeFileSync(resolve(process.cwd(), outPath), text, "utf8");
    console.log(`wrote ${outPath}`);
  } else {
    process.stdout.write(text);
  }
}

function main(): void {
  const [command, ...rest] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help") {
    console.log(USAGE);
    process.exit(command ? 0 : 2);
  }

  const { positionals, flags } = parseArgs(rest);
  const json = flags.get("json") === true;

  if (command === "validate") {
    const path = positionals[0];
    if (!path) fail("validate requires a venue file");
    const { model, diagnostics } = validateVenueDocument(readJson(path));
    if (!model) {
      printDiagnostics(path, diagnostics);
      console.error(`INVALID: ${path}`);
      process.exit(1);
    }
    if (diagnostics.length > 0) printDiagnostics(path, diagnostics);
    console.log(`VALID: ${path} (${model.nodes.length} nodes, ${model.edges.length} edges)`);
    return;
  }

  if (command === "analyze") {
    const path = positionals[0];
    if (!path) fail("analyze requires a venue file");
    const venue = loadVenue(path);
    const scenarioPath = flags.get("scenario");
    let scenario: ScenarioPatch | null = null;
    if (typeof scenarioPath === "string") {
      scenario = loadScenario(venue, scenarioPath);
    }
    const result = analyzeVenue(venue, scenario);

    if (flags.get("failures") === true) {
      const sweep = runFailureSweep(venue);
      if (json) {
        emitJson({ baseline: result, failures: sweep.entries }, flags.get("out") as string);
        return;
      }
      printAnalysisSummary(result);
      console.log("");
      console.log("Failure scenarios:");
      console.log("  scenario                          maxFlow  clearance  isolated  changedExits");
      for (const entry of sweep.entries) {
        const id = entry.scenarioId.padEnd(32).slice(0, 32);
        const mf = `${entry.summary.maxFlowPerMinute}`.padStart(7);
        const cl = formatSeconds(entry.summary.clearanceSeconds).padStart(9);
        const iso = `${entry.summary.isolatedPopulation}`.padStart(8);
        const ch = `${entry.delta.changedExitAssignments}`.padStart(12);
        console.log(`  ${id} ${mf} ${cl} ${iso} ${ch}`);
      }
      return;
    }

    if (json) {
      emitJson(result, flags.get("out") as string);
      return;
    }
    printAnalysisSummary(result);
    return;
  }

  if (command === "compare") {
    const [venuePath, pathA, pathB] = positionals;
    if (!venuePath || !pathA || !pathB) {
      fail("compare requires a venue file and two scenario files (use - for none)");
    }
    const venue = loadVenue(venuePath);
    const a = pathA === "-" ? null : loadScenario(venue, pathA);
    const b = pathB === "-" ? null : loadScenario(venue, pathB);
    const baselineResult = analyzeVenue(venue, a);
    const candidateResult = analyzeVenue(venue, b);
    const comparison = compareResults(baselineResult, candidateResult);

    if (json) {
      emitJson(comparison, flags.get("out") as string);
      return;
    }
    console.log(`Comparing "${a?.id ?? "(baseline)"}" -> "${b?.id ?? "(baseline)"}"`);
    console.log(
      `fingerprints: ${comparison.fingerprints.baseline} -> ${comparison.fingerprints.scenario}`,
    );
    console.log("");
    for (const row of comparison.rows) {
      const unit = row.unit ?? "";
      const sign = row.delta > 0 ? "+" : "";
      console.log(
        `  ${row.field.padEnd(24)} ${`${row.baseline}`.padStart(10)} ${unit.padEnd(14)} -> ${`${row.scenario}`.padStart(10)} (delta ${sign}${row.delta})`,
      );
    }
    if (comparison.routeChanges.length > 0) {
      console.log("  route changes:");
      for (const change of comparison.routeChanges) {
        console.log(
          `    ${change.originId}: ${change.baselineExitId ?? "none"} -> ${change.scenarioExitId ?? "none"}`,
        );
      }
    }
    return;
  }

  fail(`unknown command "${command}". Try: validate | analyze | compare`);
}

try {
  main();
} catch (err) {
  if (err instanceof EngineValidationError) {
    printDiagnostics("(engine)", err.diagnostics);
    process.exit(1);
  }
  console.error(`unexpected error: ${(err as Error).stack ?? err}`);
  process.exit(2);
}
