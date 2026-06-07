import type { IngestionOutcome, SourceMode } from "@/lib/source-mode";

export type SourceAuditEvent = {
  id: string;
  timestamp: string;
  sourceMode: SourceMode;
  label: string;
  summary: string;
  outcome: IngestionOutcome;
  incidentCount: number;
};

export const SOURCE_AUDIT_STORAGE_KEY = "stadium-sentinel-source-audit";
export const MAX_SOURCE_AUDIT_EVENTS = 20;

function createAuditId(): string {
  return `audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function capAuditEvents(events: SourceAuditEvent[]): SourceAuditEvent[] {
  return events.slice(0, MAX_SOURCE_AUDIT_EVENTS);
}

export function buildSourceAuditEvent(input: {
  sourceMode: SourceMode;
  label: string;
  summary: string;
  outcome: IngestionOutcome;
  incidentCount: number;
  timestamp?: string;
}): SourceAuditEvent {
  return {
    id: createAuditId(),
    timestamp: input.timestamp ?? new Date().toISOString(),
    sourceMode: input.sourceMode,
    label: input.label,
    summary: input.summary,
    outcome: input.outcome,
    incidentCount: input.incidentCount,
  };
}

export function loadSourceAuditEvents(): SourceAuditEvent[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SOURCE_AUDIT_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as SourceAuditEvent[];
    return Array.isArray(parsed) ? capAuditEvents(parsed) : [];
  } catch {
    return [];
  }
}

export function saveSourceAuditEvents(events: SourceAuditEvent[]): SourceAuditEvent[] {
  const capped = capAuditEvents(events);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(SOURCE_AUDIT_STORAGE_KEY, JSON.stringify(capped));
  }

  return capped;
}

export function appendSourceAuditEvent(
  event: SourceAuditEvent,
  existing: SourceAuditEvent[] = loadSourceAuditEvents(),
): SourceAuditEvent[] {
  return saveSourceAuditEvents([event, ...existing]);
}

export function getRecentSourceAuditExcerpts(
  events: SourceAuditEvent[],
  limit = 5,
): string[] {
  return events.slice(0, limit).map((event) => {
    const outcomeLabel =
      event.outcome === "fallback"
        ? "fallback"
        : event.outcome === "failed"
          ? "failed"
          : "applied";
    return `${event.label}: ${event.summary} (${outcomeLabel}, ${event.incidentCount} incident${event.incidentCount === 1 ? "" : "s"})`;
  });
}

export function formatSourceAuditTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return timestamp;
  }

  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
