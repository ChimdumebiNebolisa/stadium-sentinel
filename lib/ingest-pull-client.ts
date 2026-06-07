import type { IngestPullRequest, IngestPullResponse } from "@/lib/elastic/pull-types";

export async function fetchIngestPull(
  input: IngestPullRequest = {},
): Promise<IngestPullResponse> {
  const response = await fetch("/api/ingest/pull", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Ingest pull failed with status ${response.status}.`);
  }

  return (await response.json()) as IngestPullResponse;
}
