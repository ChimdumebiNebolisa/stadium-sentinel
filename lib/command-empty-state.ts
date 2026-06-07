import type { IncidentPackage, ReportSummary, TimelineEntry } from "@/lib/types";

export type CommandInitialState = {
  report: string;
  incidentPackages: IncidentPackage[];
  timeline: TimelineEntry[];
  reportSummary: ReportSummary;
};

export function buildEmptyCommandState(): CommandInitialState {
  return {
    report: "",
    incidentPackages: [],
    timeline: [],
    reportSummary: {
      headline: "Awaiting operations data",
      unresolvedItems: [],
      recommendations: [],
      markdown: "# Awaiting operations data\n\nConnect stadium operations data, then pull latest reports.",
    },
  };
}

export function getRealDemoQueueEmptyMessage(operationsConnected: boolean): string {
  if (!operationsConnected) {
    return "No operations data connected. Connect stadium operations data to load current incidents from Elastic.";
  }

  return "Operations data connected. Pull latest reports to load incidents from Elastic.";
}

export function getRealDemoWorkspaceEmptyTitle(operationsConnected: boolean): string {
  if (!operationsConnected) {
    return "No operations data connected";
  }

  return "No incidents loaded yet";
}

export function getRealDemoWorkspaceEmptyBody(operationsConnected: boolean): string {
  if (!operationsConnected) {
    return "Connect stadium operations data, then pull latest reports to load the dispatch queue.";
  }

  return "Pull latest reports to load current stadium operations incidents from Elastic.";
}
