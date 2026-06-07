import {
  answerSentinelQuestion,
  type CommandState,
} from "@/lib/sentinel-command-agent";
import {
  buildSentinelResponseSchema,
  validateSentinelAgentResponse,
  type SentinelAskRequest,
  type SentinelAskResponse,
  type SentinelCitation,
} from "@/lib/agent/sentinel-schema";
import {
  buildSentinelSystemPrompt,
  buildSentinelUserPrompt,
} from "@/lib/agent/sentinel-prompt";
import { generateVertexStructuredResponse, isVertexConfigured } from "@/lib/agent/vertex";
import { getElasticConfig, isElasticConfigured, elasticFetch } from "@/lib/elastic/client";
import type {
  ElasticEvidenceDocument,
  ElasticPolicyDocument,
  ElasticRadioTranscript,
} from "@/lib/elastic/pull-types";
import { getLocalAgentContext, searchElasticAgentContext } from "@/lib/elastic/search";
import {
  isRadioTranscriptQuestion,
  searchElasticRadioTranscripts,
} from "@/lib/elastic/transcript-search";
import type { AgentRetrievalBundle, EvidenceResult, IncidentPackage } from "@/lib/types";

function isAgentBackendEnabled(): boolean {
  return process.env.AGENT_BACKEND_ENABLED === "true";
}

type ElasticSearchHit<TDocument> = {
  _source?: TDocument;
};

async function searchOperationalIndex<TDocument>(
  indexName: string,
  query: Record<string, unknown>,
  size = 5,
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

async function retrieveSentinelElasticContext(
  request: SentinelAskRequest,
): Promise<{
  retrieval: AgentRetrievalBundle;
  supplementalEvidence: EvidenceResult[];
  citations: SentinelCitation[];
}> {
  const config = getElasticConfig();
  if (!config) {
    throw new Error("Elastic configuration is incomplete.");
  }

  const { incident } = request.context.incidentPackage;
  const baseBundle = await searchElasticAgentContext({
    report: `${request.question} ${incident.rawText}`,
    incidents: [
      {
        id: incident.id,
        title: incident.title,
        category: incident.category,
        locationId: incident.locationId,
        locationLabel: incident.locationLabel,
        priority: incident.priority,
      },
    ],
  });

  const [policies, radioTranscripts, evidenceDocs, searchedTranscripts] = await Promise.all([
    searchOperationalIndex<ElasticPolicyDocument>(config.policiesIndex, {
      terms: { appliesToCategories: [incident.category] },
    }),
    searchOperationalIndex<ElasticRadioTranscript>(config.radioTranscriptsIndex, {
      terms: { relatedIncidentIds: [incident.id] },
    }),
    searchOperationalIndex<ElasticEvidenceDocument>(config.evidenceIndex, {
      bool: {
        should: [
          { terms: { locationIds: [incident.locationId] } },
          ...(incident.evidenceIds ?? []).map((id) => ({ term: { id } })),
        ],
        minimum_should_match: 1,
      },
    }),
    isRadioTranscriptQuestion(request.question)
      ? searchElasticRadioTranscripts({
          queryText: request.question,
          incidentId: incident.id,
        })
      : Promise.resolve([]),
  ]);

  const mergedTranscripts = dedupeRadioTranscripts([
    ...radioTranscripts,
    ...searchedTranscripts,
  ]);

  const supplementalEvidence: EvidenceResult[] = [
    ...request.context.incidentPackage.evidence,
    ...policies.map((policy) => ({
      title: policy.title,
      sourceType: "policy" as const,
      excerpt: policy.excerpt,
      rationale: policy.body,
      sourceId: policy.id,
    })),
    ...mergedTranscripts.map((transcript) => ({
      title: transcript.label,
      sourceType: "radio_log" as const,
      excerpt: transcript.excerpt,
      rationale: transcript.lines.slice(0, 2).join(" "),
      sourceId: transcript.id,
    })),
    ...evidenceDocs.map((document) => ({
      title: document.excerpt.slice(0, 80),
      sourceType: "radio_log" as const,
      excerpt: document.excerpt,
      rationale: document.body,
      sourceId: document.id,
    })),
  ];

  const citations: SentinelCitation[] = [
    ...policies.map((policy) => ({
      sourceId: policy.id,
      title: policy.title,
      excerpt: policy.excerpt,
      index: config.policiesIndex,
    })),
    ...mergedTranscripts.map((transcript) => ({
      sourceId: transcript.id,
      title: transcript.label,
      excerpt: transcript.excerpt,
      index: config.radioTranscriptsIndex,
    })),
    ...evidenceDocs.map((document) => ({
      sourceId: document.id,
      title: document.excerpt.slice(0, 80),
      excerpt: document.excerpt,
      index: config.evidenceIndex,
    })),
  ];

  return {
    retrieval: baseBundle,
    supplementalEvidence: dedupeEvidence(supplementalEvidence),
    citations: dedupeCitations(citations),
  };
}

function dedupeEvidence(evidence: EvidenceResult[]): EvidenceResult[] {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    if (seen.has(item.sourceId)) return false;
    seen.add(item.sourceId);
    return true;
  });
}

function dedupeCitations(citations: SentinelCitation[]): SentinelCitation[] {
  const seen = new Set<string>();
  return citations.filter((item) => {
    if (seen.has(item.sourceId)) return false;
    seen.add(item.sourceId);
    return true;
  });
}

function dedupeRadioTranscripts(
  transcripts: ElasticRadioTranscript[],
): ElasticRadioTranscript[] {
  const seen = new Set<string>();
  return transcripts.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

function mapRecommendedAction(
  incidentPackage: IncidentPackage,
  label: string,
  actionIndex?: number,
  rationale?: string,
) {
  const normalizedLabel = label.trim();
  const matchedIndex = incidentPackage.incident.recommendedActions.findIndex(
    (action) => action.toLowerCase() === normalizedLabel.toLowerCase(),
  );
  const resolvedIndex = actionIndex ?? (matchedIndex >= 0 ? matchedIndex : undefined);

  return {
    label: normalizedLabel,
    actionIndex: resolvedIndex,
    rationale: rationale ?? `Recommended for ${incidentPackage.incident.title}.`,
  };
}

function buildFallbackResponse(
  request: SentinelAskRequest,
  retrievalMode: "elastic" | "local",
): SentinelAskResponse {
  const commandState: CommandState = {
    incidentPackages: [request.context.incidentPackage],
    selectedIncidentPackage: request.context.incidentPackage,
    timeline: request.context.timeline,
    changeSummary: null,
    batchGeneratedAt: null,
    pullStatus: request.context.pullStatus,
    reportSummary: {
      headline: "Report preview ready",
      unresolvedItems: [],
      recommendations: [],
      markdown: "",
    },
    demoReportDraft: {
      headline: "Report draft ready",
      markdown: "# Operations Report Draft",
    },
    demoMemorySummary: {
      headline: "Recent demo memory",
      lines: [],
    },
    latestTranscript: null,
    transcriptAddedTitles: [],
    transcriptMatchedTitles: [],
    selectedResponseStages: [],
    sourceMode: request.context.sourceMode as CommandState["sourceMode"],
    lastIngestionSummary: null,
    sourceAuditExcerpts: [],
  };

  const fallback = answerSentinelQuestion(request.question, commandState);
  const nextAction =
    request.context.incidentPackage.incident.recommendedActions[0] ?? null;

  return {
    answer: fallback.answer,
    evidence: request.context.incidentPackage.evidence,
    recommendedAction: nextAction
      ? mapRecommendedAction(request.context.incidentPackage, nextAction, 0)
      : null,
    citations: request.context.incidentPackage.evidence.map((item) => ({
      sourceId: item.sourceId,
      title: item.title,
      excerpt: item.excerpt,
      index: "local",
    })),
    meta: {
      retrievalMode,
      geminiMode: "fallback",
      elasticMcpMode: "unused",
    },
  };
}

export async function runSentinelAgent(
  request: SentinelAskRequest,
): Promise<SentinelAskResponse> {
  const question = request.question.trim();
  const incidentId = request.incidentId.trim();

  if (!question || !incidentId) {
    throw new Error("question and incidentId are required.");
  }

  let retrievalMode: "elastic" | "local" = "local";
  let retrieval: AgentRetrievalBundle = getLocalAgentContext({
    report: question,
    incidents: [
      {
        id: request.context.incidentPackage.incident.id,
        title: request.context.incidentPackage.incident.title,
        category: request.context.incidentPackage.incident.category,
        locationId: request.context.incidentPackage.incident.locationId,
        locationLabel: request.context.incidentPackage.incident.locationLabel,
        priority: request.context.incidentPackage.incident.priority,
      },
    ],
  });
  let supplementalEvidence = request.context.incidentPackage.evidence;
  let citations: SentinelCitation[] = request.context.incidentPackage.evidence.map(
    (item) => ({
      sourceId: item.sourceId,
      title: item.title,
      excerpt: item.excerpt,
      index: "local",
    }),
  );

  if (isElasticConfigured()) {
    try {
      const elasticContext = await retrieveSentinelElasticContext(request);
      retrieval = elasticContext.retrieval;
      supplementalEvidence = elasticContext.supplementalEvidence;
      citations = elasticContext.citations;
      retrievalMode = "elastic";
    } catch {
      retrievalMode = "local";
    }
  }

  if (!isAgentBackendEnabled() || !isVertexConfigured()) {
    return buildFallbackResponse(request, retrievalMode);
  }

  try {
    const raw = await generateVertexStructuredResponse({
      responseSchema: buildSentinelResponseSchema(),
      systemPrompt: buildSentinelSystemPrompt(),
      userPrompt: buildSentinelUserPrompt({ request, retrieval }),
    });
    const validated = validateSentinelAgentResponse(JSON.parse(raw));
    const recommendedAction = validated.recommendedAction
      ? mapRecommendedAction(
          request.context.incidentPackage,
          validated.recommendedAction.label,
          validated.recommendedAction.actionIndex,
          validated.recommendedAction.rationale,
        )
      : null;

    return {
      answer: validated.answer,
      evidence: supplementalEvidence.slice(0, 5),
      recommendedAction,
      citations:
        validated.citations.length > 0 ? validated.citations : citations.slice(0, 5),
      meta: {
        retrievalMode,
        geminiMode: "live",
        elasticMcpMode: "unused",
      },
    };
  } catch {
    return buildFallbackResponse(request, retrievalMode);
  }
}
