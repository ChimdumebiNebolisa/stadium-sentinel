"use client";

import type { SimulationResult } from "@/engine/simulate";

/** Cumulative evacuation curve rendered as a deterministic inline SVG chart. */
export function EvacuationCurve({ simulation }: { simulation: SimulationResult }) {
  const curve = simulation.curve;
  const width = 640;
  const height = 180;
  const padX = 42;
  const padY = 18;

  const maxT = Math.max(1, curve.length > 0 ? curve[curve.length - 1]!.tSeconds : 1);
  const maxPeople = Math.max(1, simulation.simulatedPopulation);

  const toX = (t: number): number => padX + (t / maxT) * (width - padX - 8);
  const toY = (people: number): number =>
    height - padY - (people / maxPeople) * (height - padY * 2);

  const path = curve
    .map((point, i) => `${i === 0 ? "M" : "L"} ${toX(point.tSeconds).toFixed(2)} ${toY(point.evacuated).toFixed(2)}`)
    .join(" ");

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    label: formatTick(maxT * f),
    x: toX(maxT * f),
  }));
  const yTicks = [0, 0.5, 1].map((f) => ({
    label: String(Math.round(maxPeople * f)),
    y: toY(maxPeople * f),
  }));

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      role="img"
      aria-label={`Cumulative evacuated people over time; ${simulation.evacuated} of ${simulation.simulatedPopulation} evacuated`}
    >
      <rect x={0} y={0} width={width} height={height} fill="var(--bg-subpanel)" rx={8} />
      {yTicks.map((tick) => (
        <g key={`y-${tick.label}`}>
          <line x1={padX} x2={width - 8} y1={tick.y} y2={tick.y} stroke="var(--border)" strokeWidth={0.5} />
          <text x={padX - 5} y={tick.y + 3} textAnchor="end" fontSize={9} fill="var(--fg-dim)" fontFamily="var(--font-plex-mono)">
            {tick.label}
          </text>
        </g>
      ))}
      {xTicks.map((tick) => (
        <g key={`x-${tick.label}`}>
          <line x1={tick.x} x2={tick.x} y1={padY} y2={height - padY} stroke="var(--border)" strokeWidth={0.5} />
          <text x={tick.x} y={height - 4} textAnchor="middle" fontSize={9} fill="var(--fg-dim)" fontFamily="var(--font-plex-mono)">
            {tick.label}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}

function formatTick(seconds: number): string {
  if (seconds >= 3600) {
    const h = seconds / 3600;
    return `${Math.round(h * 10) / 10}h`;
  }
  if (seconds >= 60) return `${Math.round(seconds / 60)}m`;
  return `${Math.round(seconds)}s`;
}
