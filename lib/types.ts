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

export type LocationRecord = {
  id: string;
  name: string;
  type: "gate" | "section" | "elevator" | "restroom" | "desk";
  label: string;
  mapX: number;
  mapY: number;
  priorityZone: string;
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
};

export type EvidenceSourceType =
  | "policy"
  | "runbook"
  | "historical_incident"
  | "location"
  | "staff_rule";

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
