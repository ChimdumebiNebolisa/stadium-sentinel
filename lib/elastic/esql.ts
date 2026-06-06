import { getElasticConfig, elasticFetch } from "./client";
import type { BoundedEsqlOperation } from "../types";

export async function executeBoundedEsql(operation: BoundedEsqlOperation) {
  const config = getElasticConfig();
  if (!config) {
    throw new Error("Elastic configuration is incomplete.");
  }

  let query = "";
  if (operation === "count_by_priority") {
    query = `FROM ${config.incidentMemoryIndex} | STATS count = COUNT() BY priority`;
  } else if (operation === "count_by_team") {
    query = `FROM ${config.incidentMemoryIndex} | STATS count = COUNT() BY team`;
  } else if (operation === "recent_by_location") {
    query = `FROM ${config.incidentMemoryIndex} | SORT timestamp DESC | LIMIT 10 | KEEP timestamp, incidentId, title, locationLabel, priority`;
  } else {
    throw new Error(`Unsupported ES|QL operation: ${operation}`);
  }

  const response = await elasticFetch("/_query?format=json", {
    method: "POST",
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    throw new Error(`ES|QL returned status: ${response.status}`);
  }

  return response.json();
}
