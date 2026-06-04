import {
  getOperationalKnowledgeDocuments,
  type IndexedOperationalDocument,
} from "@/lib/elastic/documents";
import { elasticFetch, getElasticConfig } from "@/lib/elastic/client";
import type { EvidenceResult, RetrievalInput } from "@/lib/types";

type ElasticSearchHit = {
  _source?: IndexedOperationalDocument;
};

function toEvidenceResult(document: IndexedOperationalDocument): EvidenceResult {
  return {
    title: document.title,
    sourceType: document.sourceType,
    excerpt: document.excerpt,
    rationale: document.rationale,
    sourceId: document.id,
  };
}

export async function searchElasticOperationalEvidence(
  input: RetrievalInput,
): Promise<EvidenceResult[]> {
  const config = getElasticConfig();

  if (!config) {
    throw new Error("Elastic configuration is incomplete.");
  }

  const queryText = [
    input.incidentTitle,
    input.incidentCategory,
    input.locationName,
    input.priority,
    input.reportText,
  ]
    .filter(Boolean)
    .join(" ");

  const response = await elasticFetch(`/${config.indexName}/_search`, {
    method: "POST",
    body: JSON.stringify({
      size: 5,
      _source: [
        "id",
        "sourceType",
        "title",
        "excerpt",
        "body",
        "rationale",
        "incidentTypes",
        "categories",
        "locationIds",
        "locationNames",
        "priorityLevels",
        "terms",
      ],
      query: {
        bool: {
          should: [
            {
              multi_match: {
                query: queryText,
                fields: ["title^4", "excerpt^3", "body^2", "content^4", "terms^3"],
              },
            },
            { term: { locationNames: input.locationName } },
            { term: { categories: input.incidentCategory } },
            { term: { priorityLevels: input.priority } },
          ],
          minimum_should_match: 1,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Elastic search failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    hits?: { hits?: ElasticSearchHit[] };
  };

  return (payload.hits?.hits ?? [])
    .map((hit) => hit._source)
    .filter((document): document is IndexedOperationalDocument => Boolean(document))
    .map(toEvidenceResult);
}

export function getLocalOperationalEvidence(input: RetrievalInput): EvidenceResult[] {
  const queryTerms = normalizeTerms([
    input.incidentTitle,
    input.incidentCategory,
    input.locationName,
    input.priority,
    input.reportText,
  ]);

  const rankedDocuments = getOperationalKnowledgeDocuments()
    .map((document) => ({
      document,
      matchCount: scoreDocument(document, queryTerms),
    }))
    .filter(({ matchCount }) => matchCount > 0)
    .sort((left, right) => {
      if (right.matchCount !== left.matchCount) {
        return right.matchCount - left.matchCount;
      }

      return left.document.title.localeCompare(right.document.title);
    });
  const selected: IndexedOperationalDocument[] = [];
  const selectedIds = new Set<string>();
  const coveredSourceTypes = new Set<string>();

  for (const { document } of rankedDocuments) {
    if (!coveredSourceTypes.has(document.sourceType)) {
      selected.push(document);
      selectedIds.add(document.id);
      coveredSourceTypes.add(document.sourceType);
    }

    if (selected.length === 5) {
      break;
    }
  }

  for (const { document } of rankedDocuments) {
    if (selected.length === 5) {
      break;
    }

    if (!selectedIds.has(document.id)) {
      selected.push(document);
      selectedIds.add(document.id);
    }
  }

  return selected.map(toEvidenceResult);
}

function normalizeTerms(parts: string[]): string[] {
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2);
}

function scoreDocument(
  document: IndexedOperationalDocument,
  terms: string[],
): number {
  const haystack = [
    document.title,
    document.excerpt,
    document.body,
    document.rationale,
    document.terms.join(" "),
    document.locationNames.join(" "),
    document.categories.join(" "),
    document.priorityLevels.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return terms.reduce((score, term) => {
    return haystack.includes(term) ? score + 1 : score;
  }, 0);
}
