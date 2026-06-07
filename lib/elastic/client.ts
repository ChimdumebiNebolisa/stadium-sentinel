type ElasticConfig = {
  apiKey: string;
  evidenceIndex: string;
  locationsIndex: string;
  playbooksIndex: string;
  url: string;
  incidentExamplesIndex: string;
  incidentMemoryIndex: string;
  activeIncidentsIndex: string;
  guestAssistanceIndex: string;
  facilityStatusIndex: string;
  gateFlowLogsIndex: string;
  staffRosterIndex: string;
  policiesIndex: string;
  radioTranscriptsIndex: string;
  dispatchTimelineIndex: string;
};

function getEnvValue(name: string): string {
  return process.env[name]?.trim() ?? "";
}

function getIndexName(envKey: string, defaultName: string): string {
  return getEnvValue(envKey) || defaultName;
}

export function getElasticConfig(): ElasticConfig | null {
  const url = getEnvValue("ELASTICSEARCH_URL");
  const apiKey =
    getEnvValue("ELASTICSEARCH_API_KEY") || getEnvValue("ELASTIC_API_KEY");
  const playbooksIndex = getIndexName(
    "ELASTICSEARCH_PLAYBOOKS_INDEX",
    "stadium_playbooks",
  );
  const locationsIndex = getIndexName(
    "ELASTICSEARCH_LOCATIONS_INDEX",
    "stadium_locations",
  );
  const incidentExamplesIndex = getIndexName(
    "ELASTICSEARCH_INCIDENT_EXAMPLES_INDEX",
    "stadium_incident_examples",
  );
  const evidenceIndex = getIndexName(
    "ELASTICSEARCH_EVIDENCE_INDEX",
    "stadium_evidence",
  );
  const incidentMemoryIndex = getIndexName(
    "ELASTICSEARCH_INCIDENT_MEMORY_INDEX",
    "stadium_incident_memory",
  );
  const activeIncidentsIndex = getIndexName(
    "ELASTICSEARCH_ACTIVE_INCIDENTS_INDEX",
    "stadium_active_incidents",
  );
  const guestAssistanceIndex = getIndexName(
    "ELASTICSEARCH_GUEST_ASSISTANCE_INDEX",
    "stadium_guest_assistance",
  );
  const facilityStatusIndex = getIndexName(
    "ELASTICSEARCH_FACILITY_STATUS_INDEX",
    "stadium_facility_status",
  );
  const gateFlowLogsIndex = getIndexName(
    "ELASTICSEARCH_GATE_FLOW_LOGS_INDEX",
    "stadium_gate_flow_logs",
  );
  const staffRosterIndex = getIndexName(
    "ELASTICSEARCH_STAFF_ROSTER_INDEX",
    "stadium_staff_roster",
  );
  const policiesIndex = getIndexName(
    "ELASTICSEARCH_POLICIES_INDEX",
    "stadium_policies",
  );
  const radioTranscriptsIndex = getIndexName(
    "ELASTICSEARCH_RADIO_TRANSCRIPTS_INDEX",
    "stadium_radio_transcripts",
  );
  const dispatchTimelineIndex = getIndexName(
    "ELASTICSEARCH_DISPATCH_TIMELINE_INDEX",
    "stadium_dispatch_timeline",
  );

  if (!url || !apiKey) {
    return null;
  }

  return {
    apiKey,
    evidenceIndex,
    incidentExamplesIndex,
    incidentMemoryIndex,
    locationsIndex,
    playbooksIndex,
    url: url.replace(/\/+$/, ""),
    activeIncidentsIndex,
    guestAssistanceIndex,
    facilityStatusIndex,
    gateFlowLogsIndex,
    staffRosterIndex,
    policiesIndex,
    radioTranscriptsIndex,
    dispatchTimelineIndex,
  };
}

export function isElasticConfigured(): boolean {
  return getElasticConfig() !== null;
}

export async function elasticFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const config = getElasticConfig();

  if (!config) {
    throw new Error("Elastic configuration is incomplete.");
  }

  const headers = new Headers(init.headers);
  headers.set("Authorization", `ApiKey ${config.apiKey}`);
  headers.set("Content-Type", "application/json");

  return fetch(`${config.url}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });
}
