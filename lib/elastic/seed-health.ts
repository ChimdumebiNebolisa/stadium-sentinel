import { elasticFetch, getElasticConfig, isElasticConfigured } from "@/lib/elastic/client";

export type SeedIndexRequirement = {
  envKey: string;
  defaultName: string;
  minimumRequired: number;
};

export type SeedIndexHealth = {
  name: string;
  envKey: string;
  documentCount: number | null;
  minimumRequired: number;
  exists: boolean;
};

export type SeedHealth = {
  ready: boolean;
  indices: SeedIndexHealth[];
};

export const SEED_INDEX_REQUIREMENTS: SeedIndexRequirement[] = [
  {
    envKey: "ELASTICSEARCH_ACTIVE_INCIDENTS_INDEX",
    defaultName: "stadium_active_incidents",
    minimumRequired: 8,
  },
  {
    envKey: "ELASTICSEARCH_GUEST_ASSISTANCE_INDEX",
    defaultName: "stadium_guest_assistance",
    minimumRequired: 3,
  },
  {
    envKey: "ELASTICSEARCH_FACILITY_STATUS_INDEX",
    defaultName: "stadium_facility_status",
    minimumRequired: 3,
  },
  {
    envKey: "ELASTICSEARCH_GATE_FLOW_LOGS_INDEX",
    defaultName: "stadium_gate_flow_logs",
    minimumRequired: 3,
  },
  {
    envKey: "ELASTICSEARCH_STAFF_ROSTER_INDEX",
    defaultName: "stadium_staff_roster",
    minimumRequired: 3,
  },
  {
    envKey: "ELASTICSEARCH_POLICIES_INDEX",
    defaultName: "stadium_policies",
    minimumRequired: 3,
  },
  {
    envKey: "ELASTICSEARCH_RADIO_TRANSCRIPTS_INDEX",
    defaultName: "stadium_radio_transcripts",
    minimumRequired: 2,
  },
  {
    envKey: "ELASTICSEARCH_DISPATCH_TIMELINE_INDEX",
    defaultName: "stadium_dispatch_timeline",
    minimumRequired: 8,
  },
  {
    envKey: "ELASTICSEARCH_EVIDENCE_INDEX",
    defaultName: "stadium_evidence",
    minimumRequired: 15,
  },
];

function resolveIndexName(envKey: string, defaultName: string): string {
  return process.env[envKey]?.trim() || defaultName;
}

function buildUnconfiguredHealth(): SeedHealth {
  return {
    ready: false,
    indices: SEED_INDEX_REQUIREMENTS.map((requirement) => ({
      name: resolveIndexName(requirement.envKey, requirement.defaultName),
      envKey: requirement.envKey,
      documentCount: null,
      minimumRequired: requirement.minimumRequired,
      exists: false,
    })),
  };
}

async function probeIndex(indexName: string): Promise<{
  exists: boolean;
  documentCount: number | null;
}> {
  try {
    const headResponse = await elasticFetch(`/${indexName}`, { method: "HEAD" });

    if (!headResponse.ok) {
      return { exists: false, documentCount: null };
    }

    const countResponse = await elasticFetch(`/${indexName}/_count`, {
      method: "GET",
    });

    if (!countResponse.ok) {
      return { exists: true, documentCount: null };
    }

    const payload = (await countResponse.json()) as { count?: number };
    return {
      exists: true,
      documentCount:
        typeof payload.count === "number" ? payload.count : null,
    };
  } catch {
    return { exists: false, documentCount: null };
  }
}

export async function resolveSeedHealth(): Promise<SeedHealth> {
  if (!isElasticConfigured() || getElasticConfig() === null) {
    return buildUnconfiguredHealth();
  }

  const indices: SeedIndexHealth[] = [];

  for (const requirement of SEED_INDEX_REQUIREMENTS) {
    const name = resolveIndexName(requirement.envKey, requirement.defaultName);
    const probe = await probeIndex(name);

    indices.push({
      name,
      envKey: requirement.envKey,
      documentCount: probe.documentCount,
      minimumRequired: requirement.minimumRequired,
      exists: probe.exists,
    });
  }

  const ready = indices.every(
    (index) =>
      index.exists &&
      index.documentCount !== null &&
      index.documentCount >= index.minimumRequired,
  );

  return { ready, indices };
}
