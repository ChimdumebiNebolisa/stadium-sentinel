import { describe, expect, it } from "vitest";

import { GET } from "@/app/api/demo/status/route";
import { resolveDemoStatus } from "@/lib/demo-status";

const ENV_KEYS = [
  "NEXT_PUBLIC_REAL_DEMO_FLOW",
  "NEXT_PUBLIC_ENABLE_SENTINEL_VOICE",
  "ELASTICSEARCH_URL",
  "ELASTICSEARCH_API_KEY",
  "ELASTIC_API_KEY",
  "AGENT_BACKEND_ENABLED",
  "GOOGLE_CLOUD_PROJECT",
  "GOOGLE_CLOUD_LOCATION",
  "VERTEX_MODEL",
  "GEMINI_MODEL",
] as const;

function withEnv(
  values: Partial<Record<(typeof ENV_KEYS)[number], string>>,
  callback: () => Promise<void>,
) {
  return async () => {
    const previous = Object.fromEntries(
      ENV_KEYS.map((key) => [key, process.env[key]]),
    ) as Partial<Record<(typeof ENV_KEYS)[number], string>>;

    for (const key of ENV_KEYS) {
      delete process.env[key];
    }

    for (const [key, value] of Object.entries(values)) {
      process.env[key] = value;
    }

    try {
      await callback();
    } finally {
      for (const key of ENV_KEYS) {
        delete process.env[key];
      }

      for (const [key, value] of Object.entries(previous)) {
        if (value !== undefined) {
          process.env[key] = value;
        }
      }
    }
  };
}

describe("demo status", () => {
  it("reports local fallback when Elastic and Vertex are not configured", () => {
    expect(resolveDemoStatus({})).toEqual({
      realDemoFlow: false,
      elasticConfigured: false,
      agentConfigured: false,
      voiceEnabled: false,
      mode: "local-fallback",
      sentinelMode: "deterministic-fallback",
    });
  });

  it("accepts the existing Elastic and Vertex env conventions", () => {
    expect(
      resolveDemoStatus({
        NEXT_PUBLIC_REAL_DEMO_FLOW: "true",
        NEXT_PUBLIC_ENABLE_SENTINEL_VOICE: "true",
        ELASTICSEARCH_URL: "https://elastic.example",
        ELASTIC_API_KEY: "legacy-elastic-key",
        AGENT_BACKEND_ENABLED: "true",
        GOOGLE_CLOUD_PROJECT: "stadium-project",
        GOOGLE_CLOUD_LOCATION: "us-central1",
        VERTEX_MODEL: "gemini-2.5-flash",
      }),
    ).toEqual({
      realDemoFlow: true,
      elasticConfigured: true,
      agentConfigured: true,
      voiceEnabled: true,
      mode: "elastic-backed",
      sentinelMode: "vertex-backed",
    });
  });

  it(
    "returns status JSON without exposing configured secret values",
    withEnv(
      {
        NEXT_PUBLIC_REAL_DEMO_FLOW: "true",
        NEXT_PUBLIC_ENABLE_SENTINEL_VOICE: "true",
        ELASTICSEARCH_URL: "https://elastic.example",
        ELASTICSEARCH_API_KEY: "secret-elastic-key",
        AGENT_BACKEND_ENABLED: "true",
        GOOGLE_CLOUD_PROJECT: "stadium-project",
        GOOGLE_CLOUD_LOCATION: "us-central1",
        VERTEX_MODEL: "gemini-2.5-flash",
      },
      async () => {
        const response = await GET();
        const payload = await response.json();
        const serialized = JSON.stringify(payload);

        expect(response.status).toBe(200);
        expect(payload).toMatchObject({
          realDemoFlow: true,
          elasticConfigured: true,
          agentConfigured: true,
          voiceEnabled: true,
          mode: "elastic-backed",
          sentinelMode: "vertex-backed",
        });
        expect(serialized).not.toContain("secret-elastic-key");
        expect(serialized).not.toContain("https://elastic.example");
        expect(serialized).not.toContain("stadium-project");
        expect(serialized).not.toContain("gemini-2.5-flash");
      },
    ),
  );
});
