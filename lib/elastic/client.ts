type ElasticConfig = {
  apiKey: string;
  cloudId: string;
  indexName: string;
  url: string;
};

function getEnvValue(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export function getElasticConfig(): ElasticConfig | null {
  const url = getEnvValue("ELASTICSEARCH_URL");
  const apiKey = getEnvValue("ELASTIC_API_KEY");
  const cloudId = getEnvValue("ELASTIC_CLOUD_ID");
  const indexName =
    getEnvValue("ELASTIC_INDEX_NAME") || "stadium-sentinel-knowledge";

  if (!url || !apiKey || !indexName) {
    return null;
  }

  return {
    apiKey,
    cloudId,
    indexName,
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
