import type {
  IncidentCategory,
  IncidentDetails,
  IncidentPackage,
  IncidentStatus,
  IncidentType,
  PriorityLevel,
  ReportSummary,
  TimelineEntry,
  TimelineEntryType,
} from "@/lib/types";

export type ElasticActiveIncident = {
  id: string;
  title: string;
  rawText: string;
  category: IncidentCategory;
  incidentType: IncidentType;
  priority: PriorityLevel;
  locationId: string;
  locationLabel: string;
  assignedRole: string;
  status: IncidentStatus;
  reportedAt: string;
  evidenceIds?: string[];
  guestAssistanceId?: string;
  facilityStatusId?: string;
  details?: IncidentDetails;
  searchText: string;
};

export type ElasticGuestAssistanceRequest = {
  id: string;
  guestLocation: string;
  need: string;
  priority: PriorityLevel;
  relatedIncidentId: string;
  locationId: string;
  status: "open" | "assigned" | "resolved";
  requestedAt: string;
  assignedRole?: string;
  searchText: string;
};

export type ElasticFacilityStatus = {
  id: string;
  assetId: string;
  assetLabel: string;
  status: "operational" | "degraded" | "down";
  relatedIncidentId?: string;
  locationId: string;
  lastCheckedAt: string;
  notes?: string;
  searchText: string;
};

export type ElasticGateFlowLog = {
  id: string;
  gateId: string;
  gateLabel: string;
  observation: string;
  priority: PriorityLevel;
  relatedIncidentId?: string;
  loggedAt: string;
  source: "radio_log" | "sensor" | "staff_note";
  searchText: string;
};

export type ElasticStaffRosterEntry = {
  id: string;
  roleId: string;
  team: string;
  callSign: string;
  displayName: string;
  onDuty: boolean;
  zone?: string;
  relatedIncidentIds?: string[];
  searchText: string;
};

export type ElasticPolicyDocument = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  appliesToCategories: IncidentCategory[];
  procedureType?: string;
  teams?: string[];
  searchText: string;
};

export type ElasticRadioTranscript = {
  id: string;
  presetId?: string;
  label: string;
  lines: string[];
  excerpt: string;
  recordedAt: string;
  matchedIncidentHints: string[];
  relatedIncidentIds?: string[];
  searchText: string;
};

export type ElasticEvidenceDocument = {
  id: string;
  sourceType: string;
  locationIds: string[];
  incidentHints: string[];
  excerpt: string;
  body: string;
  searchText: string;
};

export type ElasticDispatchTimelineEntry = {
  id: string;
  incidentId: string;
  timestamp: string;
  type: TimelineEntryType;
  message: string;
  actor: string;
  source: "operator" | "sentinel" | "system";
  recommendedActionId?: string;
  searchText?: string;
};

export type ElasticPullRelatedContext = {
  guestAssistance: ElasticGuestAssistanceRequest[];
  facilityStatus: ElasticFacilityStatus[];
  gateFlowLogs: ElasticGateFlowLog[];
  staffRoster: ElasticStaffRosterEntry[];
  policies: ElasticPolicyDocument[];
  radioTranscripts: ElasticRadioTranscript[];
  evidence: ElasticEvidenceDocument[];
};

export type IngestPullRequest = {
  includeTimeline?: boolean;
  transcriptContext?: boolean;
};

export type IngestPullResponse = {
  sourceMode: "elastic" | "demo";
  outcome: "success" | "fallback";
  ingestionSummary: string;
  incidentPackages: IncidentPackage[];
  timeline: TimelineEntry[];
  reportSummary: ReportSummary;
  meta: {
    pulledAt: string;
    incidentCount: number;
    elasticQuery?: string;
  };
};
