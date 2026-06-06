import http from "node:http";

const PORT = Number(process.env.PORT || 8080);
const BASE_URL = (process.env.STADIUM_SENTINEL_BASE_URL || "").replace(/\/+$/, "");
const VALID = new Set([
  "count_by_priority",
  "count_by_team",
  "recent_by_location",
]);

const TOOL = {
  name: "stadium_incident_operations_esql",
  description:
    "Call Stadium Sentinel bounded /api/esql with enum-only incident memory operations.",
  inputSchema: {
    type: "object",
    properties: {
      operation: {
        type: "string",
        enum: [...VALID],
        description: "Bounded ES|QL operation enum.",
      },
    },
    required: ["operation"],
    additionalProperties: false,
  },
};

function jsonRpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function jsonRpcError(id, message) {
  return { jsonrpc: "2.0", id, error: { code: -32000, message } };
}

async function callStadiumEsql(operation) {
  if (!BASE_URL) {
    throw new Error("STADIUM_SENTINEL_BASE_URL is not configured.");
  }
  if (!VALID.has(operation)) {
    throw new Error(
      "Invalid operation. Must be one of: count_by_priority, count_by_team, recent_by_location",
    );
  }

  const target = `${BASE_URL}/api/esql`;
  const body = JSON.stringify({ operation });
  console.log(
    JSON.stringify({
      event: "bridge_call_esql",
      method: "POST",
      path: "/api/esql",
      operation,
      body,
    }),
  );

  const response = await fetch(target, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });

  const text = await response.text();
  console.log(
    JSON.stringify({
      event: "bridge_esql_response",
      status: response.status,
      operation,
      bytes: text.length,
    }),
  );

  if (!response.ok) {
    throw new Error(`Stadium Sentinel /api/esql returned HTTP ${response.status}`);
  }

  return JSON.parse(text);
}

async function handleRpc(message) {
  const { id, method, params } = message;

  if (method === "initialize") {
    return jsonRpcResult(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: { listChanged: true } },
      serverInfo: { name: "stadium-esql-mcp-bridge", version: "1.0.0" },
    });
  }

  if (method === "notifications/initialized") {
    return null;
  }

  if (method === "tools/list") {
    return jsonRpcResult(id, { tools: [TOOL] });
  }

  if (method === "tools/call") {
    const name = params?.name;
    const args = params?.arguments || {};
    if (name !== TOOL.name) {
      return jsonRpcError(id, `Unknown tool: ${name}`);
    }
    try {
      const payload = await callStadiumEsql(args.operation);
      return jsonRpcResult(id, {
        content: [{ type: "text", text: JSON.stringify(payload) }],
        isError: false,
      });
    } catch (error) {
      return jsonRpcResult(id, {
        content: [
          {
            type: "text",
            text: JSON.stringify({ error: error.message || "bridge_error" }),
          },
        ],
        isError: true,
      });
    }
  }

  return jsonRpcError(id, `Unsupported method: ${method}`);
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/healthz") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "stadium-esql-mcp-bridge" }));
    return;
  }

  if (req.method !== "POST" || req.url !== "/mcp") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
    return;
  }

  let raw = "";
  for await (const chunk of req) raw += chunk;

  let message;
  try {
    message = JSON.parse(raw);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify(jsonRpcError(null, "Invalid JSON")));
    return;
  }

  try {
    const response = await handleRpc(message);
    if (!response) {
      res.writeHead(202);
      res.end();
      return;
    }
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
    });
    res.end(JSON.stringify(response));
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify(jsonRpcError(message.id ?? null, error.message)));
  }
});

server.listen(PORT, () => {
  console.log(
    JSON.stringify({
      event: "bridge_started",
      port: PORT,
      baseUrlConfigured: Boolean(BASE_URL),
    }),
  );
});
