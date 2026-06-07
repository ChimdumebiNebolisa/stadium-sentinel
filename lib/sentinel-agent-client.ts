import type {
  SentinelAskRequest,
  SentinelAskResponse,
} from "@/lib/agent/sentinel-schema";

export async function askSentinel(
  request: SentinelAskRequest,
): Promise<SentinelAskResponse> {
  const response = await fetch("/api/sentinel", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(`Sentinel request failed with status ${response.status}.`);
  }

  return (await response.json()) as SentinelAskResponse;
}
