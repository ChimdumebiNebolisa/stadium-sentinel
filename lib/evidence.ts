import { getLocalOperationalEvidence, searchElasticOperationalEvidence } from "@/lib/elastic/search";
import type { EvidenceResult, RetrievalContext, RetrievalInput } from "@/lib/types";

function shouldUseLocalFallback(): boolean {
  return process.env.NODE_ENV === "test" || process.env.VITEST === "true";
}

function dedupeEvidence(evidence: EvidenceResult[]): EvidenceResult[] {
  const seen = new Set<string>();

  return evidence.filter((item) => {
    if (seen.has(item.sourceId)) {
      return false;
    }

    seen.add(item.sourceId);
    return true;
  });
}

export async function retrieveOperationalEvidence(
  input: RetrievalInput,
): Promise<EvidenceResult[]> {
  return (await retrieveOperationalEvidenceWithContext(input)).evidence;
}

export async function retrieveOperationalEvidenceWithContext(
  input: RetrievalInput,
): Promise<RetrievalContext> {
  if (shouldUseLocalFallback()) {
    return {
      evidence: dedupeEvidence(getLocalOperationalEvidence(input)),
      mode: "local",
    };
  }

  try {
    const evidence = dedupeEvidence(await searchElasticOperationalEvidence(input));

    if (evidence.length > 0) {
      return {
        evidence,
        mode: "elastic",
      };
    }
  } catch {
    // Fall through to deterministic local retrieval for demo continuity.
  }

  return {
    evidence: dedupeEvidence(getLocalOperationalEvidence(input)),
    mode: "local",
  };
}
