import { demoScenario } from "@/lib/data";

export const INTAKE_SESSION_KEY = "stadium-sentinel-intake-complete";

export const DEMO_REPORT_TEXT = demoScenario.inputReport;

export const DEMO_SOURCES = [
  { id: "guest-services", label: "Guest Services System" },
  { id: "security", label: "Security Desk Notes" },
  { id: "facilities", label: "Facilities Tickets" },
  { id: "radio", label: "Radio Log Transcript" },
] as const;

export const PROCESSING_STEPS = [
  "Reading guest services notes...",
  "Checking facilities tickets...",
  "Scanning security updates...",
  "Consolidating reports...",
  "Creating incidents...",
] as const;

export const EXPECTED_INCIDENT_PREVIEW = [
  {
    id: "incident-section-112",
    title: "Section 112 assist",
    priority: "Immediate",
    team: "Guest Services",
  },
  {
    id: "incident-elevator-4",
    title: "Elevator 4 down",
    priority: "High",
    team: "Facilities",
  },
  {
    id: "incident-gate-b",
    title: "Gate B backed up",
    priority: "High",
    team: "Security",
  },
] as const;

export const LANDING_SOURCE_CARDS = [
  "Guest Services",
  "Security",
  "Facilities",
  "Radio / Staff Updates",
] as const;

export const WORKFLOW_STEPS = [
  "Collect",
  "Consolidate",
  "Triage",
  "Dispatch",
  "Track",
  "Report",
] as const;

export function readIntakeComplete(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.sessionStorage.getItem(INTAKE_SESSION_KEY) === "true";
}

export function markIntakeComplete(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.setItem(INTAKE_SESSION_KEY, "true");
}
