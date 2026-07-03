export type DemoStatusPayload = {
  realDemoFlow: boolean;
  elasticConfigured: boolean;
  agentConfigured: boolean;
  voiceEnabled: boolean;
  mode: "elastic-backed" | "local-fallback";
  sentinelMode: "vertex-backed" | "deterministic-fallback";
};

type EnvMap = Record<string, string | undefined>;

function envValue(env: EnvMap, name: string): string {
  return env[name]?.trim() ?? "";
}

function hasVertexConfig(env: EnvMap): boolean {
  return Boolean(
    envValue(env, "GOOGLE_CLOUD_PROJECT") &&
      envValue(env, "GOOGLE_CLOUD_LOCATION") &&
      (envValue(env, "VERTEX_MODEL") || envValue(env, "GEMINI_MODEL")),
  );
}

export function resolveDemoStatus(env: EnvMap = process.env): DemoStatusPayload {
  const elasticConfigured = Boolean(
    envValue(env, "ELASTICSEARCH_URL") &&
      (envValue(env, "ELASTICSEARCH_API_KEY") || envValue(env, "ELASTIC_API_KEY")),
  );
  const agentConfigured =
    envValue(env, "AGENT_BACKEND_ENABLED") === "true" && hasVertexConfig(env);

  return {
    realDemoFlow: envValue(env, "NEXT_PUBLIC_REAL_DEMO_FLOW") === "true",
    elasticConfigured,
    agentConfigured,
    voiceEnabled: envValue(env, "NEXT_PUBLIC_ENABLE_SENTINEL_VOICE") === "true",
    mode: elasticConfigured ? "elastic-backed" : "local-fallback",
    sentinelMode: agentConfigured ? "vertex-backed" : "deterministic-fallback",
  };
}
