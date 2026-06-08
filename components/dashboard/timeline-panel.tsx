import type { SentinelActionTrace } from "@/components/dashboard/sentinel-inline";
import type { IncidentPackage, TimelineEntry } from "@/lib/types";

type IncidentLogState = "done" | "pending";

type IncidentLogEntry = {
  id: string;
  label: string;
  detail: string;
  time: string;
  state: IncidentLogState;
};

type TimelinePanelProps = {
  incidentPackage?: IncidentPackage | null;
  timeline: TimelineEntry[];
  activeWorkspace?: "evidence" | "staff" | "timeline" | "report" | "source" | null;
  reportDraft?: string;
  sentinelActionTrace?: SentinelActionTrace | null;
};

function buildIncidentLogEntries(input: {
  incidentPackage: IncidentPackage;
  timeline: TimelineEntry[];
  activeWorkspace?: TimelinePanelProps["activeWorkspace"];
  reportDraft?: string;
  sentinelActionTrace?: SentinelActionTrace | null;
}): IncidentLogEntry[] {
  const { incidentPackage, timeline, activeWorkspace, reportDraft, sentinelActionTrace } = input;
  const { incident } = incidentPackage;
  // Prefer seeded, incident-specific log copy when present, keyed by eventType.
  const seededLog = incident.details?.incidentLog ?? [];
  const seeded = (eventType: string) =>
    seededLog.find((entry) => entry.eventType === eventType);
  const reportedEntry = timeline.find(
    (entry) => entry.incidentId === incident.id && entry.type === "reported",
  );
  const suggestedEntry = timeline.find(
    (entry) => entry.incidentId === incident.id && entry.type === "suggested",
  );
  const approvedEntries = timeline.filter(
    (entry) => entry.incidentId === incident.id && entry.type === "approved",
  );
  const hasEvidenceOpen =
    activeWorkspace === "evidence" ||
    sentinelActionTrace?.selectedAction.toLowerCase().includes("evidence") ||
    incidentPackage.evidence.length > 0;
  const hasReportDraft =
    activeWorkspace === "report" ||
    Boolean(reportDraft?.trim()) ||
    sentinelActionTrace?.selectedAction.toLowerCase().includes("report");
  const hasWriteback =
    Boolean(sentinelActionTrace?.writebackStatus) || approvedEntries.length > 0;

  return [
    {
      id: "source-received",
      label: "Source received",
      detail:
        seeded("source_received")?.detail ??
        reportedEntry?.message ??
        `Source received for ${incident.title}.`,
      time: seeded("source_received")?.eventTime ?? reportedEntry?.timestamp ?? "Pending",
      state: "done",
    },
    {
      id: "incident-created",
      label: "Incident created",
      detail:
        seeded("incident_created")?.detail ??
        `${incident.title} queued from ${incident.locationLabel}.`,
      time: seeded("incident_created")?.eventTime ?? reportedEntry?.timestamp ?? "Pending",
      state: "done",
    },
    {
      id: "team-assigned",
      label: "Team assigned",
      detail:
        seeded("team_assigned")?.detail ??
        `${incident.assignedRole} assigned to the selected incident.`,
      time: seeded("team_assigned")?.eventTime ?? suggestedEntry?.timestamp ?? "Pending",
      state: "done",
    },
    {
      id: "evidence-opened",
      label: "Sentinel evidence opened",
      detail: hasEvidenceOpen
        ? `Evidence reviewed for ${incident.title}.`
        : "Open Evidence to review the operational support path.",
      time: hasEvidenceOpen ? suggestedEntry?.timestamp ?? "Now" : "Pending",
      state: hasEvidenceOpen ? "done" : "pending",
    },
    {
      id: "report-drafted",
      label: "Report drafted",
      detail: hasReportDraft
        ? "Editable report field populated for review."
        : "Write a report to populate the editable report field.",
      time: hasReportDraft ? "Now" : "Pending",
      state: hasReportDraft ? "done" : "pending",
    },
    {
      id: "dispatch-approved",
      label: "Dispatch approved",
      detail: approvedEntries.at(-1)?.message ?? "Awaiting dispatch approval.",
      time: approvedEntries.at(-1)?.timestamp ?? "Pending",
      state: approvedEntries.length > 0 ? "done" : "pending",
    },
    {
      id: "writeback-completed",
      label: "Write-back completed",
      detail: hasWriteback
        ? sentinelActionTrace?.writebackStatus ?? "Write-back recorded in the command file."
        : "Awaiting dispatch write-back.",
      time: hasWriteback ? approvedEntries.at(-1)?.timestamp ?? "Now" : "Pending",
      state: hasWriteback ? "done" : "pending",
    },
  ];
}

function getStateStyles(state: IncidentLogState): string {
  return state === "done"
    ? "border-emerald-500/25 bg-emerald-500/8 text-emerald-800"
    : "border-slate-200 bg-slate-50 text-slate-500";
}

export function TimelinePanel({
  incidentPackage,
  timeline,
  activeWorkspace,
  reportDraft,
  sentinelActionTrace,
}: TimelinePanelProps) {
  if (!incidentPackage) {
    return (
      <section className="h-full pr-2" data-testid="timeline-panel">
        <div className="mb-2">
          <h2 className="ops-heading">Incident log</h2>
          <p className="mt-0.5 text-xs text-slate-600">
            Selected incident sequence appears here.
          </p>
        </div>
        <p className="py-3 text-sm text-slate-500" data-testid="timeline-empty-state">
          No incident is selected.
        </p>
      </section>
    );
  }

  const entries = buildIncidentLogEntries({
    incidentPackage,
    timeline,
    activeWorkspace,
    reportDraft,
    sentinelActionTrace,
  });

  return (
    <section className="h-full pr-2" data-testid="timeline-panel">
      <div className="mb-2">
        <h2 className="ops-heading">Incident log</h2>
        <p className="mt-0.5 text-xs text-slate-600">
          Selected incident sequence for {incidentPackage.incident.title}.
        </p>
      </div>
      <div className="space-y-2">
        {entries.map((entry) => (
          <article
            key={entry.id}
            className={`rounded-lg border px-3 py-2 ${getStateStyles(entry.state)}`}
            data-testid={`incident-log-entry-${entry.id}`}
            data-state={entry.state}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-medium uppercase tracking-[0.03em]">
              <span>{entry.label}</span>
              <span>{entry.time}</span>
            </div>
            <p className="mt-1.5 text-sm leading-6 text-[#07111c]">{entry.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
