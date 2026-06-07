import { demoScenario } from "@/lib/data";

export const INTAKE_SESSION_KEY = "stadium-sentinel-intake-complete";
export const DEMO_SOURCES_CONNECTED_KEY = "stadium-sentinel-demo-sources-connected";
export const OPERATIONS_CONNECTED_KEY = "stadium-sentinel-operations-connected";

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

/**
 * Static fallback preview — shown only when no generated batch exists.
 * Not the active source of truth for intake results; use the pool-generated batch instead.
 */
export const FALLBACK_INCIDENT_PREVIEW = [
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

export function markSourcesConnected(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DEMO_SOURCES_CONNECTED_KEY, "true");
  } catch {
    // fail silently — localStorage unavailable
  }
}

export function readSourcesConnected(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DEMO_SOURCES_CONNECTED_KEY) === "true";
  } catch {
    return false;
  }
}

export function markOperationsConnected(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OPERATIONS_CONNECTED_KEY, "true");
  } catch {
    // fail silently — localStorage unavailable
  }
}

export function readOperationsConnected(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(OPERATIONS_CONNECTED_KEY) === "true";
  } catch {
    return false;
  }
}

export function clearOperationsConnected(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(OPERATIONS_CONNECTED_KEY);
  } catch {
    // fail silently
  }
}

/** Clears real-demo connection flag only. Does not clear demo incident batches. */
export function resetRealDemoConnectionState(): void {
  clearOperationsConnected();
}
