import type { EvidenceResult } from "@/lib/types";

export type SentinelCitation = {
  sourceId: string;
  title: string;
  excerpt: string;
  index: string;
};

export type SentinelRecommendedAction = {
  label: string;
  actionIndex?: number;
  rationale: string;
};

export type SentinelAskRequest = {
  question: string;
  incidentId: string;
  context: {
    incidentPackage: import("@/lib/types").IncidentPackage;
    timeline: import("@/lib/types").TimelineEntry[];
    queueTitles: string[];
    sourceMode: string | null;
    pullStatus: string | null;
  };
};

export type SentinelAskResponse = {
  answer: string;
  evidence: EvidenceResult[];
  recommendedAction: SentinelRecommendedAction | null;
  citations: SentinelCitation[];
  meta: {
    retrievalMode: "elastic" | "local";
    geminiMode: "live" | "fallback";
    elasticMcpMode: "unused" | "external";
  };
};

export type SentinelAgentJsonResponse = {
  answer: string;
  recommendedAction: {
    label: string;
    actionIndex?: number;
    rationale: string;
  } | null;
  citations: Array<{
    sourceId: string;
    title: string;
    excerpt: string;
    index: string;
  }>;
};

export function buildSentinelResponseSchema() {
  return {
    type: "OBJECT" as const,
    properties: {
      answer: { type: "STRING" as const },
      recommendedAction: {
        type: "OBJECT" as const,
        properties: {
          label: { type: "STRING" as const },
          actionIndex: { type: "NUMBER" as const },
          rationale: { type: "STRING" as const },
        },
        required: ["label", "rationale"],
      },
      citations: {
        type: "ARRAY" as const,
        items: {
          type: "OBJECT" as const,
          properties: {
            sourceId: { type: "STRING" as const },
            title: { type: "STRING" as const },
            excerpt: { type: "STRING" as const },
            index: { type: "STRING" as const },
          },
          required: ["sourceId", "title", "excerpt", "index"],
        },
      },
    },
    required: ["answer", "recommendedAction", "citations"],
  };
}

const FORBIDDEN_WORDS = [
  "critical",
  "severity",
  "confidence",
  " score",
  "scoring",
  " low priority",
];

export function containsForbiddenSentinelWording(text: string): boolean {
  const normalized = text.toLowerCase();
  return FORBIDDEN_WORDS.some((word) => normalized.includes(word));
}

export function validateSentinelAgentResponse(
  raw: unknown,
): SentinelAgentJsonResponse {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Sentinel response must be an object.");
  }

  const payload = raw as Record<string, unknown>;
  const answer = typeof payload.answer === "string" ? payload.answer.trim() : "";
  if (!answer) {
    throw new Error("Sentinel answer must be a non-empty string.");
  }

  if (containsForbiddenSentinelWording(answer)) {
    throw new Error("Sentinel answer contains forbidden wording.");
  }

  let recommendedAction: SentinelAgentJsonResponse["recommendedAction"] = null;
  if (payload.recommendedAction && typeof payload.recommendedAction === "object") {
    const action = payload.recommendedAction as Record<string, unknown>;
    const label = typeof action.label === "string" ? action.label.trim() : "";
    const rationale =
      typeof action.rationale === "string" ? action.rationale.trim() : "";
    if (label && rationale && !containsForbiddenSentinelWording(`${label} ${rationale}`)) {
      recommendedAction = {
        label,
        rationale,
        actionIndex:
          typeof action.actionIndex === "number" ? action.actionIndex : undefined,
      };
    }
  }

  const citationsRaw = Array.isArray(payload.citations) ? payload.citations : [];
  const citations = citationsRaw
    .map((item) => {
      if (typeof item !== "object" || item === null) return null;
      const citation = item as Record<string, unknown>;
      const sourceId =
        typeof citation.sourceId === "string" ? citation.sourceId.trim() : "";
      const title = typeof citation.title === "string" ? citation.title.trim() : "";
      const excerpt =
        typeof citation.excerpt === "string" ? citation.excerpt.trim() : "";
      const index = typeof citation.index === "string" ? citation.index.trim() : "";
      if (!sourceId || !title || !excerpt || !index) return null;
      return { sourceId, title, excerpt, index };
    })
    .filter((item): item is SentinelCitation => Boolean(item));

  return {
    answer,
    recommendedAction,
    citations,
  };
}

export function validateSentinelAskResponse(raw: unknown): SentinelAskResponse {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Sentinel response must be an object.");
  }

  const payload = raw as Record<string, unknown>;
  const answer = typeof payload.answer === "string" ? payload.answer.trim() : "";
  if (!answer) {
    throw new Error("Sentinel answer must be a non-empty string.");
  }

  const evidence = Array.isArray(payload.evidence) ? payload.evidence : [];
  const citations = Array.isArray(payload.citations) ? payload.citations : [];
  const meta =
    typeof payload.meta === "object" && payload.meta !== null
      ? (payload.meta as SentinelAskResponse["meta"])
      : {
          retrievalMode: "local" as const,
          geminiMode: "fallback" as const,
          elasticMcpMode: "unused" as const,
        };

  return {
    answer,
    evidence: evidence as EvidenceResult[],
    recommendedAction:
      payload.recommendedAction === null || payload.recommendedAction === undefined
        ? null
        : (payload.recommendedAction as SentinelRecommendedAction),
    citations: citations as SentinelCitation[],
    meta,
  };
}
