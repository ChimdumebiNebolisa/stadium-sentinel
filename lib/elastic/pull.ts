import {
  DEMO_INCIDENT_POOL,
  localStorageIncidentToPackage,
} from "@/lib/demo-incident-pool";
import { isElasticConfigured, elasticFetch, getElasticConfig } from "@/lib/elastic/client";
import {
  activeIncidentToPackage,
  normalizeElasticActiveIncidents,
} from "@/lib/elastic/normalize-pull";
import type {
  ElasticActiveIncident,
  ElasticEvidenceDocument,
  ElasticFacilityStatus,
  ElasticGateFlowLog,
  ElasticGuestAssistanceRequest,
  ElasticPolicyDocument,
  ElasticPullRelatedContext,
  ElasticRadioTranscript,
  ElasticStaffRosterEntry,
  IngestPullResponse,
} from "@/lib/elastic/pull-types";
import { buildPostEventReport, buildTimelineSeed } from "@/lib/report";
import { sortIncidentPackages } from "@/lib/radio-transcript-intake";

type ElasticSearchHit<TDocument> = {
  _source?: TDocument;
};

async function searchIndex<TDocument>(
  indexName: string,
  query: Record<string, unknown>,
  size = 50,
): Promise<TDocument[]> {
  const response = await elasticFetch(`/${indexName}/_search`, {
    method: "POST",
    body: JSON.stringify({
      size,
      _source: true,
      query,
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

async function fetchDocumentsByIds<TDocument extends { id: string }>(
  indexName: string,
  ids: string[],
): Promise<TDocument[]> {
  if (ids.length === 0) {
    return [];
  }

  const response = await elasticFetch(`/${indexName}/_search`, {
    method: "POST",
    body: JSON.stringify({
      size: ids.length,
      _source: true,
      query: {
        ids: {
          values: ids,
        },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Elastic ids search failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    hits?: { hits?: Array<ElasticSearchHit<TDocument>> };
  };

  return (payload.hits?.hits ?? [])
    .map((hit) => hit._source)
    .filter((document): document is TDocument => Boolean(document));
}

export async function fetchActiveIncidentsFromElastic(): Promise<ElasticActiveIncident[]> {
  const config = getElasticConfig();
  if (!config) {
    throw new Error("Elastic configuration is incomplete.");
  }

  return searchIndex<ElasticActiveIncident>(
    config.activeIncidentsIndex,
    { match_all: {} },
    50,
  );
}

export async function fetchRelatedPullContext(
  incidents: ElasticActiveIncident[],
): Promise<ElasticPullRelatedContext> {
  const config = getElasticConfig();
  if (!config) {
    throw new Error("Elastic configuration is incomplete.");
  }

  const incidentIds = incidents.map((incident) => incident.id);
  const evidenceIds = [
    ...new Set(incidents.flatMap((incident) => incident.evidenceIds ?? [])),
  ];
  const categories = [...new Set(incidents.map((incident) => incident.category))];
  const teams = [...new Set(incidents.map((incident) => incident.assignedRole))];

  const [
    guestAssistance,
    facilityStatus,
    gateFlowLogs,
    staffRoster,
    policies,
    radioTranscripts,
    evidence,
  ] = await Promise.all([
    searchIndex<ElasticGuestAssistanceRequest>(
      config.guestAssistanceIndex,
      {
        terms: {
          relatedIncidentId: incidentIds,
        },
      },
    ),
    searchIndex<ElasticFacilityStatus>(config.facilityStatusIndex, {
      terms: {
        relatedIncidentId: incidentIds,
      },
    }),
    searchIndex<ElasticGateFlowLog>(config.gateFlowLogsIndex, {
      terms: {
        relatedIncidentId: incidentIds,
      },
    }),
    searchIndex<ElasticStaffRosterEntry>(config.staffRosterIndex, {
      bool: {
        should: [
          { terms: { relatedIncidentIds: incidentIds } },
          ...teams.map((team) => ({ term: { team } })),
        ],
        minimum_should_match: 1,
      },
    }),
    searchIndex<ElasticPolicyDocument>(config.policiesIndex, {
      terms: {
        appliesToCategories: categories,
      },
    }),
    searchIndex<ElasticRadioTranscript>(config.radioTranscriptsIndex, {
      terms: {
        relatedIncidentIds: incidentIds,
      },
    }),
    fetchDocumentsByIds<ElasticEvidenceDocument>(config.evidenceIndex, evidenceIds),
  ]);

  return {
    guestAssistance,
    facilityStatus,
    gateFlowLogs,
    staffRoster,
    policies,
    radioTranscripts,
    evidence,
  };
}

export function buildDemoPullFallbackResponse(): IngestPullResponse {
  const incidents = DEMO_INCIDENT_POOL.slice(0, 4);
  const incidentPackages = sortIncidentPackages(
    incidents.map(localStorageIncidentToPackage),
  );
  const timeline = buildTimelineSeed(incidentPackages);
  const reportSummary = buildPostEventReport(incidentPackages, timeline);
  const count = incidentPackages.length;

  return {
    sourceMode: "demo",
    outcome: "fallback",
    ingestionSummary: `Fallback local ingestion applied ${count} incident package${count === 1 ? "" : "s"}.`,
    incidentPackages,
    timeline,
    reportSummary,
    meta: {
      pulledAt: new Date().toISOString(),
      incidentCount: count,
    },
  };
}

export async function pullLatestReportsFromElastic(
  includeTimeline = true,
): Promise<IngestPullResponse> {
  if (!isElasticConfigured()) {
    return buildDemoPullFallbackResponse();
  }

  try {
    const activeIncidents = await fetchActiveIncidentsFromElastic();
    if (activeIncidents.length === 0) {
      return buildDemoPullFallbackResponse();
    }

    const context = await fetchRelatedPullContext(activeIncidents);
    return normalizeElasticActiveIncidents(activeIncidents, context, includeTimeline);
  } catch {
    return buildDemoPullFallbackResponse();
  }
}

/** Exported for unit tests. */
export function mapActiveIncidentToPackage(
  incident: ElasticActiveIncident,
  context: ElasticPullRelatedContext,
) {
  return activeIncidentToPackage(incident, context);
}
