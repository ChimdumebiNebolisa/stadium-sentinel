"use client";

import { useMemo } from "react";
import type { EffectiveEdge, EffectiveNode } from "@/engine/graph";
import type { SimArcStat } from "@/engine/simulate";

const NODE_COLORS: Record<EffectiveNode["type"], string> = {
  section: "#38bdf8",
  concourse: "#a78bfa",
  corridor: "#94a3b8",
  stairwell: "#94a3b8",
  ramp: "#94a3b8",
  gate: "#34d399",
  checkpoint: "#fbbf24",
  refuge: "#2dd4bf",
};

const NODE_LABELS: Record<EffectiveNode["type"], string> = {
  section: "Seating section",
  concourse: "Concourse",
  corridor: "Corridor junction",
  stairwell: "Stairwell",
  ramp: "Ramp",
  gate: "Gate / exit",
  checkpoint: "Checkpoint",
  refuge: "Refuge area",
};

export interface VenueGraphProps {
  nodes: EffectiveNode[];
  edges: EffectiveEdge[];
  clearanceSeconds: number;
  statsByEdgeId: Map<string, SimArcStat[]>;
  minCutEdgeIds: Set<string>;
  disabledEdgeIds: Set<string>;
  routePathNodeIds: string[] | null;
  isolatedOriginIds: Set<string>;
  selectedOriginId: string | null;
  onSelectOrigin: (originId: string | null) => void;
}

export function VenueGraph(props: VenueGraphProps) {
  const {
    nodes,
    edges,
    clearanceSeconds,
    statsByEdgeId,
    minCutEdgeIds,
    disabledEdgeIds,
    routePathNodeIds,
    isolatedOriginIds,
    selectedOriginId,
    onSelectOrigin,
  } = props;

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const routePoints = useMemo(() => {
    if (!routePathNodeIds) return "";
    return routePathNodeIds
      .map((id) => nodeById.get(id))
      .filter((n): n is EffectiveNode => n !== undefined)
      .map((n) => `${n.x},${n.y}`)
      .join(" ");
  }, [routePathNodeIds, nodeById]);

  return (
    <svg
      viewBox="0 0 100 100"
      className="w-full"
      role="img"
      aria-label="Venue graph schematic showing sections, concourses, routes, exits, closures, and congestion"
    >
      {/* Edges */}
      {edges.map((edge) => {
        const a = nodeById.get(edge.from);
        const b = nodeById.get(edge.to);
        if (!a || !b || a.closed || b.closed) return null;
        const stats = statsByEdgeId.get(edge.id);
        const totalFlow = stats ? stats.reduce((s, x) => s + x.totalFlow, 0) : 0;
        const saturated =
          stats && clearanceSeconds > 0
            ? Math.min(
                1,
                stats.reduce((s, x) => s + x.saturationSeconds, 0) / clearanceSeconds,
              )
            : 0;
        const width = Math.max(0.45, Math.min(2.6, edge.capacityPerMinute / 450));
        const color = disabledEdgeIds.has(edge.id)
          ? "#f87171"
          : saturated > 0
            ? `color-mix(in srgb, var(--bad) ${Math.round(saturated * 100)}%, var(--warn))`
            : "rgba(124,146,170,0.55)";
        const dash = disabledEdgeIds.has(edge.id) ? "1.4 1" : undefined;
        return (
          <g key={edge.id}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={color}
              strokeWidth={width}
              strokeDasharray={dash}
            />
            {minCutEdgeIds.has(edge.id) && !disabledEdgeIds.has(edge.id) ? (
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke="var(--accent)"
                strokeWidth={width + 0.9}
                strokeOpacity={0.35}
                strokeLinecap="round"
              />
            ) : null}
            {totalFlow > 0 ? (
              <title>
                {`${edge.id}: ${totalFlow} people, capacity ${edge.capacityPerMinute}/min${
                  stats && stats.reduce((s, x) => s + x.saturationSeconds, 0) > 0
                    ? `, saturated ${Math.round(stats.reduce((s, x) => s + x.saturationSeconds, 0))}s`
                    : ""
                }`}
              </title>
            ) : (
              <title>{`${edge.id}: capacity ${edge.capacityPerMinute}/min${dash ? " (disabled)" : ""}`}</title>
            )}
          </g>
        );
      })}

      {/* Route overlay */}
      {routePoints ? (
        <polyline
          points={routePoints}
          fill="none"
          stroke="var(--route)"
          strokeWidth={0.8}
          strokeOpacity={0.95}
          strokeLinejoin="round"
        />
      ) : null}

      {/* Nodes */}
      {nodes.map((node) => {
        if (node.closed) {
          return (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r={2.2} fill="none" stroke="#f87171" strokeWidth={0.5} strokeDasharray="0.8 0.6" />
              <line x1={node.x - 1.6} y1={node.y - 1.6} x2={node.x + 1.6} y2={node.y + 1.6} stroke="#f87171" strokeWidth={0.7} />
              <line x1={node.x - 1.6} y1={node.y + 1.6} x2={node.x + 1.6} y2={node.y - 1.6} stroke="#f87171" strokeWidth={0.7} />
              <text x={node.x} y={labelY(node)} textAnchor="middle" fontSize={2.4} fill="#f87171">
                {node.label} (closed)
              </text>
            </g>
          );
        }
        const radius = nodeRadius(node);
        const isIsolated = isolatedOriginIds.has(node.id);
        const isSelected = selectedOriginId === node.id;
        return (
          <g
            key={node.id}
            onClick={
              node.occupancy > 0
                ? () => onSelectOrigin(isSelected ? null : node.id)
                : undefined
            }
            style={node.occupancy > 0 ? { cursor: "pointer" } : undefined}
          >
            {isIsolated ? (
              <circle cx={node.x} cy={node.y} r={radius + 1.4} fill="none" stroke="#f87171" strokeWidth={0.55} />
            ) : null}
            <circle cx={node.x} cy={node.y} r={radius} fill={NODE_COLORS[node.type]} fillOpacity={0.85} />
            {isSelected ? (
              <circle cx={node.x} cy={node.y} r={radius + 1.1} fill="none" stroke="var(--route)" strokeWidth={0.55} />
            ) : null}
            <title>{nodeTooltip(node, statsByEdgeId)}</title>
            <text x={node.x} y={labelY(node)} textAnchor="middle" fontSize={2.4} fill="var(--fg-dim)">
              {node.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function nodeRadius(node: EffectiveNode): number {
  if (node.type === "gate") return 3;
  if (node.type === "section") {
    return node.occupancy > 0 ? 2.2 + Math.sqrt(node.occupancy) / 14 : 2.2;
  }
  return 2.1;
}

function labelY(node: EffectiveNode): number {
  // Keep labels inside the viewBox: below the node when it sits high, above otherwise.
  return node.y < 50 ? node.y + nodeRadius(node) + 2.4 : node.y - nodeRadius(node) - 1.4;
}

function nodeTooltip(
  node: EffectiveNode,
  statsByEdgeId: Map<string, SimArcStat[]>,
): string {
  const parts = [
    `${node.label} — ${NODE_LABELS[node.type]}`,
    node.capacity !== undefined ? `capacity ${node.capacity}` : undefined,
    node.occupancy > 0 ? `occupancy ${node.occupancy}` : undefined,
  ];
  void statsByEdgeId;
  return parts.filter(Boolean).join(", ");
}

export function GraphLegend() {
  const entries: { color: string; label: string }[] = [
    { color: NODE_COLORS.section, label: "Section (size ∝ occupancy)" },
    { color: NODE_COLORS.concourse, label: "Concourse" },
    { color: NODE_COLORS.gate, label: "Gate / exit" },
    { color: NODE_COLORS.checkpoint, label: "Checkpoint" },
    { color: NODE_COLORS.refuge, label: "Refuge" },
    { color: "rgba(124,146,170,0.55)", label: "Route edge (width ∝ capacity)" },
    { color: "var(--warn)", label: "Congested edge" },
    { color: "#f87171", label: "Closed / disabled" },
    { color: "var(--accent)", label: "Min-cut member (glow)" },
    { color: "var(--route)", label: "Selected origin route" },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 p-0 m-0 list-none">
      {entries.map((entry) => (
        <li key={entry.label} className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--fg-dim)" }}>
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 10,
              height: 10,
              borderRadius: entry.label.startsWith("Route edge") ? 2 : 999,
              background: entry.color,
              border:
                entry.label.startsWith("Min-cut") || entry.label.startsWith("Selected")
                  ? "none"
                  : "1px solid rgba(124,146,170,0.4)",
              boxShadow: entry.label.startsWith("Min-cut") ? `0 0 4px ${entry.color}` : undefined,
            }}
          />
          {entry.label}
        </li>
      ))}
    </ul>
  );
}

export { NODE_LABELS as venueNodeLabels };
