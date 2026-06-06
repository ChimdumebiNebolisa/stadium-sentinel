import {
  getOperationalKnowledgeDocuments,
  type IndexedOperationalDocument,
} from "@/lib/elastic/documents";
import { elasticFetch, getElasticConfig } from "@/lib/elastic/client";
import {
  locationRecords,
  stadiumEvidenceRecords,
  stadiumIncidentExampleRecords,
  stadiumPlaybookRecords,
} from "@/lib/data";
import type {
  AgentContextSearchInput,
  AgentRetrievalBundle,
  EvidenceResult,
  IncidentCategory,
  RetrievalInput,
  StadiumEvidenceMemoryDocument,
  StadiumIncidentExampleDocument,
  StadiumLocationMemoryDocument,
  StadiumPlaybookDocument,
} from "@/lib/types";

type ElasticSearchHit<TDocument> = {
  _source?: TDocument;
};

type ElasticIndexSearchOptions = {
  fields: string[];
  filters?: Array<Record<string, string | string[]>>;
  indexName: string;
  size: number;
};

function buildLocationMemoryDocuments(): StadiumLocationMemoryDocument[] {
  return locationRecords.map((location) => ({
    id: location.id,
    label: location.name,
    aliases: location.aliases,
    zoneLayer:
      location.zoneLayer === "bowl"
        ? "Stands"
        : location.zoneLayer.charAt(0).toUpperCase() + location.zoneLayer.slice(1),
    defaultTeams: location.defaultTeams,
    operationalRisks: location.operationalRisks,
    accessibilityCritical: location.accessibilityCritical,
    crowdFlowCritical: location.crowdFlowCritical,
    searchText: [
      location.name,
      location.displayName,
      location.description,
      location.aliases.join(" "),
      location.defaultTeams.join(" "),
      location.operationalRisks.join(" "),
    ]
      .filter(Boolean)
      .join(" "),
  }));
}

const localLocationMemoryDocuments = buildLocationMemoryDocuments();

function toEvidenceResult(document: IndexedOperationalDocument): EvidenceResult {
  return {
    title: document.title,
    sourceType: document.sourceType,
    excerpt: document.excerpt,
    rationale: document.rationale,
    sourceId: document.id,
  };
}

function toIncidentExampleEvidence(
  document: StadiumIncidentExampleDocument,
): EvidenceResult {
  return {
    title: document.expectedTitles[0] || document.id,
    sourceType: "historical_incident",
    excerpt: document.messyReport,
    rationale: `Expected actions: ${document.expectedActions.join(" | ")}`,
    sourceId: document.id,
  };
}

function toPlaybookEvidence(document: StadiumPlaybookDocument): EvidenceResult {
  return {
    title: document.title,
    sourceType: "runbook",
    excerpt: document.excerpt,
    rationale: document.body,
    sourceId: document.id,
  };
}

function toLocationEvidence(document: StadiumLocationMemoryDocument): EvidenceResult {
  return {
    title: document.label,
    sourceType: "location",
    excerpt: document.operationalRisks.join(", "),
    rationale: `${document.zoneLayer} coverage with ${document.defaultTeams.join(", ")} defaults.`,
    sourceId: document.id,
  };
}

async function searchElasticIndex<TDocument>(
  queryText: string,
  options: ElasticIndexSearchOptions,
): Promise<TDocument[]> {
  const response = await elasticFetch(`/${options.indexName}/_search`, {
    method: "POST",
    body: JSON.stringify({
      size: options.size,
      _source: true,
      query: {
        bool: {
          should: [
            {
              multi_match: {
                query: queryText,
                fields: options.fields,
              },
            },
            ...(options.filters ?? []).map((filter) => ({ term: filter })),
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
    hits?: { hits?: Array<ElasticSearchHit<TDocument>> };
  };

  return (payload.hits?.hits ?? [])
    .map((hit) => hit._source)
    .filter((document): document is TDocument => Boolean(document));
}

function getQueryTermsFromIncidentInput(input: RetrievalInput): string[] {
  return normalizeTerms([
    input.incidentTitle,
    input.incidentCategory,
    input.locationName,
    input.priority,
    input.reportText,
  ]);
}

function getQueryTermsFromAgentInput(input: AgentContextSearchInput): string[] {
  return normalizeTerms([
    input.report,
    ...input.incidents.flatMap((incident) => [
      incident.id,
      incident.title,
      incident.category,
      incident.locationId,
      incident.locationLabel,
      incident.priority,
    ]),
  ]);
}

function buildAgentQueryText(input: AgentContextSearchInput): string {
  return [
    input.report,
    ...input.incidents.flatMap((incident) => [
      incident.title,
      incident.category,
      incident.locationId,
      incident.locationLabel,
      incident.priority,
    ]),
  ]
    .filter(Boolean)
    .join(" ");
}

function dedupeById<TDocument extends { id: string }>(
  documents: TDocument[],
): TDocument[] {
  const seen = new Set<string>();

  return documents.filter((document) => {
    if (seen.has(document.id)) {
      return false;
    }

    seen.add(document.id);
    return true;
  });
}

function rankLocalDocuments<TDocument extends { id: string; searchText: string }>(
  documents: TDocument[],
  terms: string[],
  size: number,
): TDocument[] {
  return documents
    .map((document) => ({
      document,
      score: scoreText(document.searchText, terms),
    }))
    .filter(({ score }) => score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return left.document.id.localeCompare(right.document.id);
    })
    .slice(0, size)
    .map(({ document }) => document);
}

export async function searchElasticAgentContext(
  input: AgentContextSearchInput,
): Promise<AgentRetrievalBundle> {
  const config = getElasticConfig();

  if (!config) {
    throw new Error("Elastic configuration is incomplete.");
  }

  const queryText = buildAgentQueryText(input);
  const locationIds = input.incidents.map((incident) => incident.locationId);
  const locationLabels = input.incidents.map((incident) => incident.locationLabel);

  const [playbooks, locations, incidentExamples, evidence] = await Promise.all([
    searchElasticIndex<StadiumPlaybookDocument>(queryText, {
      fields: ["title^4", "excerpt^3", "body^2", "searchText^4", "teams^2", "riskTags^2"],
      filters: locationIds.map((locationId) => ({ locationIds: locationId })),
      indexName: config.playbooksIndex,
      size: 4,
    }),
    searchElasticIndex<StadiumLocationMemoryDocument>(queryText, {
      fields: ["label^4", "aliases^4", "searchText^3", "defaultTeams^2", "operationalRisks^2"],
      filters: [
        ...locationIds.map((locationId) => ({ id: locationId })),
        ...locationLabels.map((label) => ({ label })),
      ],
      indexName: config.locationsIndex,
      size: 4,
    }),
    searchElasticIndex<StadiumIncidentExampleDocument>(queryText, {
      fields: ["messyReport^4", "expectedTitles^3", "expectedActions^2", "searchText^4"],
      indexName: config.incidentExamplesIndex,
      size: 3,
    }),
    searchElasticIndex<StadiumEvidenceMemoryDocument>(queryText, {
      fields: ["excerpt^3", "body^2", "incidentHints^2", "searchText^4"],
      filters: locationIds.map((locationId) => ({ locationIds: locationId })),
      indexName: config.evidenceIndex,
      size: 5,
    }),
  ]);

  return {
    playbooks: dedupeById(playbooks),
    locations: dedupeById(locations),
    incidentExamples: dedupeById(incidentExamples),
    evidence: dedupeById(evidence),
  };
}

export function getLocalAgentContext(
  input: AgentContextSearchInput,
): AgentRetrievalBundle {
  const terms = getQueryTermsFromAgentInput(input);

  return {
    playbooks: dedupeById(rankLocalDocuments(stadiumPlaybookRecords, terms, 4)),
    locations: dedupeById(rankLocalDocuments(localLocationMemoryDocuments, terms, 4)),
    incidentExamples: dedupeById(
      rankLocalDocuments(stadiumIncidentExampleRecords, terms, 3),
    ),
    evidence: dedupeById(rankLocalDocuments(stadiumEvidenceRecords, terms, 5)),
  };
}

export async function searchElasticOperationalEvidence(
  input: RetrievalInput,
): Promise<EvidenceResult[]> {
  const matchedLocation =
    locationRecords.find((location) => location.name === input.locationName) ??
    locationRecords.find((location) =>
      location.aliases.some((alias) => alias.toLowerCase() === input.locationName.toLowerCase()),
    );
  const bundle = await searchElasticAgentContext({
    report: input.reportText,
    incidents: [
      {
        id: input.incidentTitle,
        title: input.incidentTitle,
        category: input.incidentCategory as IncidentCategory,
        locationId: matchedLocation?.id ?? input.locationName,
        locationLabel: input.locationName,
        priority: input.priority,
      },
    ],
  });

  return dedupeEvidence([
    ...bundle.playbooks.map(toPlaybookEvidence),
    ...bundle.locations.map(toLocationEvidence),
    ...bundle.incidentExamples.map(toIncidentExampleEvidence),
  ]).slice(0, 5);
}

export function getLocalOperationalEvidence(input: RetrievalInput): EvidenceResult[] {
  const queryTerms = getQueryTermsFromIncidentInput(input);

  const rankedDocuments = getOperationalKnowledgeDocuments()
    .map((document) => ({
      document,
      matchCount: scoreOperationalDocument(document, queryTerms),
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

function normalizeTerms(parts: string[]): string[] {
  return parts
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((term) => term.length > 2);
}

function scoreText(searchText: string, terms: string[]): number {
  const haystack = searchText.toLowerCase();

  return terms.reduce((score, term) => {
    return haystack.includes(term) ? score + 1 : score;
  }, 0);
}

function scoreOperationalDocument(
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
