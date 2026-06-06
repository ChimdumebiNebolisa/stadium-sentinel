import { getElasticConfig, elasticFetch } from "./client";
import type { StadiumIncidentMemoryDocument } from "../types";

export async function appendIncidentMemory(
  documents: StadiumIncidentMemoryDocument[]
): Promise<void> {
  const config = getElasticConfig();
  if (!config || documents.length === 0) {
    return;
  }

  const ndjson = documents
    .flatMap((doc) => [
      { index: { _index: config.incidentMemoryIndex } },
      doc,
    ])
    .map((item) => JSON.stringify(item))
    .join("\n") + "\n";

  try {
    const fetchPromise = elasticFetch("/_bulk", {
      method: "POST",
      headers: { "Content-Type": "application/x-ndjson" },
      body: ndjson,
    });

    const timeoutPromise = new Promise<Response>((_, reject) =>
      setTimeout(() => reject(new Error("Elastic timeout")), 2000)
    );

    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    if (!response.ok) {
      console.warn(`Memory write-back returned status: ${response.status}`);
    }
  } catch (error) {
    console.warn("Elastic memory write failed (suppressed):", error);
  }
}
