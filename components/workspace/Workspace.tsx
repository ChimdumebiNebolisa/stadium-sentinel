"use client";

import { useMemo, useState } from "react";
import venueJson from "@/fixtures/harborline-park.json";
import tunnelClosedJson from "@/fixtures/east-tunnel-closed.json";
import reduceHalfJson from "@/fixtures/reduce-east-tunnel-half.json";
import { analyzeVenue } from "@/engine/analyze";
import { compareResults } from "@/engine/compare";
import { runFailureSweep } from "@/engine/failures";
import { applyScenario } from "@/engine/graph";
import type { CostMetric } from "@/engine/types";
import {
  validateScenarioDocument,
  validateVenueDocument,
} from "@/engine/validation";
import { ENGINE_VERSION } from "@/engine/version";
import { GraphLegend, VenueGraph } from "./VenueGraph";
import {
  BottlenecksPanel,
  ComparisonPanel,
  FailuresPanel,
  FlowPanel,
  ReachabilityPanel,
  SimulationPanel,
  StatCard,
} from "./panels";
import { buildMarkdownReport, fmtSeconds } from "./report";

const SCENARIOS = [
  { key: "east-tunnel-closed", label: "East tunnel closed", json: tunnelClosedJson },
  { key: "reduce-east-tunnel-half", label: "East tunnel @ 50%", json: reduceHalfJson },
] as const;

type TabKey =
  | "overview"
  | "flow"
  | "simulation"
  | "bottlenecks"
  | "failures"
  | "compare"
  | "report";

const TABS: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Graph & routes" },
  { key: "flow", label: "Flow & min-cut" },
  { key: "simulation", label: "Clearance" },
  { key: "bottlenecks", label: "Bottlenecks" },
  { key: "failures", label: "Failure sweep" },
  { key: "compare", label: "Compare" },
  { key: "report", label: "Report" },
];

function downloadText(filename: string, text: string, mime: string): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function Workspace() {
  const [scenarioKey, setScenarioKey] = useState<string | null>(null);
  const [costMetric, setCostMetric] = useState<CostMetric>("time");
  const [stepFreeOnly, setStepFreeOnly] = useState(false);
  const [selectedOriginId, setSelectedOriginId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("overview");

  const venueParse = useMemo(() => validateVenueDocument(venueJson), []);
  const scenarioParses = useMemo(
    () =>
      SCENARIOS.map((scenario) => ({
        ...scenario,
        parsed: validateScenarioDocument(scenario.json),
      })),
    [],
  );

  const configOverrides = useMemo(
    () => ({ costMetric, requireStepFreeTraversal: stepFreeOnly }),
    [costMetric, stepFreeOnly],
  );

  const baseline = useMemo(() => {
    if (!venueParse.model) return null;
    return analyzeVenue(venueParse.model, null, configOverrides);
  }, [venueParse.model, configOverrides]);

  const activeScenario = useMemo(() => {
    if (!scenarioKey || !venueParse.model) return null;
    const match = scenarioParses.find((s) => s.key === scenarioKey);
    if (!match?.parsed.scenario) return null;
    return match.parsed.scenario;
  }, [scenarioKey, scenarioParses, venueParse.model]);

  const scenarioResult = useMemo(() => {
    if (!venueParse.model || !activeScenario) return null;
    return analyzeVenue(venueParse.model, activeScenario, configOverrides);
  }, [venueParse.model, activeScenario, configOverrides]);

  const comparison = useMemo(() => {
    if (!baseline || !scenarioResult) return null;
    return compareResults(baseline, scenarioResult);
  }, [baseline, scenarioResult]);

  const failures = useMemo(() => {
    if (!venueParse.model) return null;
    return runFailureSweep(venueParse.model, configOverrides).entries;
  }, [venueParse.model, configOverrides]);

  const effectiveVenue = useMemo(() => {
    if (!venueParse.model) return null;
    return applyScenario(venueParse.model, activeScenario);
  }, [venueParse.model, activeScenario]);

  if (!venueParse.model || !baseline || !effectiveVenue) {
    return (
      <DiagnosticsFallback
        title="Bundled venue failed validation"
        diagnostics={venueParse.diagnostics}
      />
    );
  }

  const shown = scenarioResult ?? baseline;

  const statsByEdgeId = new Map<string, typeof shown.simulation.arcStats>();
  for (const stat of shown.simulation.arcStats) {
    const list = statsByEdgeId.get(stat.edgeId);
    if (list) list.push(stat);
    else statsByEdgeId.set(stat.edgeId, [stat]);
  }

  const selectedRoute =
    shown.reachability.occupiedOrigins.find((o) => o.originId === selectedOriginId) ?? null;

  const reportMarkdown = buildMarkdownReport({
    venue: venueParse.model,
    scenario: activeScenario,
    baseline,
    scenarioResult,
    comparison,
    failures,
  });

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6 max-w-[1200px] mx-auto w-full">
      {/* Header */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Stadium Sentinel</h1>
          <p className="text-sm" style={{ color: "var(--fg-dim)" }}>
            Deterministic venue-flow analysis · engine {ENGINE_VERSION} · all computation local
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--fg-dim)" }}>
            Route metric
            <select
              className="btn !py-1"
              value={costMetric}
              onChange={(e) => setCostMetric(e.target.value as CostMetric)}
              aria-label="Routing cost metric"
            >
              <option value="time">least time</option>
              <option value="distance">least distance</option>
            </select>
          </label>
          <label className="flex items-center gap-1.5 text-xs" style={{ color: "var(--fg-dim)" }}>
            <input
              type="checkbox"
              checked={stepFreeOnly}
              onChange={(e) => setStepFreeOnly(e.target.checked)}
            />
            step-free traversal only
          </label>
        </div>
      </header>

      {/* Controls */}
      <section className="panel p-3 flex flex-wrap items-center gap-2">
        <span className="heading mr-1">Scenario</span>
        <button
          type="button"
          className={`btn ${scenarioKey === null ? "btn-active" : ""}`}
          onClick={() => setScenarioKey(null)}
        >
          Baseline
        </button>
        {scenarioParses.map((s) =>
          s.parsed.scenario ? (
            <button
              key={s.key}
              type="button"
              className={`btn ${scenarioKey === s.key ? "btn-active" : ""}`}
              onClick={() => {
                setScenarioKey(s.key);
                setSelectedOriginId(null);
              }}
            >
              {s.parsed.scenario.name}
            </button>
          ) : (
            <DiagnosticsFallback
              key={s.key}
              title={`Bundled scenario ${s.key} failed validation`}
              diagnostics={s.parsed.diagnostics}
            />
          ),
        )}
      </section>

      {/* Key numbers */}
      <section className="flex gap-3 flex-wrap">
        <StatCard
          label={scenarioResult ? "Clearance (baseline → scenario)" : "Estimated clearance"}
          value={
            scenarioResult
              ? `${fmtSeconds(baseline.simulation.clearanceSeconds)} → ${fmtSeconds(scenarioResult.simulation.clearanceSeconds)}`
              : fmtSeconds(baseline.simulation.clearanceSeconds)
          }
          sub={`${shown.simulation.evacuated}/${shown.simulation.simulatedPopulation} evacuated · ${shown.simulation.status}`}
        />
        <StatCard
          label="Max theoretical flow (people/min)"
          value={
            scenarioResult
              ? `${baseline.flow.maxFlowPerMinute} → ${scenarioResult.flow.maxFlowPerMinute}`
              : `${baseline.flow.maxFlowPerMinute}`
          }
        />
        <StatCard
          label="Isolated population"
          value={`${shown.reachability.isolatedPopulation}`}
          sub={
            shown.reachability.isolatedOriginIds.length > 0
              ? shown.reachability.isolatedOriginIds.join(", ")
              : "every occupied section reaches an exit"
          }
          tone={shown.reachability.isolatedPopulation > 0 ? "bad" : undefined}
        />
        <StatCard
          label="Analysis fingerprint"
          value={shown.fingerprint.slice(0, 12)}
          sub={`sha256 over inputs + engine ${ENGINE_VERSION}${scenarioResult && baseline.fingerprint !== scenarioResult.fingerprint ? "" : ""}`}
          tone={undefined}
        />
      </section>

      {/* Tabs */}
      <nav className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`btn ${tab === t.key ? "btn-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <main className="panel p-4">
        {tab === "overview" ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(320px,7fr)_minmax(280px,5fr)]">
            <div className="flex flex-col gap-2">
              <GraphLegend />
              <div className="subpanel p-2">
                <VenueGraph
                  nodes={effectiveVenue.nodes}
                  edges={effectiveVenue.edges}
                  clearanceSeconds={shown.simulation.clearanceSeconds}
                  statsByEdgeId={statsByEdgeId}
                  minCutEdgeIds={
                    new Set(
                      shown.flow.minCut.arcRefs.flatMap((ref) =>
                        ref.kind === "edge" ? [ref.edgeId] : [],
                      ),
                    )
                  }
                  disabledEdgeIds={
                    new Set(effectiveVenue.edges.filter((e) => !e.enabled).map((e) => e.id))
                  }
                  routePathNodeIds={selectedRoute?.routePathNodeIds ?? null}
                  isolatedOriginIds={new Set(shown.reachability.isolatedOriginIds)}
                  selectedOriginId={selectedOriginId}
                  onSelectOrigin={setSelectedOriginId}
                />
              </div>
              <p className="text-xs" style={{ color: "var(--fg-dim)" }}>
                Synthetic fixture “{venueParse.model.name}”. Click a section to overlay its assigned
                least-{shown.costMetric} route.
              </p>
            </div>
            <div>
              <ReachabilityPanel
                result={shown}
                selectedOriginId={selectedOriginId}
                onSelectOrigin={setSelectedOriginId}
              />
            </div>
          </div>
        ) : null}

        {tab === "flow" ? <FlowPanel result={shown} /> : null}
        {tab === "simulation" ? <SimulationPanel result={shown} /> : null}
        {tab === "bottlenecks" ? <BottlenecksPanel result={shown} /> : null}

        {tab === "failures" ? (
          failures ? (
            <>
              <p className="text-sm mb-2" style={{ color: "var(--fg-dim)" }}>
                Generated single-element failure scenarios against the baseline model. Deltas are
                relative to the current baseline run.
              </p>
              <FailuresPanel entries={failures} />
            </>
          ) : null
        ) : null}

        {tab === "compare" ? (
          scenarioResult && comparison ? (
            <ComparisonPanel comparison={comparison} />
          ) : (
            <p className="text-sm" style={{ color: "var(--fg-dim)" }}>
              Select a scenario above to compare it against the baseline.
            </p>
          )
        ) : null}

        {tab === "report" ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <button
                type="button"
                className="btn"
                onClick={() =>
                  downloadText(
                    `stadium-sentinel-report-${shown.fingerprint.slice(0, 10)}.md`,
                    reportMarkdown,
                    "text/markdown",
                  )
                }
              >
                Download markdown report
              </button>
              <button
                type="button"
                className="btn"
                onClick={() =>
                  downloadText(
                    `stadium-sentinel-analysis-${shown.fingerprint.slice(0, 10)}.json`,
                    `${JSON.stringify(shown, null, 2)}\n`,
                    "application/json",
                  )
                }
              >
                Download analysis JSON
              </button>
            </div>
            <pre
              className="subpanel p-3 text-xs overflow-auto mono whitespace-pre-wrap"
              style={{ maxHeight: 520, color: "var(--fg-dim)" }}
            >
              {reportMarkdown}
            </pre>
          </div>
        ) : null}
      </main>

      <footer className="text-xs" style={{ color: "var(--fg-dim)" }}>
        Analytical software for exploring scenarios under documented assumptions — not a certified
        life-safety system or substitute for professional crowd engineering and emergency
        procedures.
      </footer>
    </div>
  );
}

function DiagnosticsFallback({
  title,
  diagnostics,
}: {
  title: string;
  diagnostics: { severity: string; code: string; message: string; path: string }[];
}) {
  return (
    <div className="p-6">
      <h2 className="font-semibold" style={{ color: "var(--bad)" }}>
        {title}
      </h2>
      <ul className="mt-2 text-sm list-disc pl-5">
        {diagnostics.map((d, i) => (
          <li key={i}>
            <span className="mono">{d.code}</span> at <span className="mono">{d.path}</span>:{" "}
            {d.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
