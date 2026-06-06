/**
 * JSON schemas defining the Elastic Agent Builder / MCP tool boundaries.
 * 
 * Note: These are schematic definitions. Stadium Sentinel does not automatically
 * deploy an MCP server or Google Cloud Agent Builder. You must manually provision 
 * the MCP connection or Agent Builder workflows using the endpoint definitions below.
 */

export const stadiumContextSearchTool = {
  name: "stadium_context_search",
  description: "Search across stadium evidence, locational operational risks, and playbooks.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The context query string.",
      },
      category: {
        type: "string",
        description: "Optional filter for evidence category (e.g., historical_incident, location, playbook).",
      },
    },
    required: ["query"],
  },
};

export const boundedEsqlOperationsTool = {
  name: "stadium_incident_operations_esql",
  description: "Get structured aggregations of live incident memory utilizing bounded ES|QL operations.",
  parameters: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: ["count_by_priority", "count_by_team", "recent_by_location"],
        description: "The bounded reporting operation to perform.",
      },
    },
    required: ["operation"],
  },
};
