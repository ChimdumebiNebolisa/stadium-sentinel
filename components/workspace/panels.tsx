"use client";

import type { ReactNode } from "react";
import type { AnalysisResult } from "@/engine/analyze";
import type { ComparisonResult } from "@/engine/compare";
import type { FailureSweepEntry } from "@/engine/failures";
import { fmtNumber, fmtSeconds } from "./report";
import { EvacuationCurve } from "./EvacuationCurve";

export function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad" | "warn";
}) {
  const valueColor =
    tone === "bad" ? "var(--bad)" : tone === "good" ? "var(--good)" : tone === "warn" ? "var(--warn)" : "var(--fg)";
  return (
    <div className="subpanel p-3 flex-1 min-w-[150px]">
      <div className="heading">{label}</div>
      <div className="value-big mono mt-1" style={{ color: valueColor }}>
        {value}
      </div>
      {sub ? (
        <div className="text-xs mt-1" style={{ color: "var(--fg-dim)" }}>
          {sub}
        </div>
      ) : null}
    </div>
  );
}

function Table({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          {head.map((h) => (
            <th key={h} className="heading table-cell text-left font-normal">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j} className="table-cell align-top">
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Delta({ value, unit }: { value: number; unit?: string }) {
  const text = `${value > 0 ? "+" : ""}${fmtNumber(value)}${unit ? ` ${unit}` : ""}`;
  const cls = value > 0 ? "delta-pos" : value < 0 ? "delta-neg" : undefined;
  const color = cls === "delta-pos" ? "var(--good)" : cls === "delta-neg" ? "var(--bad)" : "var(--fg-dim)";
  return (
    <span className="mono" style={{ color }}>
      {text}
    </span>
  );
}

export function ReachabilityPanel({
  result,
  selectedOriginId,
  onSelectOrigin,
}: {
  result: AnalysisResult;
  selectedOriginId: string | null;
  onSelectOrigin: (id: string | null) => void;
}) {
  return (
    <Table
      head={["Origin", "People", "Assigned exit", `Cost (${result.costUnit})`, "Reachable exits", "Path"]}
      rows={result.reachability.occupiedOrigins.map((origin) => {
        const selected = selectedOriginId === origin.originId;
        return [
          <button
            key={`o-${origin.originId}`}
            type="button"
            onClick={() => onSelectOrigin(selected ? null : origin.originId)}
            className={`btn ${selected ? "btn-active" : ""} !py-0.5 !px-2`}
          >
            {origin.label}
          </button>,
          String(origin.occupancy),
          origin.reachable ? (
            (origin.assignedExitId ?? "?")
          ) : (
            <span style={{ color: "var(--bad)" }}>ISOLATED</span>
          ),
          origin.reachable ? fmtNumber(origin.routeCost ?? NaN) : "—",
          origin.reachableExitIds.join(", ") || "none",
          <span key={`p-${origin.originId}`} className="mono text-xs" style={{ color: "var(--fg-dim)" }}>
            {origin.routePathNodeIds?.join(" → ") ?? "—"}
          </span>,
        ];
      })}
    />
  );
}

export function FlowPanel({ result }: { result: AnalysisResult }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 flex-wrap">
        <StatCard
          label="Max theoretical throughput"
          value={`${result.flow.maxFlowPerMinute}`}
          sub="people/minute under the declared graph"
        />
        <StatCard
          label="Min-cut arcs"
          value={`${result.flow.minCut.arcRefs.length}`}
          sub={result.flow.minCut.arcRefs.map((ref) => (ref.kind === "edge" ? ref.edgeId : `capacity(${ref.nodeId})`)).join(", ") || "none"}
        />
      </div>
      <Table
        head={["Exit", "Throughput (people/min)", "Share of max"]}
        rows={result.flow.perExitThroughput.map((t) => [
          t.exitId,
          t.flowPerMinute,
          result.flow.maxFlowPerMinute > 0
            ? `${Math.round((t.flowPerMinute / result.flow.maxFlowPerMinute) * 1000) / 10}%`
            : "—",
        ])}
      />
      {result.flow.criticality.length > 0 ? (
        <>
          <div className="heading">Removal criticality (Δ max flow when removed individually)</div>
          <Table
            head={["Element", "Kind", "Δ max flow (people/min)"]}
            rows={result.flow.criticality.slice(0, 12).map((entry) => [
              entry.refId,
              entry.kind === "edge" ? "edge" : "exit",
              entry.deltaMaxFlow === 0 ? (
                <span style={{ color: "var(--fg-dim)" }}>0</span>
              ) : (
                <span style={{ color: "var(--bad)" }}>-{entry.deltaMaxFlow}</span>
              ),
            ])}
          />
        </>
      ) : null}
    </div>
  );
}

export function SimulationPanel({ result }: { result: AnalysisResult }) {
  const sim = result.simulation;
  const congested = [...sim.arcStats].sort(
    (a, b) => b.saturationSeconds - a.saturationSeconds || b.totalFlow - a.totalFlow,
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-3 flex-wrap">
        <StatCard
          label="Estimated clearance"
          value={fmtSeconds(sim.clearanceSeconds)}
          sub={`${sim.timeStepSeconds}s time steps · status ${sim.status}`}
          tone={sim.status === "completed" ? undefined : "bad"}
        />
        <StatCard
          label="Evacuated"
          value={`${sim.evacuated}/${sim.simulatedPopulation}`}
          sub="people through open exits"
          tone={
            sim.evacuated === sim.simulatedPopulation && sim.simulatedPopulation > 0
              ? "good"
              : sim.simulatedPopulation === 0
                ? undefined
                : "bad"
          }
        />
        {result.reachability.isolatedPopulation > 0 ? (
          <StatCard
            label="Excluded as isolated"
            value={`${result.reachability.isolatedPopulation}`}
            sub={result.reachability.isolatedOriginIds.join(", ")}
            tone="bad"
          />
        ) : null}
      </div>
      <EvacuationCurve simulation={sim} />
      <div className="heading">Arc congestion (sorted by saturation)</div>
      <Table
        head={["Arc", "Capacity (p/min)", "Total flow", "Saturated", "Peak queue"]}
        rows={congested.slice(0, 14).map((stat) => [
          <span key={`a-${stat.arcKey}`} className="mono text-xs">
            {stat.fromId} → {stat.toId} <span style={{ color: "var(--fg-dim)" }}>({stat.edgeId})</span>
          </span>,
          stat.capacityPerMinute,
          stat.totalFlow,
          stat.saturationSeconds > 0 ? (
            <span style={{ color: "var(--bad)" }}>{fmtSeconds(stat.saturationSeconds)}</span>
          ) : (
            <span style={{ color: "var(--good)" }}>never</span>
          ),
          stat.peakQueue,
        ])}
      />
    </div>
  );
}

export function BottlenecksPanel({ result }: { result: AnalysisResult }) {
  if (result.bottlenecks.length === 0) {
    return <p className="text-sm" style={{ color: "var(--fg-dim)" }}>No bottlenecks recorded (no simulated flow).</p>;
  }
  return (
    <Table
      head={["#", "Edge", "Flow (people)", "Utilization", "Saturated", "Peak queue", "Min-cut", "Removal impact (p/min)"]}
      rows={result.bottlenecks.map((b) => [
        b.rank,
        <span key={`b-${b.rank}`} className="mono">{b.refId}</span>,
        fmtNumber(b.metrics.totalFlowPeople),
        b.metrics.utilization === null ? "—" : `${Math.round(b.metrics.utilization * 100)}%`,
        b.metrics.saturationSeconds > 0 ? fmtSeconds(b.metrics.saturationSeconds) : "—",
        b.metrics.peakQueue,
        b.metrics.minCutMember ? "yes" : "no",
        b.metrics.removalImpact === null ? "—" : b.metrics.removalImpact,
      ])}
    />
  );
}

export function ComparisonPanel({ comparison }: { comparison: ComparisonResult }) {
  return (
    <div className="flex flex-col gap-3">
      <Table
        head={["Metric", "Baseline", "Scenario", "Delta", "Unit"]}
        rows={comparison.rows.map((row) => [
          row.field,
          fmtNumber(row.baseline),
          fmtNumber(row.scenario),
          <Delta key={`d-${row.field}`} value={row.delta} />,
          row.unit ?? "",
        ])}
      />
      <div className="heading">Exit throughput</div>
      <Table
        head={["Exit", "Baseline (p/min)", "Scenario (p/min)", "Delta"]}
        rows={comparison.exitThroughput.map((t) => [t.exitId, t.baseline, t.scenario, <Delta key={`e-${t.exitId}`} value={t.delta} />])}
      />
      <div className="heading">Route changes</div>
      {comparison.routeChanges.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--fg-dim)" }}>None — every origin keeps its assigned exit.</p>
      ) : (
        <Table
          head={["Origin", "Baseline exit", "Scenario exit"]}
          rows={comparison.routeChanges.map((change) => [
            change.originId,
            change.baselineExitId ?? "none",
            change.scenarioExitId ?? "none",
          ])}
        />
      )}
      <div className="mono text-xs" style={{ color: "var(--fg-dim)" }}>
        fingerprints: {comparison.fingerprints.baseline.slice(0, 16)}… → {comparison.fingerprints.scenario.slice(0, 16)}…
      </div>
    </div>
  );
}

export function FailuresPanel({ entries }: { entries: FailureSweepEntry[] }) {
  return (
    <Table
      head={["Scenario", "Max flow (p/min)", "Clearance", "Isolated", "Changed exits", "Δ flow", "Δ clearance"]}
      rows={entries.map((entry) => [
        <span key={`f-${entry.scenarioId}`} className="mono text-xs">
          {entry.scenarioName} <span style={{ color: "var(--fg-dim)" }}>({entry.scenarioId})</span>
        </span>,
        entry.summary.maxFlowPerMinute,
        fmtSeconds(entry.summary.clearanceSeconds),
        entry.summary.isolatedPopulation || "—",
        entry.delta.changedExitAssignments || "—",
        <Delta key={`fd-${entry.scenarioId}`} value={entry.delta.maxFlowPerMinute} />,
        <Delta key={`fc-${entry.scenarioId}`} value={entry.delta.clearanceSeconds} unit="s" />,
      ])}
    />
  );
}
