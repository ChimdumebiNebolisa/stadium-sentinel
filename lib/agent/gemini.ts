import { buildAgentResponseSchema, buildAgentSystemPrompt, buildAgentUserPrompt } from "@/lib/agent/prompt";
import { applyAgentResponseToIncidentPackages } from "@/lib/agent/transform";
import { validateAgentResponse } from "@/lib/agent/validate";
import { generateVertexStructuredResponse, isVertexConfigured } from "@/lib/agent/vertex";
import type {
  AgentRetrievalResult,
  IncidentPackage,
} from "@/lib/types";

function shouldUseFallback(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true" ||
    !isVertexConfigured()
  );
}

export async function maybeGenerateAgentRefinement(input: {
  incidentPackages: IncidentPackage[];
  report: string;
  retrieval: AgentRetrievalResult;
}): Promise<{ incidentPackages: IncidentPackage[]; mode: "live" | "fallback" }> {
  if (shouldUseFallback()) {
    return {
      incidentPackages: input.incidentPackages,
      mode: "fallback",
    };
  }

  try {
    const raw = await generateVertexStructuredResponse({
      responseSchema: buildAgentResponseSchema(),
      systemPrompt: buildAgentSystemPrompt(),
      userPrompt: buildAgentUserPrompt({
        report: input.report,
        incidentPackages: input.incidentPackages,
        retrieval: input.retrieval,
      }),
    });
    const validated = validateAgentResponse(raw, input.incidentPackages);

    return {
      incidentPackages: applyAgentResponseToIncidentPackages(
        input.incidentPackages,
        validated,
      ),
      mode: "live",
    };
  } catch {
    return {
      incidentPackages: input.incidentPackages,
      mode: "fallback",
    };
  }
}
