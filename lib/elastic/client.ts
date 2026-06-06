type ElasticConfig = {
  apiKey: string;
  evidenceIndex: string;
  locationsIndex: string;
  playbooksIndex: string;
  url: string;
  incidentExamplesIndex: string;
};

function getEnvValue(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getElasticConfig(): ElasticConfig | null {
  const url = getEnvValue("ELASTICSEARCH_URL");
  const apiKey =
    getEnvValue("ELASTICSEARCH_API_KEY") || getEnvValue("ELASTIC_API_KEY");
  const playbooksIndex =
    getEnvValue("ELASTICSEARCH_PLAYBOOKS_INDEX") || "stadium_playbooks";
  const locationsIndex =
    getEnvValue("ELASTICSEARCH_LOCATIONS_INDEX") || "stadium_locations";
  const incidentExamplesIndex =
    getEnvValue("ELASTICSEARCH_INCIDENT_EXAMPLES_INDEX") ||
    "stadium_incident_examples";
  const evidenceIndex =
    getEnvValue("ELASTICSEARCH_EVIDENCE_INDEX") || "stadium_evidence";

  if (!url || !apiKey) {
    return null;
  }

  return {
    apiKey,
    evidenceIndex,
    incidentExamplesIndex,
    locationsIndex,
    playbooksIndex,
    url: url.replace(/\/+$/, ""),
  };
}

export function isElasticConfigured(): boolean {
  return getElasticConfig() !== null;
}

export async function elasticFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const config = getElasticConfig();

  if (!config) {
    throw new Error("Elastic configuration is incomplete.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `ApiKey ${config.apiKey}`);
  headers.set("Content-Type", "application/json");

  return fetch(`${config.url}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
