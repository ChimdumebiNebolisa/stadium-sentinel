import historicalIncidents from "@/data/historical-incidents.json";
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

export const demoScenario = scenarioRecords[0];
