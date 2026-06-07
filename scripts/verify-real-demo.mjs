#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const baseUrl = process.env.STADIUM_SENTINEL_BASE_URL?.trim() || "http://localhost:3000";

const requiredDocs = [
  "docs/real-demo-script.md",
  "docs/devpost-talking-points.md",
  "docs/INGESTION_DEPLOY_CHECKLIST.md",
];

const requiredRoutes = [
  "app/api/ingest/status/route.ts",
  "app/api/ingest/bootstrap/route.ts",
  "app/api/ingest/pull/route.ts",
  "app/api/sentinel/route.ts",
  "app/api/timeline/write/route.ts",
];

function log(message) {
  console.log(message);
}

async function fileExists(relativePath) {
  try {
    await fs.access(path.join(repoRoot, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function verifyRepoArtifacts() {
  const missing = [];

  for (const relativePath of [...requiredDocs, ...requiredRoutes]) {
    if (!(await fileExists(relativePath))) {
      missing.push(relativePath);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required real-demo artifacts: ${missing.join(", ")}`);
  }

  log("OK repo artifacts present for Cloud Run real-demo path.");
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();

  try {
    return {
      response,
      body: text ? JSON.parse(text) : null,
    };
  } catch {
    return { response, body: text };
  }
}

async function canReachServer() {
  try {
    const response = await fetch(`${baseUrl}/api/ingest/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function verifyFallbackApiChecks() {
  if (!(await canReachServer())) {
    log(`SKIP live API checks: server not reachable at ${baseUrl}.`);
    log("Run `npm run dev` or `npm run start`, then rerun this script for route checks.");
    return null;
  }

  const status = await fetchJson(`${baseUrl}/api/ingest/status`);
  if (!status.response.ok) {
    throw new Error(`GET /api/ingest/status returned ${status.response.status}.`);
  }
  if (status.body?.demoFallbackAvailable !== true) {
    throw new Error("GET /api/ingest/status did not confirm fallback availability.");
  }
  log(`OK GET /api/ingest/status -> ${status.body.activePath}.`);

  const bootstrap = await fetchJson(`${baseUrl}/api/ingest/bootstrap`, {
    method: "POST",
  });
  if (!bootstrap.response.ok) {
    throw new Error(`POST /api/ingest/bootstrap returned ${bootstrap.response.status}.`);
  }
  if (!bootstrap.body?.outcome) {
    throw new Error("POST /api/ingest/bootstrap response missing outcome.");
  }
  log(`OK POST /api/ingest/bootstrap -> ${bootstrap.body.outcome}.`);

  const pull = await fetchJson(`${baseUrl}/api/ingest/pull`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ includeTimeline: true }),
  });
  if (!pull.response.ok) {
    throw new Error(`POST /api/ingest/pull returned ${pull.response.status}.`);
  }
  if (!Array.isArray(pull.body?.incidentPackages)) {
    throw new Error("POST /api/ingest/pull response missing incidentPackages.");
  }
  log(`OK POST /api/ingest/pull -> ${pull.body.sourceMode}/${pull.body.outcome}.`);

  const demo = pull.body.incidentPackages[0];
  if (!demo?.incident?.id) {
    throw new Error("Pull response did not include a usable incident package.");
  }

  const sentinel = await fetchJson(`${baseUrl}/api/sentinel`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: "What should I do first?",
      incidentId: demo.incident.id,
      context: {
        incidentPackage: demo,
        timeline: pull.body.timeline ?? [],
        queueTitles: pull.body.incidentPackages.map((item) => item.incident.title),
        sourceMode: pull.body.sourceMode,
        pullStatus: null,
      },
    }),
  });
  if (!sentinel.response.ok) {
    throw new Error(`POST /api/sentinel returned ${sentinel.response.status}.`);
  }
  if (!sentinel.body?.answer) {
    throw new Error("POST /api/sentinel did not return an answer.");
  }
  log(`OK POST /api/sentinel -> geminiMode=${sentinel.body.meta?.geminiMode ?? "unknown"}.`);

  const write = await fetchJson(`${baseUrl}/api/timeline/write`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      incidentId: demo.incident.id,
      actionIndex: 0,
      actionLabel: demo.incident.recommendedActions?.[0] ?? "Dispatch team",
      incidentPackage: {
        ...demo,
        incident: {
          ...demo.incident,
          approvedActionIds: [`${demo.incident.id}-action-0`],
          status: "actioned",
        },
      },
    }),
  });
  if (!write.response.ok) {
    throw new Error(`POST /api/timeline/write returned ${write.response.status}.`);
  }
  if (!write.body?.timelineEntry?.id) {
    throw new Error("POST /api/timeline/write response missing timelineEntry.");
  }
  log(`OK POST /api/timeline/write -> elasticWritten=${write.body.elasticWritten}.`);

  return {
    bootstrap,
    pull,
    sentinel,
    write,
  };
}

function getElasticCredentialState() {
  const elasticUrl = process.env.ELASTICSEARCH_URL?.trim();
  const elasticKey =
    process.env.ELASTICSEARCH_API_KEY?.trim() || process.env.ELASTIC_API_KEY?.trim();

  return Boolean(elasticUrl && elasticKey);
}

function getVertexCredentialState() {
  const project = process.env.GOOGLE_CLOUD_PROJECT?.trim();
  const location = process.env.GOOGLE_CLOUD_LOCATION?.trim();
  const model = process.env.VERTEX_MODEL?.trim() || process.env.GEMINI_MODEL?.trim();
  const backendEnabled = process.env.AGENT_BACKEND_ENABLED?.trim() === "true";

  return Boolean(project && location && model && backendEnabled);
}

function reportCredentialedChecks(liveChecks) {
  const elasticConfigured = getElasticCredentialState();
  const vertexConfigured = getVertexCredentialState();

  if (!elasticConfigured) {
    log("SKIP credentialed Elastic checks: Elastic env vars not set.");
  } else if (liveChecks) {
    log(
      `INFO credentialed Elastic path observed sourceMode=${liveChecks.pull.body?.sourceMode ?? "unknown"}.`,
    );
  }

  if (!vertexConfigured) {
    log("SKIP credentialed Sentinel checks: Vertex env vars or backend toggle not set.");
  } else if (liveChecks) {
    log(
      `INFO credentialed Sentinel path observed geminiMode=${liveChecks.sentinel.body?.meta?.geminiMode ?? "unknown"}.`,
    );
  }

  if (!elasticConfigured && !vertexConfigured) {
    log("Fallback-only verification completed. No secrets were required.");
  }
}

async function main() {
  log("Stadium Sentinel real-demo verification");
  await verifyRepoArtifacts();
  const liveChecks = await verifyFallbackApiChecks();
  reportCredentialedChecks(liveChecks);
  log("Verification complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
