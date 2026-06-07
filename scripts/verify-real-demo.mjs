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
  "docs/demo-recording-checklist.md",
];

const requiredRoutes = [
  "app/api/ingest/status/route.ts",
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

  log("✓ Required real-demo docs and API routes are present.");
}

async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body;

  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }

  return { response, body };
}

async function verifyFallbackApiChecks() {
  try {
    const status = await fetchJson(`${baseUrl}/api/ingest/status`);
    if (!status.response.ok) {
      throw new Error(`ingest status returned ${status.response.status}`);
    }
    if (status.body?.demoFallbackAvailable !== true) {
      throw new Error("ingest status did not report demo fallback availability.");
    }
    log("✓ GET /api/ingest/status reports demo fallback availability.");

    const pull = await fetchJson(`${baseUrl}/api/ingest/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ includeTimeline: true }),
    });
    if (!pull.response.ok) {
      throw new Error(`ingest pull returned ${pull.response.status}`);
    }
    if (!Array.isArray(pull.body?.incidentPackages)) {
      throw new Error("ingest pull response missing incidentPackages.");
    }
    log(`✓ POST /api/ingest/pull returned ${pull.body.outcome} (${pull.body.sourceMode}).`);

    const demo = pull.body.incidentPackages[0];
    if (!demo?.incident?.id) {
      throw new Error("ingest pull fallback packages missing incident id.");
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
      throw new Error(`sentinel route returned ${sentinel.response.status}`);
    }
    if (!sentinel.body?.answer) {
      throw new Error("sentinel route did not return an answer.");
    }
    log(`✓ POST /api/sentinel answered with meta.geminiMode=${sentinel.body.meta?.geminiMode}.`);

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
      throw new Error(`timeline write returned ${write.response.status}`);
    }
    if (!write.body?.timelineEntry?.id) {
      throw new Error("timeline write response missing timelineEntry.");
    }
    log(`✓ POST /api/timeline/write returned elasticWritten=${write.body.elasticWritten}.`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("fetch failed")) {
      log(`! Server not reachable at ${baseUrl}; skipped live API checks.`);
      log("  Start the app with npm run dev, then rerun this script for live verification.");
      return;
    }

    throw error;
  }
}

async function verifyOptionalElasticConfigured() {
  const elasticUrl = process.env.ELASTICSEARCH_URL?.trim();
  const elasticKey =
    process.env.ELASTICSEARCH_API_KEY?.trim() || process.env.ELASTIC_API_KEY?.trim();

  if (!elasticUrl || !elasticKey) {
    log("• Elastic credentials not set; live Elastic checks skipped.");
    return;
  }

  log("• Elastic credentials detected. Run npm run index:elastic before recording the credentialed demo.");
}

async function main() {
  log("Stadium Sentinel real-demo verification");
  await verifyRepoArtifacts();
  await verifyFallbackApiChecks();
  await verifyOptionalElasticConfigured();
  log("Real-demo verification complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
