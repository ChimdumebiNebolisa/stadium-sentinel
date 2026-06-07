import type { IncidentPackage } from "@/lib/types";

export type TimelineWriteClientInput = {
  incidentId: string;
  actionIndex: number;
  actionLabel: string;
  actor?: string;
  sentinelRecommendationId?: string;
  incidentPackage: IncidentPackage;
};

export type TimelineWriteClientResponse = {
  timelineEntry: {
    id: string;
    incidentId: string;
    timestamp: string;
    type: "reported" | "suggested" | "approved";
    message: string;
    actor: string;
  };
  memoryWritten: boolean;
  elasticWritten: boolean;
  sourceAuditSummary: string;
};

export async function writeApprovedTimelineEntry(
  input: TimelineWriteClientInput,
): Promise<TimelineWriteClientResponse> {
  const response = await fetch("/api/timeline/write", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Timeline write failed with status ${response.status}.`);
  }

  return (await response.json()) as TimelineWriteClientResponse;
}
