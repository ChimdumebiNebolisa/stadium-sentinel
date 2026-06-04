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

async function main() {
  await loadEnvFile(".env.local");

  const elasticsearchUrl = getRequiredEnv("ELASTICSEARCH_URL").replace(/\/+$/, "");
  const apiKey = getRequiredEnv("ELASTIC_API_KEY");
  const indexName =
    process.env.ELASTIC_INDEX_NAME?.trim() || "stadium-sentinel-knowledge";

  const documentPath = path.join(repoRoot, "data", "operational-knowledge.json");
  const sourceDocuments = JSON.parse(await fs.readFile(documentPath, "utf8"));
  const documents = sourceDocuments.map((document) => ({
    ...document,
    content: [
      document.title,
      document.excerpt,
      document.body,
      document.rationale,
      ...(document.locationNames ?? []),
      ...(document.terms ?? []),
    ]
      .filter(Boolean)
      .join(" "),
  }));

  const headers = {
    Authorization: `ApiKey ${apiKey}`,
    "Content-Type": "application/json",
  };

  const createIndexResponse = await fetch(`${elasticsearchUrl}/${indexName}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({
      mappings: {
        dynamic: "false",
        properties: {
          id: { type: "keyword" },
          sourceType: { type: "keyword" },
          title: { type: "text" },
          excerpt: { type: "text" },
          body: { type: "text" },
          rationale: { type: "text" },
          content: { type: "text" },
          incidentTypes: { type: "keyword" },
          categories: { type: "keyword" },
          locationIds: { type: "keyword" },
          locationNames: { type: "keyword" },
          priorityLevels: { type: "keyword" },
          terms: { type: "keyword" },
        },
      },
    }),
  });

  if (
    !createIndexResponse.ok &&
    createIndexResponse.status !== 400
  ) {
    throw new Error(`Index setup failed with status ${createIndexResponse.status}`);
  }

  const bulkBody = documents
    .flatMap((document) => [
      JSON.stringify({ index: { _index: indexName, _id: document.id } }),
      JSON.stringify(document),
    ])
    .join("\n")
    .concat("\n");

  const response = await fetch(`${elasticsearchUrl}/_bulk?refresh=true`, {
    method: "POST",
    headers: {
      ...headers,
      "Content-Type": "application/x-ndjson",
    },
    body: bulkBody,
  });

  if (!response.ok) {
    throw new Error(`Bulk indexing failed with status ${response.status}`);
  }

  const payload = await response.json();

  if (payload.errors) {
    throw new Error("Bulk indexing completed with item errors.");
  }

  console.log(`Indexed ${documents.length} operational knowledge documents into ${indexName}.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
