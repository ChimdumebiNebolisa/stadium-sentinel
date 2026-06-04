import { buildGeminiActionPrompt } from "@/lib/action-plan";
import type { IncidentPackage, ReportSummary } from "@/lib/types";

type GeminiActionResult = {
  recommendedActions: string[];
  staffUpdate: string;
};

type GeminiReportResult = {
  headline: string;
  recommendations: string[];
};

function shouldUseFallback(): boolean {
  return (
    process.env.NODE_ENV === "test" ||
    process.env.VITEST === "true" ||
    !process.env.GEMINI_API_KEY?.trim()
  );
}

async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("Gemini API key is not configured.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
        },
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{
          text?: string;
        }>;
      };
    }>;
  };

  return payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";
}

export async function maybeRefineIncidentPackage(
  incidentPackage: IncidentPackage,
): Promise<{ incidentPackage: IncidentPackage; mode: "live" | "fallback" }> {
  if (shouldUseFallback()) {
    return {
      incidentPackage,
      mode: "fallback",
    };
  }

  try {
    const raw = await callGemini(
      buildGeminiActionPrompt({
        incidentTitle: incidentPackage.incident.title,
        locationLabel: incidentPackage.incident.locationLabel,
        priority: incidentPackage.incident.priority,
        assignedRole: incidentPackage.incident.assignedRole,
        recommendedActions: incidentPackage.incident.recommendedActions,
        evidence: incidentPackage.evidence,
      }),
    );

    const parsed = JSON.parse(raw) as Partial<GeminiActionResult>;
    const recommendedActions =
      parsed.recommendedActions?.filter(Boolean) ??
      incidentPackage.incident.recommendedActions;
    const staffUpdate = parsed.staffUpdate?.trim() || incidentPackage.staffUpdate;

    return {
      incidentPackage: {
        ...incidentPackage,
        incident: {
          ...incidentPackage.incident,
          recommendedActions,
        },
        staffUpdate,
      },
      mode: "live",
    };
  } catch {
    return {
      incidentPackage,
      mode: "fallback",
    };
  }
}

export async function maybeRefineReportSummary(
  reportSummary: ReportSummary,
  incidentPackages: IncidentPackage[],
): Promise<{ reportSummary: ReportSummary; mode: "live" | "fallback" }> {
  if (shouldUseFallback()) {
    return {
      reportSummary,
      mode: "fallback",
    };
  }

  const incidentLines = incidentPackages.map(
    ({ incident }) =>
      `- ${incident.priority}: ${incident.title} at ${incident.locationLabel}. Actions: ${incident.recommendedActions.join(" | ")}`,
  );

  const prompt = [
    "You are refining post-event operations wording for Stadium Sentinel.",
    "Return strict JSON with keys headline and recommendations.",
    "Do not mention scores, severity scores, confidence percentages, or numeric urgency.",
    "Keep categorical priorities only if referenced.",
    "Current report headline:",
    reportSummary.headline,
    "Incident recap:",
    ...incidentLines,
    "Current recommendations:",
    ...reportSummary.recommendations.map((item) => `- ${item}`),
  ].join("\n");

  try {
    const raw = await callGemini(prompt);
    const parsed = JSON.parse(raw) as Partial<GeminiReportResult>;

    return {
      reportSummary: {
        ...reportSummary,
        headline: parsed.headline?.trim() || reportSummary.headline,
        recommendations:
          parsed.recommendations?.filter(Boolean) ?? reportSummary.recommendations,
      },
      mode: "live",
    };
  } catch {
    return {
      reportSummary,
      mode: "fallback",
    };
  }
}
