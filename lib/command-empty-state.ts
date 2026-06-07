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
