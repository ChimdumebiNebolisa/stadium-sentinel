import { elasticFetch, getElasticConfig, isElasticConfigured } from "@/lib/elastic/client";
import type { ElasticRadioTranscript } from "@/lib/elastic/pull-types";

type ElasticSearchHit<TDocument> = {
  _source?: TDocument;
};

export function isRadioTranscriptQuestion(question: string): boolean {
  const normalized = question.toLowerCase();
  return (
    normalized.includes("radio") ||
    normalized.includes("transcript") ||
    normalized.includes("radio log") ||
    normalized.includes("radio operator")
  );
}

export async function searchElasticRadioTranscripts(input: {
  queryText: string;
  incidentId?: string;
  size?: number;
}): Promise<ElasticRadioTranscript[]> {
  if (!isElasticConfigured()) {
    return [];
  }

  const config = getElasticConfig();
  if (!config) {
    return [];
  }

  const shouldClauses: Array<Record<string, unknown>> = [
    {
      multi_match: {
        query: input.queryText,
        fields: ["label^3", "excerpt^4", "searchText^4", "lines^3"],
      },
    },
  ];

  if (input.incidentId) {
    shouldClauses.push({
      term: {
        relatedIncidentIds: input.incidentId,
      },
    });
  }

  const response = await elasticFetch(`/${config.radioTranscriptsIndex}/_search`, {
    method: "POST",
    body: JSON.stringify({
      size: input.size ?? 4,
      _source: true,
      query: {
        bool: {
          should: shouldClauses,
          minimum_should_match: 1,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Elastic radio transcript search failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    hits?: { hits?: Array<ElasticSearchHit<ElasticRadioTranscript>> };
  };

  return (payload.hits?.hits ?? [])
    .map((hit) => hit._source)
    .filter((document): document is ElasticRadioTranscript => Boolean(document));
}

export function mergeRadioTranscriptEvidence(
  transcripts: ElasticRadioTranscript[],
  existingSourceIds: Set<string>,
) {
  return transcripts
    .filter((transcript) => !existingSourceIds.has(transcript.id))
    .map((transcript) => ({
      title: transcript.label,
      sourceType: "radio_log" as const,
      excerpt: transcript.excerpt,
      rationale: transcript.lines.slice(0, 2).join(" "),
      sourceId: transcript.id,
    }));
}

export function mergeRadioTranscriptCitations(
  transcripts: ElasticRadioTranscript[],
  indexName: string,
  existingSourceIds: Set<string>,
) {
  return transcripts
    .filter((transcript) => !existingSourceIds.has(transcript.id))
    .map((transcript) => ({
      sourceId: transcript.id,
      title: transcript.label,
      excerpt: transcript.excerpt,
      index: indexName,
    }));
}
