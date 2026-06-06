import "server-only";

import { createSign } from "node:crypto";
import { homedir } from "node:os";
import path from "node:path";

type ServiceAccountCredentials = {
  client_email: string;
  private_key: string;
  token_uri?: string;
  type?: "service_account";
};

type AuthorizedUserCredentials = {
  client_id: string;
  client_secret: string;
  quota_project_id?: string;
  refresh_token: string;
  token_uri?: string;
  type?: "authorized_user";
};

type GoogleCredentials = ServiceAccountCredentials | AuthorizedUserCredentials;

type VertexSchema = {
  enum?: string[];
  items?: VertexSchema;
  properties?: Record<string, VertexSchema>;
  required?: string[];
  type: "ARRAY" | "BOOLEAN" | "NUMBER" | "OBJECT" | "STRING";
};

type VertexConfig = {
  location: string;
  model: string;
  project: string;
};

type CachedAccessToken = {
  accessToken: string;
  expiresAt: number;
};

let cachedAccessToken: CachedAccessToken | null = null;

function getEnvValue(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function signJwt(unsignedToken: string, privateKey: string): string {
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();

  return signer
    .sign(privateKey, "base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function getVertexConfig(): VertexConfig | null {
  const project = getEnvValue("GOOGLE_CLOUD_PROJECT");
  const location = getEnvValue("GOOGLE_CLOUD_LOCATION");
  const model = getEnvValue("VERTEX_MODEL") || getEnvValue("GEMINI_MODEL");

  if (!project || !location || !model) {
    return null;
  }

  return {
    location,
    model,
    project,
  };
}

async function fileExists(filePath: string): Promise<boolean> {
  const { access } = await import("node:fs/promises");

  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getCredentialsPath(): Promise<string | null> {
  const configuredPath = getEnvValue("GOOGLE_APPLICATION_CREDENTIALS");

  if (configuredPath) {
    return configuredPath;
  }

  const appData = getEnvValue("APPDATA");
  const localCandidates = [
    appData
      ? path.join(appData, "gcloud", "application_default_credentials.json")
      : "",
    path.join(homedir(), ".config", "gcloud", "application_default_credentials.json"),
  ].filter(Boolean);

  for (const candidate of localCandidates) {
    if (await fileExists(candidate)) {
      return candidate;
    }
  }

  return null;
}

async function readGoogleCredentials(): Promise<GoogleCredentials | null> {
  const credentialsPath = await getCredentialsPath();

  if (!credentialsPath) {
    return null;
  }

  const { readFile } = await import("node:fs/promises");
  const raw = await readFile(/* turbopackIgnore: true */ credentialsPath, "utf8");

  return JSON.parse(raw) as GoogleCredentials;
}

function isServiceAccountCredentials(
  credentials: GoogleCredentials,
): credentials is ServiceAccountCredentials {
  return (
    typeof (credentials as ServiceAccountCredentials).client_email === "string" &&
    typeof (credentials as ServiceAccountCredentials).private_key === "string"
  );
}

function isAuthorizedUserCredentials(
  credentials: GoogleCredentials,
): credentials is AuthorizedUserCredentials {
  return (
    typeof (credentials as AuthorizedUserCredentials).client_id === "string" &&
    typeof (credentials as AuthorizedUserCredentials).client_secret === "string" &&
    typeof (credentials as AuthorizedUserCredentials).refresh_token === "string"
  );
}

async function getAccessTokenFromServiceAccount(): Promise<CachedAccessToken | null> {
  const credentials = await readGoogleCredentials();

  if (!credentials || !isServiceAccountCredentials(credentials)) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: credentials.client_email,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      aud: credentials.token_uri || "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }),
  );
  const assertion = `${header}.${payload}.${signJwt(
    `${header}.${payload}`,
    credentials.private_key,
  )}`;

  const response = await fetch(
    credentials.token_uri || "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        assertion,
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Service account token request failed with ${response.status}.`);
  }

  const payloadJson = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payloadJson.access_token) {
    throw new Error("Service account token response was missing access_token.");
  }

  return {
    accessToken: payloadJson.access_token,
    expiresAt: Date.now() + ((payloadJson.expires_in ?? 3600) - 60) * 1000,
  };
}

async function getAccessTokenFromAuthorizedUser(): Promise<CachedAccessToken | null> {
  const credentials = await readGoogleCredentials();

  if (!credentials || !isAuthorizedUserCredentials(credentials)) {
    return null;
  }

  const response = await fetch(
    credentials.token_uri || "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: credentials.client_id,
        client_secret: credentials.client_secret,
        grant_type: "refresh_token",
        refresh_token: credentials.refresh_token,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw new Error(`Authorized user token request failed with ${response.status}.`);
  }

  const payloadJson = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payloadJson.access_token) {
    throw new Error("Authorized user token response was missing access_token.");
  }

  return {
    accessToken: payloadJson.access_token,
    expiresAt: Date.now() + ((payloadJson.expires_in ?? 3600) - 60) * 1000,
  };
}

async function getAccessTokenFromMetadata(): Promise<CachedAccessToken> {
  const response = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    {
      headers: {
        "Metadata-Flavor": "Google",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    },
  );

  if (!response.ok) {
    throw new Error(`Metadata token request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    throw new Error("Metadata token response was missing access_token.");
  }

  return {
    accessToken: payload.access_token,
    expiresAt: Date.now() + ((payload.expires_in ?? 3600) - 60) * 1000,
  };
}

async function getGoogleAccessToken(): Promise<string> {
  if (cachedAccessToken && cachedAccessToken.expiresAt > Date.now()) {
    return cachedAccessToken.accessToken;
  }

  const serviceAccountToken = await getAccessTokenFromServiceAccount();

  if (serviceAccountToken) {
    cachedAccessToken = serviceAccountToken;
    return serviceAccountToken.accessToken;
  }

  const authorizedUserToken = await getAccessTokenFromAuthorizedUser();

  if (authorizedUserToken) {
    cachedAccessToken = authorizedUserToken;
    return authorizedUserToken.accessToken;
  }

  cachedAccessToken = await getAccessTokenFromMetadata();
  return cachedAccessToken.accessToken;
}

export function resetVertexAccessTokenCacheForTests(): void {
  cachedAccessToken = null;
}

export function isVertexConfigured(): boolean {
  return getVertexConfig() !== null;
}

export async function generateVertexStructuredResponse(input: {
  responseSchema: VertexSchema;
  systemPrompt: string;
  userPrompt: string;
}): Promise<string> {
  const config = getVertexConfig();

  if (!config) {
    throw new Error("Vertex configuration is incomplete.");
  }

  const accessToken = await getGoogleAccessToken();
  const endpoint = `https://${config.location}-aiplatform.googleapis.com/v1/projects/${config.project}/locations/${config.location}/publishers/google/models/${config.model}:generateContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: input.systemPrompt }],
      },
      contents: [
        {
          role: "user",
          parts: [{ text: input.userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: input.responseSchema,
      },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Vertex generateContent failed with ${response.status}.`);
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
  const text = payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

  if (!text) {
    throw new Error("Vertex response did not contain structured text.");
  }

  return text;
}
