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

function getIndexName(envKey, defaultName) {
  return process.env[envKey]?.trim() || defaultName;
}

function getElasticConfig() {
  return {
    apiKey:
      process.env.ELASTICSEARCH_API_KEY?.trim() ||
      process.env.ELASTIC_API_KEY?.trim() ||
      "",
    evidenceIndex: getIndexName(
      "ELASTICSEARCH_EVIDENCE_INDEX",
      "stadium_evidence",
    ),
    incidentExamplesIndex: getIndexName(
      "ELASTICSEARCH_INCIDENT_EXAMPLES_INDEX",
      "stadium_incident_examples",
    ),
    locationsIndex: getIndexName(
      "ELASTICSEARCH_LOCATIONS_INDEX",
      "stadium_locations",
    ),
    playbooksIndex: getIndexName(
      "ELASTICSEARCH_PLAYBOOKS_INDEX",
      "stadium_playbooks",
    ),
    activeIncidentsIndex: getIndexName(
      "ELASTICSEARCH_ACTIVE_INCIDENTS_INDEX",
      "stadium_active_incidents",
    ),
    guestAssistanceIndex: getIndexName(
      "ELASTICSEARCH_GUEST_ASSISTANCE_INDEX",
      "stadium_guest_assistance",
    ),
    facilityStatusIndex: getIndexName(
      "ELASTICSEARCH_FACILITY_STATUS_INDEX",
      "stadium_facility_status",
    ),
    gateFlowLogsIndex: getIndexName(
      "ELASTICSEARCH_GATE_FLOW_LOGS_INDEX",
      "stadium_gate_flow_logs",
    ),
    staffRosterIndex: getIndexName(
      "ELASTICSEARCH_STAFF_ROSTER_INDEX",
      "stadium_staff_roster",
    ),
    policiesIndex: getIndexName(
      "ELASTICSEARCH_POLICIES_INDEX",
      "stadium_policies",
    ),
    radioTranscriptsIndex: getIndexName(
      "ELASTICSEARCH_RADIO_TRANSCRIPTS_INDEX",
      "stadium_radio_transcripts",
    ),
    dispatchTimelineIndex: getIndexName(
      "ELASTICSEARCH_DISPATCH_TIMELINE_INDEX",
      "stadium_dispatch_timeline",
    ),
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

function keywordMapping(properties) {
  return {
    mappings: {
      dynamic: "false",
      properties,
    },
  };
}

async function loadSeedSets() {
  const config = getElasticConfig();
  const [
    playbooks,
    locations,
    incidentExamples,
    evidence,
    activeIncidents,
    guestAssistance,
    facilityStatus,
    gateFlowLogs,
    staffRoster,
    policies,
    radioTranscripts,
    dispatchTimeline,
  ] = await Promise.all([
    readJson("data/elastic/stadium_playbooks.json"),
    readJson("data/elastic/stadium_locations.json"),
    readJson("data/elastic/stadium_incident_examples.json"),
    readJson("data/elastic/stadium_evidence.json"),
    readJson("data/elastic/stadium_active_incidents.json"),
    readJson("data/elastic/stadium_guest_assistance.json"),
    readJson("data/elastic/stadium_facility_status.json"),
    readJson("data/elastic/stadium_gate_flow_logs.json"),
    readJson("data/elastic/stadium_staff_roster.json"),
    readJson("data/elastic/stadium_policies.json"),
    readJson("data/elastic/stadium_radio_transcripts.json"),
    readJson("data/elastic/stadium_dispatch_timeline.json"),
  ]);

  return [
    {
      documents: playbooks.map((document) =>
        withSearchText(document, ["title", "excerpt", "body", "teams", "riskTags"]),
      ),
      indexName: config.playbooksIndex,
      mapping: keywordMapping({
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
      }),
    },
    {
      documents: locations.map((document) =>
        withSearchText(document, ["label", "aliases", "defaultTeams", "operationalRisks"]),
      ),
      indexName: config.locationsIndex,
      mapping: keywordMapping({
        id: { type: "keyword" },
        label: { type: "text" },
        aliases: { type: "keyword" },
        zoneLayer: { type: "keyword" },
        defaultTeams: { type: "keyword" },
        operationalRisks: { type: "keyword" },
        accessibilityCritical: { type: "boolean" },
        crowdFlowCritical: { type: "boolean" },
        searchText: { type: "text" },
      }),
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
      indexName: config.incidentExamplesIndex,
      mapping: keywordMapping({
        id: { type: "keyword" },
        messyReport: { type: "text" },
        expectedIncidentIds: { type: "keyword" },
        expectedSeverities: { type: "keyword" },
        expectedActions: { type: "text" },
        expectedTitles: { type: "text" },
        searchText: { type: "text" },
      }),
    },
    {
      documents: evidence.map((document) =>
        withSearchText(document, ["excerpt", "body", "incidentHints"]),
      ),
      indexName: config.evidenceIndex,
      mapping: keywordMapping({
        id: { type: "keyword" },
        sourceType: { type: "keyword" },
        locationIds: { type: "keyword" },
        incidentHints: { type: "keyword" },
        excerpt: { type: "text" },
        body: { type: "text" },
        searchText: { type: "text" },
      }),
    },
    {
      documents: activeIncidents.map((document) =>
        withSearchText(document, [
          "title",
          "rawText",
          "locationLabel",
          "assignedRole",
          "category",
        ]),
      ),
      indexName: config.activeIncidentsIndex,
      mapping: keywordMapping({
        id: { type: "keyword" },
        title: { type: "text" },
        rawText: { type: "text" },
        category: { type: "keyword" },
        incidentType: { type: "keyword" },
        priority: { type: "keyword" },
        locationId: { type: "keyword" },
        locationLabel: { type: "text" },
        assignedRole: { type: "keyword" },
        status: { type: "keyword" },
        reportedAt: { type: "date" },
        evidenceIds: { type: "keyword" },
        guestAssistanceId: { type: "keyword" },
        facilityStatusId: { type: "keyword" },
        searchText: { type: "text" },
      }),
    },
    {
      documents: guestAssistance.map((document) =>
        withSearchText(document, ["guestLocation", "need", "assignedRole"]),
      ),
      indexName: config.guestAssistanceIndex,
      mapping: keywordMapping({
        id: { type: "keyword" },
        guestLocation: { type: "text" },
        need: { type: "text" },
        priority: { type: "keyword" },
        relatedIncidentId: { type: "keyword" },
        locationId: { type: "keyword" },
        status: { type: "keyword" },
        requestedAt: { type: "date" },
        assignedRole: { type: "keyword" },
        searchText: { type: "text" },
      }),
    },
    {
      documents: facilityStatus.map((document) =>
        withSearchText(document, ["assetLabel", "notes", "status"]),
      ),
      indexName: config.facilityStatusIndex,
      mapping: keywordMapping({
        id: { type: "keyword" },
        assetId: { type: "keyword" },
        assetLabel: { type: "text" },
        status: { type: "keyword" },
        relatedIncidentId: { type: "keyword" },
        locationId: { type: "keyword" },
        lastCheckedAt: { type: "date" },
        notes: { type: "text" },
        searchText: { type: "text" },
      }),
    },
    {
      documents: gateFlowLogs.map((document) =>
        withSearchText(document, ["gateLabel", "observation", "source"]),
      ),
      indexName: config.gateFlowLogsIndex,
      mapping: keywordMapping({
        id: { type: "keyword" },
        gateId: { type: "keyword" },
        gateLabel: { type: "text" },
        observation: { type: "text" },
        priority: { type: "keyword" },
        relatedIncidentId: { type: "keyword" },
        loggedAt: { type: "date" },
        source: { type: "keyword" },
        searchText: { type: "text" },
      }),
    },
    {
      documents: staffRoster.map((document) =>
        withSearchText(document, ["team", "callSign", "displayName", "zone"]),
      ),
      indexName: config.staffRosterIndex,
      mapping: keywordMapping({
        id: { type: "keyword" },
        roleId: { type: "keyword" },
        team: { type: "keyword" },
        callSign: { type: "keyword" },
        displayName: { type: "text" },
        onDuty: { type: "boolean" },
        zone: { type: "keyword" },
        relatedIncidentIds: { type: "keyword" },
        searchText: { type: "text" },
      }),
    },
    {
      documents: policies.map((document) =>
        withSearchText(document, ["title", "excerpt", "body", "teams"]),
      ),
      indexName: config.policiesIndex,
      mapping: keywordMapping({
        id: { type: "keyword" },
        title: { type: "text" },
        excerpt: { type: "text" },
        body: { type: "text" },
        appliesToCategories: { type: "keyword" },
        procedureType: { type: "keyword" },
        teams: { type: "keyword" },
        searchText: { type: "text" },
      }),
    },
    {
      documents: radioTranscripts.map((document) =>
        withSearchText(document, ["label", "excerpt", "lines", "matchedIncidentHints"]),
      ),
      indexName: config.radioTranscriptsIndex,
      mapping: keywordMapping({
        id: { type: "keyword" },
        presetId: { type: "keyword" },
        label: { type: "text" },
        lines: { type: "text" },
        excerpt: { type: "text" },
        recordedAt: { type: "date" },
        matchedIncidentHints: { type: "keyword" },
        relatedIncidentIds: { type: "keyword" },
        searchText: { type: "text" },
      }),
    },
    {
      documents: dispatchTimeline.map((document) =>
        withSearchText(document, ["message", "actor", "type"]),
      ),
      indexName: config.dispatchTimelineIndex,
      mapping: keywordMapping({
        id: { type: "keyword" },
        incidentId: { type: "keyword" },
        timestamp: { type: "date" },
        type: { type: "keyword" },
        message: { type: "text" },
        actor: { type: "keyword" },
        source: { type: "keyword" },
        recommendedActionId: { type: "keyword" },
        searchText: { type: "text" },
      }),
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
