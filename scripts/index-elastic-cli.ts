import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runElasticBootstrap } from "@/lib/elastic/bootstrap";
import { getElasticConfig } from "@/lib/elastic/client";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

async function loadEnvFile(filename: string) {
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

async function main() {
  await loadEnvFile(".env.local");

  if (!getElasticConfig()) {
    throw new Error(
      "Missing required Elastic environment variables: ELASTICSEARCH_URL and ELASTICSEARCH_API_KEY.",
    );
  }

  const { indexedCounts } = await runElasticBootstrap();

  for (const entry of indexedCounts) {
    console.log(`Indexed ${entry.count} documents into ${entry.indexName}.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
