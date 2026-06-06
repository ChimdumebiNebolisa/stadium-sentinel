import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

async function loadEnvFile(filename) {
  const filePath = path.join(repoRoot, filename);

  try {
    const contents = await fs.readFile(filePath, "utf8");

    for (const line of contents.split(/\r?\n/)) {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separator = trimmed.indexOf("=");

      if (separator === -1) {
        continue;
      }

      const key = trimmed.slice(0, separator).trim();
      const value = trimmed.slice(separator + 1).trim();

      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // Ignore missing local env file and rely on process env.
  }
}

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getElasticConfig() {
  return {
    apiKey:
      process.env.ELASTICSEARCH_API_KEY?.trim() ||
      process.env.ELASTIC_API_KEY?.trim() ||
      "",
    evidenceIndex:
      process.env.ELASTICSEARCH_EVIDENCE_INDEX?.trim() || "stadium_evidence",
    incidentExamplesIndex:
      process.env.ELASTICSEARCH_INCIDENT_EXAMPLES_INDEX?.trim() ||
      "stadium_incident_examples",
    locationsIndex:
      process.env.ELASTICSEARCH_LOCATIONS_INDEX?.trim() || "stadium_locations",
    playbooksIndex:
      process.env.ELASTICSEARCH_PLAYBOOKS_INDEX?.trim() || "stadium_playbooks",
    url: getRequiredEnv("ELASTICSEARCH_URL").replace(/\/+$/, ""),
  };
}

async function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath);
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

function withSearchText(document, fields) {
  return {
    ...document,
    searchText:
      document.searchText ||
      fields
        .flatMap((field) => {
          const value = document[field];

          if (Array.isArray(value)) {
            return value;
          }

          return typeof value === "string" ? [value] : [];
        })
        .filter(Boolean)
        .join(" "),
  };
}

async function loadSeedSets() {
  const [playbooks, locations, incidentExamples, evidence] = await Promise.all([
    readJson("data/elastic/stadium_playbooks.json"),
    readJson("data/elastic/stadium_locations.json"),
    readJson("data/elastic/stadium_incident_examples.json"),
    readJson("data/elastic/stadium_evidence.json"),
  ]);

  return [
    {
      documents: playbooks.map((document) =>
        withSearchText(document, ["title", "excerpt", "body", "teams", "riskTags"]),
      ),
      indexName: getElasticConfig().playbooksIndex,
      mapping: {
        mappings: {
          dynamic: "false",
          properties: {
            id: { type: "keyword" },
            title: { type: "text" },
            procedureType: { type: "keyword" },
            incidentTypes: { type: "keyword" },
            locationIds: { type: "keyword" },
            teams: { type: "keyword" },
            riskTags: { type: "keyword" },
            excerpt: { type: "text" },
            body: { type: "text" },
            searchText: { type: "text" },
          },
        },
      },
    },
    {
      documents: locations.map((document) =>
        withSearchText(document, ["label", "aliases", "defaultTeams", "operationalRisks"]),
      ),
      indexName: getElasticConfig().locationsIndex,
      mapping: {
        mappings: {
          dynamic: "false",
          properties: {
            id: { type: "keyword" },
            label: { type: "text" },
            aliases: { type: "keyword" },
            zoneLayer: { type: "keyword" },
            defaultTeams: { type: "keyword" },
            operationalRisks: { type: "keyword" },
            accessibilityCritical: { type: "boolean" },
            crowdFlowCritical: { type: "boolean" },
            searchText: { type: "text" },
          },
        },
      },
    },
    {
      documents: incidentExamples.map((document) =>
        withSearchText(document, [
          "messyReport",
          "expectedIncidentIds",
          "expectedTitles",
          "expectedActions",
        ]),
      ),
      indexName: getElasticConfig().incidentExamplesIndex,
      mapping: {
        mappings: {
          dynamic: "false",
          properties: {
            id: { type: "keyword" },
            messyReport: { type: "text" },
            expectedIncidentIds: { type: "keyword" },
            expectedSeverities: { type: "keyword" },
            expectedActions: { type: "text" },
            expectedTitles: { type: "text" },
            searchText: { type: "text" },
          },
        },
      },
    },
    {
      documents: evidence.map((document) =>
        withSearchText(document, ["excerpt", "body", "incidentHints"]),
      ),
      indexName: getElasticConfig().evidenceIndex,
      mapping: {
        mappings: {
          dynamic: "false",
          properties: {
            id: { type: "keyword" },
            sourceType: { type: "keyword" },
            locationIds: { type: "keyword" },
            incidentHints: { type: "keyword" },
            excerpt: { type: "text" },
            body: { type: "text" },
            searchText: { type: "text" },
          },
        },
      },
    },
  ];
}

async function ensureIndex(url, headers, seedSet) {
  const response = await fetch(`${url}/${seedSet.indexName}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(seedSet.mapping),
  });

  if (!response.ok && response.status !== 400) {
    throw new Error(
      `Index setup failed for ${seedSet.indexName} with status ${response.status}.`,
    );
  }
}

async function bulkIndex(url, headers, seedSet) {
  const bulkBody = seedSet.documents
    .flatMap((document) => [
      JSON.stringify({ index: { _index: seedSet.indexName, _id: document.id } }),
      JSON.stringify(document),
    ])
    .join("\n")
    .concat("\n");

  const response = await fetch(`${url}/_bulk?refresh=true`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-ndjson",
    },
    body: bulkBody,
  });

  if (!response.ok) {
    throw new Error(
      `Bulk indexing failed for ${seedSet.indexName} with status ${response.status}.`,
    );
  }

  const payload = await response.json();

  if (payload.errors) {
    throw new Error(`Bulk indexing completed with item errors for ${seedSet.indexName}.`);
  }
}

async function main() {
  await loadEnvFile(".env.local");

  const config = getElasticConfig();

  if (!config.apiKey) {
    throw new Error(
      "Missing required environment variable: ELASTICSEARCH_API_KEY",
    );
  }

  const headers = {
    Authorization: `ApiKey ${config.apiKey}`,
    "Content-Type": "application/json",
  };
  const seedSets = await loadSeedSets();

  for (const seedSet of seedSets) {
    await ensureIndex(config.url, headers, seedSet);
    await bulkIndex(config.url, headers, seedSet);
    console.log(
      `Indexed ${seedSet.documents.length} documents into ${seedSet.indexName}.`,
    );
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
