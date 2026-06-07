import { getElasticConfig, elasticFetch, isElasticConfigured } from "@/lib/elastic/client";
import { appendIncidentMemory } from "@/lib/elastic/memory";
import type { ElasticDispatchTimelineEntry } from "@/lib/elastic/pull-types";
import type {
  IncidentPackage,
  StadiumIncidentMemoryDocument,
  TimelineEntry,
} from "@/lib/types";

export type TimelineWriteInput = {
  incidentId: string;
  actionIndex: number;
  actionLabel: string;
  actor?: string;
  sentinelRecommendationId?: string;
  incidentPackage: IncidentPackage;
};

export type TimelineWriteResult = {
  timelineEntry: TimelineEntry;
  dispatchDocument: ElasticDispatchTimelineEntry;
  memoryDocument: StadiumIncidentMemoryDocument;
};

export function buildTimelineEntryFromApproval(
  input: TimelineWriteInput,
): TimelineWriteResult {
  const actor = input.actor ?? "Operations Lead";
  const timestamp = new Date().toISOString();
  const entryId = `${input.incidentId}-approved-${input.actionIndex}`;
  const { incident } = input.incidentPackage;

  const timelineEntry: TimelineEntry = {
    id: entryId,
    incidentId: input.incidentId,
    timestamp,
    type: "approved",
    message: input.actionLabel,
    actor,
  };

  const dispatchDocument: ElasticDispatchTimelineEntry = {
    id: entryId,
    incidentId: input.incidentId,
    timestamp,
    type: "approved",
    message: input.actionLabel,
    actor,
    source: input.sentinelRecommendationId ? "sentinel" : "operator",
    recommendedActionId: input.sentinelRecommendationId,
    searchText: [
      incident.title,
      incident.locationLabel,
      input.actionLabel,
      actor,
    ].join(" "),
  };

  const memoryDocument: StadiumIncidentMemoryDocument = {
    timestamp,
    incidentId: incident.id,
    title: incident.title,
    locationId: incident.locationId,
    locationLabel: incident.locationLabel,
    team: incident.assignedRole,
    priority: incident.priority,
    status: incident.status,
    summary: incident.rawText,
    approvedActionIds: incident.approvedActionIds,
    evidenceRefs: input.incidentPackage.evidence.map((item) => item.sourceId),
    source: "timeline_write_route",
  };

  return {
    timelineEntry,
    dispatchDocument,
    memoryDocument,
  };
}

export async function writeApprovedActionToElastic(
  input: TimelineWriteInput,
): Promise<{ elasticWritten: boolean; result: TimelineWriteResult }> {
  const result = buildTimelineEntryFromApproval(input);

  if (!isElasticConfigured()) {
    return { elasticWritten: false, result };
  }

  const config = getElasticConfig();
  if (!config) {
    return { elasticWritten: false, result };
  }

  const ndjson = [
    { index: { _index: config.dispatchTimelineIndex } },
    result.dispatchDocument,
    { index: { _index: config.incidentMemoryIndex } },
    result.memoryDocument,
  ]
    .map((item) => JSON.stringify(item))
    .join("\n") + "\n";

  try {
    const fetchPromise = elasticFetch("/_bulk", {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson" },
      body: ndjson,
    });
    const timeoutPromise = new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error("Elastic timeout")), 2000),
    );
    const response = await Promise.race([fetchPromise, timeoutPromise]);

    if (!response.ok) {
      return { elasticWritten: false, result };
    }

    return { elasticWritten: true, result };
  } catch {
    try {
      await appendIncidentMemory([result.memoryDocument]);
    } catch {
      // Suppress write failures — local UI path remains authoritative.
    }
    return { elasticWritten: false, result };
  }
}
