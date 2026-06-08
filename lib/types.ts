export type PriorityLevel = "Immediate" | "High" | "Moderate" | "Monitor";

export type IncidentType =
  | "queue-congestion"
  | "facility-outage"
  | "accessibility-assist";

export type IncidentCategory =
  | "crowd-flow"
  | "facility-outage"
  | "guest-assistance";

export type IncidentStatus = "new" | "ready" | "actioned";

export type TimelineEntryType = "reported" | "suggested" | "approved";

export type ZoneLayer = "perimeter" | "concourse" | "bowl" | "restricted";

export type LocationRecord = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  type:
    | "gate"
    | "screening"
    | "loading-dock"
    | "vip-entry"
    | "circulation"
    | "elevator"
    | "restroom"
    | "first-aid"
    | "amenity"
    | "section"
    | "club"
    | "suite"
    | "press-box"
    | "field"
    | "tunnel"
    | "locker-room"
    | "pitch-perimeter";
  zoneLayer: ZoneLayer;
  priorityZone: string;
  mapX: number;
  mapY: number;
  aliases: string[];
  operationalRisks: string[];
  defaultTeams: string[];
  accessibilityCritical: boolean;
  crowdFlowCritical: boolean;
  restrictedAccess: boolean;
};

export type PolicyRecord = {
  id: string;
  title: string;
  category: string;
  summary: string;
  applicability: string[];
  steps: string[];
  escalationNote: string;
};

export type RunbookRecord = {
  id: string;
  title: string;
  incidentType: IncidentType;
  locationTypes: string[];
  signals: string[];
  recommendedActions: string[];
  ownerRole: string;
};

export type HistoricalIncidentRecord = {
  id: string;
  title: string;
  incidentType: IncidentType;
  locationId: string;
  priority: PriorityLevel;
  summary: string;
  resolution: string;
};

export type StaffRoleRecord = {
  id: string;
  role: string;
  team: string;
  responsibilities: string[];
};

export type StaffResponseRuleRecord = {
  id: string;
  role: string;
  team: string;
  summary: string;
  responseFocus: string[];
};

export type ScenarioRecord = {
  id: string;
  name: string;
  inputReport: string;
  expectedIncidentIds: string[];
};

export type Incident = {
  id: string;
  rawText: string;
  title: string;
  incidentType: IncidentType;
  category: IncidentCategory;
  locationId: string;
  locationLabel: string;
  priority: PriorityLevel;
  status: IncidentStatus;
  assumptions: string[];
  evidenceIds: string[];
  recommendedActions: string[];
  approvedActionIds: string[];
  assignedRole: string;
  details?: IncidentDetails;
};

export type EvidenceSourceType =
  | "policy"
  | "runbook"
  | "historical_incident"
  | "location"
  | "staff_rule"
  | "radio_log";

export type OperationalKnowledgeDocument = {
  id: string;
  sourceType: EvidenceSourceType;
  title: string;
  excerpt: string;
  body: string;
  rationale: string;
  incidentTypes: IncidentType[];
  categories: IncidentCategory[];
  locationIds: string[];
  locationNames: string[];
  priorityLevels: PriorityLevel[];
  terms: string[];
};

export type EvidenceResult = {
  title: string;
  sourceType: EvidenceSourceType;
  excerpt: string;
  rationale: string;
  sourceId: string;
  // Optional richer, incident-specific fields surfaced when Elastic seed data
  // carries them. Existing renderers keep working when these are absent.
  sourceLabel?: string;
  observedSignal?: string;
  operationalMeaning?: string;
  actionImplication?: string;
};

export type IncidentLogEvent = {
  eventId: string;
  eventTime: string;
  eventType: string;
  title: string;
  detail: string;
  actorLabel: string;
};

export type SourceLogEvent = {
  sourceEventId: string;
  sourceType: string;
  sourceLabel: string;
  title: string;
  detail: string;
  memoryAction: string;
};

export type OperationsTimelineEvent = {
  eventId: string;
  eventTime: string;
  title: string;
  detail: string;
};

export type ReportDraftSeed = {
  headline: string;
  situation: string;
  actionsTaken: string;
  currentStatus: string;
  nextSteps: string;
  operatorNote?: string;
};

// Rich, incident-specific operational content. Additive and fully optional:
// transformation passes it straight through and panels fall back to the
// existing generic behavior whenever a field is absent.
export type IncidentDetails = {
  operatorSummary?: string;
  operationalImplication?: string;
  responseChecklist?: string[];
  evidenceItems?: EvidenceResult[];
  incidentLog?: IncidentLogEvent[];
  sourceLog?: SourceLogEvent[];
  operationsTimeline?: OperationsTimelineEvent[];
  reportDraftSeed?: ReportDraftSeed;
  staffUpdateSeed?: string;
};

export type RetrievalInput = {
  incidentTitle: string;
  incidentCategory: string;
  locationName: string;
  priority: PriorityLevel;
  reportText: string;
};

export type RetrievalContext = {
  evidence: EvidenceResult[];
  mode: "elastic" | "local";
};

export type IncidentPackage = {
  incident: Incident;
  evidence: EvidenceResult[];
  staffUpdate: string;
};

export type TimelineEntry = {
  id: string;
  incidentId: string;
  timestamp: string;
  type: TimelineEntryType;
  message: string;
  actor: string;
};

export type ReportSummary = {
  headline: string;
  unresolvedItems: string[];
  recommendations: string[];
  markdown: string;
};

export type AgentRunMeta = {
  retrievalMode: "elastic" | "local";
  geminiMode: "live" | "fallback";
  elasticMcpMode: "unused";
};

export type AgentRunResult = {
  report: string;
  incidentPackages: IncidentPackage[];
  timeline: TimelineEntry[];
  reportSummary: ReportSummary;
  meta: AgentRunMeta;
};

export type StadiumPlaybookDocument = {
  id: string;
  title: string;
  procedureType: string;
  incidentTypes: IncidentType[];
  locationIds: string[];
  teams: string[];
  riskTags: string[];
  excerpt: string;
  body: string;
  searchText: string;
};

export type StadiumLocationMemoryDocument = {
  id: string;
  label: string;
  aliases: string[];
  zoneLayer: string;
  defaultTeams: string[];
  operationalRisks: string[];
  accessibilityCritical: boolean;
  crowdFlowCritical: boolean;
  searchText: string;
};

export type StadiumIncidentExampleDocument = {
  id: string;
  messyReport: string;
  expectedIncidentIds: string[];
  expectedSeverities: PriorityLevel[];
  expectedActions: string[];
  expectedTitles: string[];
  searchText: string;
};

export type StadiumEvidenceMemoryDocument = {
  id: string;
  sourceType: string;
  locationIds: string[];
  incidentHints: string[];
  excerpt: string;
  body: string;
  searchText: string;
};

export type AgentContextSearchInput = {
  report: string;
  incidents: Array<
    Pick<
      Incident,
      "id" | "title" | "category" | "locationId" | "locationLabel" | "priority"
    >
  >;
};

export type AgentRetrievalBundle = {
  playbooks: StadiumPlaybookDocument[];
  locations: StadiumLocationMemoryDocument[];
  incidentExamples: StadiumIncidentExampleDocument[];
  evidence: StadiumEvidenceMemoryDocument[];
};

export type AgentRetrievalResult = AgentRetrievalBundle & {
  mode: "elastic" | "local";
};

export type AgentJsonIncident = {
  id: string;
  title: string;
  queueTitle: string;
  severity: PriorityLevel;
  locationId: string;
  locationLabel: string;
  venueLayer: string;
  team: string;
  riskTags: string[];
  recommendedActions: string[];
  priorityRationale: string;
  evidence: string[];
};

export type AgentJsonResponse = {
  incidents: AgentJsonIncident[];
  latestUpdate: string;
  reportSummary: string;
};

export type ValidatedAgentIncident = AgentJsonIncident & {
  normalizedTeam: string;
};

export type ValidatedAgentResponse = {
  incidents: ValidatedAgentIncident[];
  latestUpdate: string;
  reportSummary: string;
};


export type StadiumIncidentMemoryDocument = {
  timestamp: string;
  incidentId: string;
  title: string;
  locationId: string;
  locationLabel: string;
  team: string;
  priority: string;
  status: string;
  summary: string;
  approvedActionIds: string[];
  evidenceRefs: string[];
  source: string;
};

export type BoundedEsqlOperation = 
  | "count_by_priority"
  | "count_by_team"
  | "recent_by_location";
