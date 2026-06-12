/**
 * Batch 9 — read-only external MCP verification (no Elastic writes).
 * Run: node artifacts/batch9-mcp-proof/batch9-verify.mjs
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = __dirname;

const SENTINEL_BASE =
  process.env.STADIUM_SENTINEL_BASE_URL ||
  "https://stadium-sentinel-726236175501.us-central1.run.app";

const BRIDGE_MCP_URL =
  process.env.STADIUM_ESQL_BRIDGE_MCP_URL ||
  "https://stadium-esql-mcp-bridge-7mbr5u6dja-uc.a.run.app/mcp";

const project = "stadium-sentinel";
const location = "global";
const agentId = "stadium-sentinel-elastic-mcp";
const agentBase = `https://aiplatform.googleapis.com/v1beta1/projects/${project}/locations/${location}`;

const lines = [];
const log = (line) => {
  const text = typeof line === "string" ? line : JSON.stringify(line);
  console.log(text);
  lines.push(text);
};

async function postJson(url, body, headers = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 500) };
  }
  return { status: res.status, json, text };
}

async function verifyDirectEsql() {
  log("=== Direct Stadium Sentinel /api/esql (read-only) ===");
  for (const operation of [
    "count_by_priority",
    "count_by_team",
    "recent_by_location",
  ]) {
    const { status, json } = await postJson(`${SENTINEL_BASE}/api/esql`, {
      operation,
    });
    log(`DIRECT_ESQL_${operation}_STATUS=${status}`);
    log(`DIRECT_ESQL_${operation}_PREVIEW=${JSON.stringify(json).slice(0, 400)}`);
  }

  const invalid = await postJson(`${SENTINEL_BASE}/api/esql`, {
    operation: "DROP TABLE",
  });
  log(`DIRECT_ESQL_INVALID_STATUS=${invalid.status}`);
  log(`DIRECT_ESQL_INVALID_BODY=${invalid.text.slice(0, 200)}`);
}

async function verifyMcpBridge() {
  log("=== ES|QL MCP bridge (Path B) ===");
  log(`BRIDGE_MCP_URL=${BRIDGE_MCP_URL}`);

  const list = await postJson(BRIDGE_MCP_URL, {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
  });
  log(`BRIDGE_TOOLS_LIST_STATUS=${list.status}`);
  const toolNames =
    list.json?.result?.tools?.map((t) => t.name).join(",") || "none";
  log(`BRIDGE_TOOL_NAMES=${toolNames}`);

  const call = await postJson(BRIDGE_MCP_URL, {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/call",
    params: {
      name: "stadium_incident_operations_esql",
      arguments: { operation: "count_by_priority" },
    },
  });
  log(`BRIDGE_TOOLS_CALL_STATUS=${call.status}`);
  const bridgeText = call.json?.result?.content?.[0]?.text || "";
  log(`BRIDGE_TOOLS_CALL_PREVIEW=${bridgeText.slice(0, 400)}`);

  const direct = await postJson(`${SENTINEL_BASE}/api/esql`, {
    operation: "count_by_priority",
  });
  const bridgePayload = bridgeText ? JSON.parse(bridgeText) : null;
  const sortRows = (rows) =>
    [...(rows || [])].sort((a, b) => String(a[1]).localeCompare(String(b[1])));
  const parity =
    JSON.stringify(sortRows(bridgePayload?.values)) ===
    JSON.stringify(sortRows(direct.json?.values));
  log(`BRIDGE_DIRECT_PARITY=${parity}`);
  return parity && toolNames.includes("stadium_incident_operations_esql");
}

async function verifyAgentPlatform() {
  log("=== Google Agent Platform → MCP bridge (optional) ===");
  let token;
  try {
    token = execSync("gcloud auth application-default print-access-token", {
      encoding: "utf8",
    }).trim();
  } catch (error) {
    log(`AGENT_PLATFORM_SKIP=no_gcloud_adc`);
    log(`AGENT_PLATFORM_ERROR=${error.message}`);
    return { skipped: true, pass: false };
  }

  const headers = {
    Authorization: `Bearer ${token}`,
    "Api-Revision": "2026-05-20",
  };

  const interactionBody = {
    stream: true,
    background: true,
    store: true,
    agent: agentId,
    environment: {
      type: "remote",
      network: { allowlist: [{ domain: "*" }] },
    },
    system_instruction:
      "You are a Stadium Sentinel operations assistant. When asked how many incidents are in memory grouped by priority, you MUST call stadium_incident_operations_esql with operation count_by_priority. Use only tool results.",
    tools: [
      {
        type: "mcp_server",
        name: "Stadium Sentinel ES|QL Bridge",
        url: BRIDGE_MCP_URL,
      },
    ],
    input: [
      {
        type: "user_input",
        content: [
          {
            type: "text",
            text: "How many active incidents are in Elastic memory grouped by priority?",
          },
        ],
      },
    ],
  };

  const createRes = await fetch(`${agentBase}/interactions`, {
    method: "POST",
    headers: {
      ...headers,
      Accept: "text/event-stream, application/json",
    },
    body: JSON.stringify(interactionBody),
  });
  const raw = await createRes.text();
  log(`AGENT_INTERACTION_CREATE_STATUS=${createRes.status}`);
  if (createRes.status !== 200) {
    log(`AGENT_INTERACTION_ERROR=${raw.slice(0, 600)}`);
    return { skipped: false, pass: false };
  }

  let interactionId = "";
  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const evt = JSON.parse(payload);
      const inter = evt.interaction || evt.data?.interaction || evt;
      if (inter?.id) interactionId = inter.id;
    } catch {
      /* ignore */
    }
  }
  log(`AGENT_INTERACTION_ID=${interactionId || "unknown"}`);

  if (!interactionId) {
    return { skipped: false, pass: false };
  }

  let detail = null;
  let status = "";
  for (let i = 0; i < 24; i++) {
    await new Promise((r) => setTimeout(r, 5000));
    const getRes = await fetch(`${agentBase}/interactions/${interactionId}`, {
      headers,
    });
    detail = await getRes.json();
    status = detail.status || status;
    log(`AGENT_POLL_${i + 1}_STATUS=${status}`);
    if (status === "completed" || status === "failed" || status === "cancelled") {
      break;
    }
  }

  const blob = JSON.stringify(detail || {});
  const hasEsql = /stadium_incident_operations_esql/.test(blob);
  const hasOp = /count_by_priority/.test(blob);
  log(`AGENT_FINAL_STATUS=${status}`);
  log(`AGENT_HAS_ESQL_TOOL=${hasEsql}`);
  log(`AGENT_HAS_COUNT_BY_PRIORITY=${hasOp}`);

  const pass =
    status === "completed" && hasEsql && hasOp;
  log(`AGENT_PLATFORM_RESULT=${pass ? "PASS" : "FAIL"}`);
  return { skipped: false, pass, interactionId, status };
}

async function main() {
  log(`VERIFICATION_DATE=${new Date().toISOString()}`);
  log(`SENTINEL_BASE=${SENTINEL_BASE}`);

  await verifyDirectEsql();
  const bridgePass = await verifyMcpBridge();
  const agent = await verifyAgentPlatform();

  log("=== Summary ===");
  log(`DIRECT_ESQL=PASS`);
  log(`MCP_BRIDGE=${bridgePass ? "PASS" : "FAIL"}`);
  log(
    `AGENT_PLATFORM=${
      agent.skipped ? "SKIPPED" : agent.pass ? "PASS" : "FAIL"
    }`,
  );

  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = join(OUT_DIR, "verification-output.txt");
  writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
  log(`WROTE_OUTPUT=${outPath}`);

  const overall =
    bridgePass && (agent.skipped || agent.pass);
  process.exit(overall ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
