import fs from "node:fs/promises";
import path from "node:path";

import { elasticFetch, getElasticConfig } from "@/lib/elastic/client";
import { resolveSeedHealth, type SeedHealth } from "@/lib/elastic/seed-health";

type SeedDocument = Record<string, unknown> & { id: string };

type SeedSet = {
  indexName: string;
  mapping: {
    mappings: {
      dynamic: string;
      properties: Record<string, { type: string }>;
    };
  };
  documents: SeedDocument[];
};

export type BootstrapOutcome = "unconfigured" | "ready" | "seeded" | "failed";

export type BootstrapResult = {
  outcome: BootstrapOutcome;
  skipped?: boolean;
  seedHealth?: SeedHealth;
  errorSummary?: string;
  indexedCounts?: Array<{ indexName: string; count: number }>;
};

function getRepoRoot(): string {
  return process.cwd();
}

async function readJson<T>(relativePath: string): Promise<T> {
  const filePath = path.join(getRepoRoot(), relativePath);
  return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
}

function withSearchText(
  document: SeedDocument,
  fields: string[],
): SeedDocument {
  return {
    ...document,
    searchText:
      (document.searchText as string | undefined) ||
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

function keywordMapping(properties: Record<string, { type: string }>) {
  return {
    mappings: {
      dynamic: "false",
      properties,
    },
  };
}

export async function loadSeedSets(): Promise<SeedSet[]> {
  const config = getElasticConfig();

  if (!config) {
    throw new Error("Elastic configuration is incomplete.");
  }

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
    readJson<SeedDocument[]>("data/elastic/stadium_playbooks.json"),
    readJson<SeedDocument[]>("data/elastic/stadium_locations.json"),
    readJson<SeedDocument[]>("data/elastic/stadium_incident_examples.json"),
    readJson<SeedDocument[]>("data/elastic/stadium_evidence.json"),
    readJson<SeedDocument[]>("data/elastic/stadium_active_incidents.json"),
    readJson<SeedDocument[]>("data/elastic/stadium_guest_assistance.json"),
    readJson<SeedDocument[]>("data/elastic/stadium_facility_status.json"),
    readJson<SeedDocument[]>("data/elastic/stadium_gate_flow_logs.json"),
    readJson<SeedDocument[]>("data/elastic/stadium_staff_roster.json"),
    readJson<SeedDocument[]>("data/elastic/stadium_policies.json"),
    readJson<SeedDocument[]>("data/elastic/stadium_radio_transcripts.json"),
    readJson<SeedDocument[]>("data/elastic/stadium_dispatch_timeline.json"),
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

async function ensureIndex(seedSet: SeedSet): Promise<void> {
  const response = await elasticFetch(`/${seedSet.indexName}`, {
    method: "PUT",
    body: JSON.stringify(seedSet.mapping),
  });

  if (!response.ok && response.status !== 400) {
    throw new Error(
      `Index setup failed for ${seedSet.indexName} with status ${response.status}.`,
    );
  }
}

async function bulkIndex(seedSet: SeedSet): Promise<void> {
  const bulkBody = seedSet.documents
    .flatMap((document) => [
      JSON.stringify({ index: { _index: seedSet.indexName, _id: document.id } }),
      JSON.stringify(document),
    ])
    .join("\n")
    .concat("\n");

  const response = await elasticFetch("/_bulk?refresh=true", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-ndjson",
    },
    body: bulkBody,
  });

  if (!response.ok) {
    throw new Error(
      `Bulk indexing failed for ${seedSet.indexName} with status ${response.status}.`,
    );
  }

  const payload = (await response.json()) as { errors?: boolean };

  if (payload.errors) {
    throw new Error(`Bulk indexing completed with item errors for ${seedSet.indexName}.`);
  }
}

export async function runElasticBootstrap(): Promise<{
  indexedCounts: Array<{ indexName: string; count: number }>;
}> {
  const seedSets = await loadSeedSets();
  const indexedCounts: Array<{ indexName: string; count: number }> = [];

  for (const seedSet of seedSets) {
    await ensureIndex(seedSet);
    await bulkIndex(seedSet);
    indexedCounts.push({
      indexName: seedSet.indexName,
      count: seedSet.documents.length,
    });
  }

  return { indexedCounts };
}

export async function resolveElasticBootstrap(): Promise<BootstrapResult> {
  const config = getElasticConfig();

  if (!config) {
    return { outcome: "unconfigured" };
  }

  const existingHealth = await resolveSeedHealth();

  if (existingHealth.ready) {
    return {
      outcome: "ready",
      skipped: true,
      seedHealth: existingHealth,
    };
  }

  try {
    const { indexedCounts } = await runElasticBootstrap();
    const seedHealth = await resolveSeedHealth();

    return {
      outcome: seedHealth.ready ? "seeded" : "failed",
      seedHealth,
      indexedCounts,
      errorSummary: seedHealth.ready
        ? undefined
        : "Seeded stadium operations data did not meet minimum index counts.",
    };
  } catch (error) {
    const seedHealth = await resolveSeedHealth().catch(() => existingHealth);
    const message =
      error instanceof Error ? error.message : "Elastic bootstrap failed.";

    return {
      outcome: "failed",
      seedHealth,
      errorSummary: message,
    };
  }
}
