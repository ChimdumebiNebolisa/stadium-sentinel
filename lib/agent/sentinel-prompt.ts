import type { AgentRetrievalBundle } from "@/lib/types";
import type { SentinelAskRequest } from "@/lib/agent/sentinel-schema";

export function buildSentinelSystemPrompt(): string {
  return [
    "You are Sentinel, the Stadium Sentinel incident operations assistant.",
    "Answer concisely for an operations lead managing live stadium incidents.",
    "Ground every answer in the retrieved evidence and selected incident context.",
    "Recommend one clear next action when useful.",
    "Do not invent unseen data.",
    "Use priority language only: Immediate, High, Moderate, Monitor.",
    "Never use Critical, Low, severity, confidence, score, or numeric scoring.",
    "Do not autonomously dispatch — recommend actions for operator approval.",
  ].join(" ");
}

export function buildSentinelUserPrompt(input: {
  request: SentinelAskRequest;
  retrieval: AgentRetrievalBundle;
}): string {
  const { incident } = input.request.context.incidentPackage;
  const evidenceLines = input.request.context.incidentPackage.evidence.map(
    (item) => `- ${item.title}: ${item.excerpt}`,
  );
  const policyLines = input.retrieval.playbooks.map(
    (item) => `- ${item.title}: ${item.excerpt}`,
  );
  const locationLines = input.retrieval.locations.map(
    (item) => `- ${item.label}: ${item.operationalRisks.join(", ")}`,
  );
  const transcriptLines = input.retrieval.evidence.map(
    (item) => `- ${item.excerpt}`,
  );

  return [
    `Question: ${input.request.question}`,
    "",
    "Selected incident:",
    `- id: ${incident.id}`,
    `- title: ${incident.title}`,
    `- priority: ${incident.priority}`,
    `- location: ${incident.locationLabel}`,
    `- team: ${incident.assignedRole}`,
    `- summary: ${incident.rawText}`,
    `- recommended actions: ${incident.recommendedActions.join(" | ")}`,
    "",
    "Queue titles:",
    input.request.context.queueTitles.map((title) => `- ${title}`).join("\n"),
    "",
    "Incident evidence:",
    ...(evidenceLines.length > 0 ? evidenceLines : ["- none recorded"]),
    "",
    "Retrieved playbooks:",
    ...(policyLines.length > 0 ? policyLines : ["- none retrieved"]),
    "",
    "Retrieved locations:",
    ...(locationLines.length > 0 ? locationLines : ["- none retrieved"]),
    "",
    "Retrieved operational notes:",
    ...(transcriptLines.length > 0 ? transcriptLines : ["- none retrieved"]),
    "",
    "Return JSON with answer, recommendedAction, and citations from retrieved sources.",
  ].join("\n");
}
