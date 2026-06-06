import {
  getLocalAgentContext,
  getLocalOperationalEvidence,
  searchElasticAgentContext,
  searchElasticOperationalEvidence,
} from "@/lib/elastic/search";
import type {
  AgentContextSearchInput,
  AgentRetrievalBundle,
  AgentRetrievalResult,
  EvidenceResult,
  RetrievalContext,
  RetrievalInput,
} from "@/lib/types";

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

function hasElasticContext(bundle: AgentRetrievalBundle): boolean {
  return (
    bundle.playbooks.length > 0 ||
    bundle.locations.length > 0 ||
    bundle.incidentExamples.length > 0 ||
    bundle.evidence.length > 0
  );
}

function mergeBundleGroup<TDocument extends { id: string }>(
  primary: TDocument[],
  fallback: TDocument[],
): TDocument[] {
  const seen = new Set<string>();
  const merged: TDocument[] = [];

  for (const document of [...primary, ...fallback]) {
    if (seen.has(document.id)) {
      continue;
    }

    seen.add(document.id);
    merged.push(document);
  }

  return merged;
}

export async function retrieveAgentContext(
  input: AgentContextSearchInput,
): Promise<AgentRetrievalResult> {
  const localBundle = getLocalAgentContext(input);

  if (shouldUseLocalFallback()) {
    return {
      ...localBundle,
      mode: "local",
    };
  }

  try {
    const elasticBundle = await searchElasticAgentContext(input);

    if (!hasElasticContext(elasticBundle)) {
      return {
        ...localBundle,
        mode: "local",
      };
    }

    return {
      playbooks: mergeBundleGroup(elasticBundle.playbooks, localBundle.playbooks),
      locations: mergeBundleGroup(elasticBundle.locations, localBundle.locations),
      incidentExamples: mergeBundleGroup(
        elasticBundle.incidentExamples,
        localBundle.incidentExamples,
      ),
      evidence: mergeBundleGroup(elasticBundle.evidence, localBundle.evidence),
      mode: "elastic",
    };
  } catch {
    return {
      ...localBundle,
      mode: "local",
    };
  }
}
