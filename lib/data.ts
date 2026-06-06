import historicalIncidents from "@/data/historical-incidents.json";
import stadiumEvidence from "@/data/elastic/stadium_evidence.json";
import stadiumIncidentExamples from "@/data/elastic/stadium_incident_examples.json";
import stadiumPlaybooks from "@/data/elastic/stadium_playbooks.json";
import locations from "@/data/locations.json";
import policies from "@/data/policies.json";
import runbooks from "@/data/runbooks.json";
import scenarios from "@/data/scenarios.json";
import staffResponseRules from "@/data/staff-response-rules.json";
import staffRoles from "@/data/staff-roles.json";
import operationalKnowledge from "@/data/operational-knowledge.json";
import type {
  HistoricalIncidentRecord,
  LocationRecord,
  OperationalKnowledgeDocument,
  PolicyRecord,
  RunbookRecord,
  ScenarioRecord,
  StadiumEvidenceMemoryDocument,
  StadiumIncidentExampleDocument,
  StadiumPlaybookDocument,
  StaffResponseRuleRecord,
  StaffRoleRecord,
} from "@/lib/types";

export const locationRecords = locations as LocationRecord[];
export const policyRecords = policies as PolicyRecord[];
export const runbookRecords = runbooks as RunbookRecord[];
export const historicalRecords = historicalIncidents as HistoricalIncidentRecord[];
export const staffRoleRecords = staffRoles as StaffRoleRecord[];
export const staffResponseRuleRecords =
  staffResponseRules as StaffResponseRuleRecord[];
export const operationalKnowledgeRecords =
  operationalKnowledge as OperationalKnowledgeDocument[];
export const scenarioRecords = scenarios as ScenarioRecord[];
export const stadiumPlaybookRecords =
  stadiumPlaybooks as StadiumPlaybookDocument[];
export const stadiumIncidentExampleRecords =
  stadiumIncidentExamples as StadiumIncidentExampleDocument[];
export const stadiumEvidenceRecords =
  stadiumEvidence as StadiumEvidenceMemoryDocument[];

export const demoScenario = scenarioRecords[0];

export function getLocationRecord(locationId: string): LocationRecord | undefined {
  return locationRecords.find((location) => location.id === locationId);
}
