import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  generateVertexStructuredResponse,
  resetVertexAccessTokenCacheForTests,
} from "@/lib/agent/vertex";

describe("generateVertexStructuredResponse", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      APPDATA: path.join(os.tmpdir(), "vertex-no-adc"),
      GOOGLE_CLOUD_PROJECT: "stadium-project",
      GOOGLE_CLOUD_LOCATION: "us-central1",
      VERTEX_MODEL: "gemini-2.5-flash",
    };
    resetVertexAccessTokenCacheForTests();
  });

  afterEach(() => {
    process.env = originalEnv;
    resetVertexAccessTokenCacheForTests();
    vi.restoreAllMocks();
  });

  it("requests a metadata access token and sends a strict-json Vertex request", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes("metadata.google.internal")) {
        return new Response(
          JSON.stringify({
            access_token: "metadata-token",
            expires_in: 3600,
          }),
        );
      }

      if (url.includes(":generateContent")) {
        const body = JSON.parse(String(init?.body)) as {
          generationConfig?: { responseMimeType?: string };
          systemInstruction?: { parts?: Array<{ text?: string }> };
        };

        expect(body.generationConfig?.responseMimeType).toBe("application/json");
        expect(body.systemInstruction?.parts?.[0]?.text).toContain(
          "strict JSON only",
        );

        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        incidents: [],
                        latestUpdate: "Guest Services notified via radio.",
                        reportSummary: "Incidents triaged and dispatched.",
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        );
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const raw = await generateVertexStructuredResponse({
      systemPrompt: "Return strict JSON only.",
      userPrompt: "{\"task\":\"enrich\"}",
      responseSchema: {
        type: "OBJECT",
        properties: {
          incidents: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {},
            },
          },
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(raw).toContain("latestUpdate");
  });

  it("uses authorized-user ADC credentials when a local credential file is available", async () => {
    const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "vertex-adc-"));
    const appDataRoot = path.join(tempRoot, "appdata");
    const gcloudDir = path.join(appDataRoot, "gcloud");
    await fs.mkdir(gcloudDir, { recursive: true });
    await fs.writeFile(
      path.join(gcloudDir, "application_default_credentials.json"),
      JSON.stringify({
        type: "authorized_user",
        client_id: "adc-client-id",
        client_secret: "adc-client-secret",
        refresh_token: "adc-refresh-token",
      }),
      "utf8",
    );

    process.env.APPDATA = appDataRoot;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;

    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url === "https://oauth2.googleapis.com/token") {
        const body = String(init?.body);

        expect(body).toContain("grant_type=refresh_token");
        expect(body).toContain("client_id=adc-client-id");
        expect(body).toContain("client_secret=adc-client-secret");
        expect(body).toContain("refresh_token=adc-refresh-token");

        return new Response(
          JSON.stringify({
            access_token: "authorized-user-token",
            expires_in: 3600,
          }),
        );
      }

      if (url.includes(":generateContent")) {
        expect(init?.headers).toMatchObject({
          Authorization: "Bearer authorized-user-token",
        });

        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        incidents: [],
                        latestUpdate: "Ops confirmed dispatch.",
                        reportSummary: "Incident enrichment complete.",
                      }),
                    },
                  ],
                },
              },
            ],
          }),
        );
      }

      throw new Error(`Unexpected URL: ${url}`);
    });

    vi.stubGlobal("fetch", fetchMock);

    const raw = await generateVertexStructuredResponse({
      systemPrompt: "Return strict JSON only.",
      userPrompt: "{\"task\":\"enrich\"}",
      responseSchema: {
        type: "OBJECT",
        properties: {
          incidents: {
            type: "ARRAY",
            items: {
              type: "OBJECT",
              properties: {},
            },
          },
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(raw).toContain("Incident enrichment complete.");
  });
});
