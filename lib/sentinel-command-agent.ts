import {
  buildDispatchMessage,
  buildFollowUpQuestions,
  type ChangeSummary,
  type DemoReportDraft,
  type IncidentMemorySummary,
} from "@/lib/demo-agent-workflow";
import type { RadioTranscriptRecord } from "@/lib/radio-transcript-intake";
import type { ResponseTimelineStage } from "@/lib/response-timeline";
import { buildSentinelExplanation } from "@/lib/sentinel-explanation";
import type { SourceMode } from "@/lib/source-mode";
import type {
  IncidentPackage,
  ReportSummary,
  TimelineEntry,
} from "@/lib/types";

export type ResponseStage = ResponseTimelineStage;

export type CommandState = {
  incidentPackages: IncidentPackage[];
  selectedIncidentPackage: IncidentPackage | undefined;
  timeline: TimelineEntry[];
  changeSummary: ChangeSummary | null;
  batchGeneratedAt: string | null;
  pullStatus: string | null;
  reportSummary: ReportSummary;
  demoReportDraft: DemoReportDraft;
  demoMemorySummary: IncidentMemorySummary;
  latestTranscript: RadioTranscriptRecord | null;
  transcriptAddedTitles: string[];
  transcriptMatchedTitles: string[];
  selectedResponseStages: ResponseStage[];
  sourceMode: SourceMode | null;
  lastIngestionSummary: string | null;
  sourceAuditExcerpts: string[];
};

export type SentinelContext = {
  explanation: ReturnType<typeof buildSentinelExplanation> | null;
  dispatchMessage: string | null;
  followUpQuestions: string[];
  selectedTimeline: TimelineEntry[];
  queueRank: number | null;
  topIncidentTitle: string | null;
  hasPendingActions: boolean;
};

function normalizeQuestion(question: string): string {
  return question.toLowerCase().trim().replace(/\?+$/, "").replace(/\s+/g, " ");
}

function formatLabel(value: string): string {
  return value.replace(/-/g, " ");
}

function formatTitleList(titles: string[]): string {
  if (titles.length === 0) {
    return "none";
  }

  if (titles.length === 1) {
    return titles[0]!;
  }

  if (titles.length === 2) {
    return `${titles[0]} and ${titles[1]}`;
  }

  return `${titles.slice(0, -1).join(", ")}, and ${titles.at(-1)}`;
}

export function buildSentinelContext(state: CommandState): SentinelContext {
  const selected = state.selectedIncidentPackage;
  const selectedId = selected?.incident.id;

  const queueRank = selectedId
    ? state.incidentPackages.findIndex(({ incident }) => incident.id === selectedId)
    : -1;

  const pendingActions =
    selected &&
    selected.incident.approvedActionIds.length <
      selected.incident.recommendedActions.length;

  return {
    explanation: selected ? buildSentinelExplanation(selected) : null,
    dispatchMessage: selected ? buildDispatchMessage(selected) : null,
    followUpQuestions: selected ? buildFollowUpQuestions(selected) : [],
    selectedTimeline: selectedId
      ? state.timeline.filter((entry) => entry.incidentId === selectedId)
      : [],
    queueRank: queueRank >= 0 ? queueRank + 1 : null,
    topIncidentTitle: state.incidentPackages[0]?.incident.title ?? null,
    hasPendingActions: Boolean(pendingActions),
  };
}

export function buildDefaultSentinelBrief(state: CommandState): string {
  const selected = state.selectedIncidentPackage;
  if (!selected) {
    return "Select an incident to ask Sentinel about the current command state.";
  }

  const { incident } = selected;
  const ctx = buildSentinelContext(state);
  const nextAction =
    ctx.explanation?.nextAction ??
    incident.recommendedActions[0] ??
    "Review the incident package.";

  return `${incident.title} is ${incident.priority} priority at ${incident.locationLabel}. Start with: ${nextAction}`;
}

export function buildSuggestedSentinelQuestions(state: CommandState): string[] {
  const questions: string[] = [
    "What should I do first?",
    "Why this priority?",
    "What evidence supports this?",
  ];

  if (state.sourceAuditExcerpts.length > 0) {
    questions.push("What sources fed this queue?");
  } else if (state.latestTranscript?.extractionStatus === "extracted") {
    questions.push("What did the radio log add?");
    questions.push("What should I ask the radio operator?");
  } else if (state.changeSummary) {
    questions.push("What changed after the latest pull?");
  } else {
    questions.push("Draft a radio update.");
  }

  const ctx = buildSentinelContext(state);
  if (ctx.hasPendingActions) {
    questions.push("What is still unresolved?");
  }

  return questions.slice(0, 5);
}

type QuestionIntent =
  | "transcript-added"
  | "transcript-missing"
  | "transcript-operator"
  | "transcript-staff-update"
  | "transcript-unresolved"
  | "queue-first"
  | "timeline-progress"
  | "do-first"
  | "why-first"
  | "priority"
  | "who-respond"
  | "evidence"
  | "what-changed"
  | "radio"
  | "unresolved"
  | "summary"
  | "ask-staff"
  | "source-history"
  | "unknown";

function classifyQuestion(normalized: string): QuestionIntent {
  if (
    normalized.includes("what did the radio log add") ||
    normalized.includes("radio log add") ||
    (normalized.includes("radio log") && normalized.includes("add"))
  ) {
    return "transcript-added";
  }
  if (
    normalized.includes("missing from the queue") ||
    normalized.includes("mention anything missing") ||
    (normalized.includes("transcript") && normalized.includes("missing"))
  ) {
    return "transcript-missing";
  }
  if (
    normalized.includes("radio operator") ||
    normalized.includes("ask the operator") ||
    normalized.includes("ask radio operator")
  ) {
    return "transcript-operator";
  }
  if (
    normalized.includes("turn this into a staff update") ||
    (normalized.includes("staff update") && normalized.includes("turn"))
  ) {
    return "transcript-staff-update";
  }
  if (normalized.includes("transcript") && normalized.includes("unresolved")) {
    return "transcript-unresolved";
  }
  if (
    normalized.includes("which report needs action first") ||
    normalized.includes("needs action first")
  ) {
    return "queue-first";
  }
  if (
    normalized.includes("where are we on response") ||
    normalized.includes("what stage is this incident") ||
    normalized.includes("response stage") ||
    normalized.includes("timeline progress")
  ) {
    return "timeline-progress";
  }
  if (
    normalized.includes("do first") ||
    normalized.includes("first step") ||
    normalized.includes("should i do first")
  ) {
    return "do-first";
  }
  if (
    normalized.includes("incident first") ||
    normalized.includes("why first") ||
    normalized.includes("top of queue") ||
    normalized.includes("why is this first")
  ) {
    return "why-first";
  }
  if (normalized.includes("priority") || normalized.includes("why this priority")) {
    return "priority";
  }
  if (
    normalized.includes("who respond") ||
    normalized.includes("who should") ||
    normalized.includes("which team")
  ) {
    return "who-respond";
  }
  if (normalized.includes("evidence") || normalized.includes("supports this")) {
    return "evidence";
  }
  if (
    normalized.includes("what changed") ||
    normalized.includes("after pull") ||
    normalized.includes("latest pull")
  ) {
    return "what-changed";
  }
  if (
    normalized.includes("radio") ||
    normalized.includes("dispatch") ||
    normalized.includes("draft")
  ) {
    return "radio";
  }
  if (
    normalized.includes("unresolved") ||
    normalized.includes("still open") ||
    normalized.includes("outstanding")
  ) {
    return "unresolved";
  }
  if (
    normalized.includes("summary") ||
    normalized.includes("current incident") ||
    normalized.includes("show me the")
  ) {
    return "summary";
  }
  if (
    normalized.includes("ask staff") ||
    normalized.includes("follow-up") ||
    normalized.includes("staff question") ||
    (normalized.includes("what should i ask") && !normalized.includes("operator"))
  ) {
    return "ask-staff";
  }
  if (
    normalized.includes("what sources fed") ||
    normalized.includes("source log") ||
    normalized.includes("ingested recently") ||
    normalized.includes("ingestion history")
  ) {
    return "source-history";
  }
  return "unknown";
}

function answerTranscriptAdded(state: CommandState): string {
  const transcript = state.latestTranscript;
  if (!transcript || transcript.extractionStatus !== "extracted") {
    return "Extract a radio transcript first, then ask again about what the radio log added.";
  }

  const added = state.transcriptAddedTitles;
  const matched = state.transcriptMatchedTitles;

  if (added.length === 0 && matched.length > 0) {
    return `The radio log recognized ${formatTitleList(matched)}. All ${matched.length} matched reports already in the current queue.`;
  }

  if (added.length > 0 && matched.length === 0) {
    return `The radio log added ${formatTitleList(added)}.`;
  }

  if (added.length > 0 && matched.length > 0) {
    return `The radio log added ${formatTitleList(added)} and matched ${formatTitleList(matched)} in the current queue.`;
  }

  return "The radio log did not add or match any reports in the current queue.";
}

function answerTranscriptMissing(state: CommandState): string {
  const transcript = state.latestTranscript;
  if (!transcript) {
    return "No radio transcript is loaded yet.";
  }

  if (transcript.extractionStatus === "empty") {
    return transcript.followUpQuestions.length > 0
      ? transcript.followUpQuestions.join(" ")
      : "The transcript did not match any reports in the current queue.";
  }

  const queueIds = new Set(state.incidentPackages.map(({ incident }) => incident.id));
  const missingFromQueue = transcript.extractedIncidentIds.filter((id) => !queueIds.has(id));

  if (missingFromQueue.length === 0) {
    return "Everything recognized in the radio log is represented in the current queue.";
  }

  return `The transcript referenced reports not in the current queue: ${missingFromQueue.join(", ")}.`;
}

function answerTranscriptOperator(state: CommandState, ctx: SentinelContext): string {
  const transcript = state.latestTranscript;
  const questions =
    transcript?.followUpQuestions.length && transcript.extractionStatus === "empty"
      ? transcript.followUpQuestions
      : ctx.followUpQuestions;

  if (questions.length === 0) {
    return "Ask the radio operator for exact location, assigned team, and whether the report is still active.";
  }

  return questions.map((question, index) => `${index + 1}. ${question}`).join(" ");
}

function answerTranscriptStaffUpdate(state: CommandState, ctx: SentinelContext): string {
  const selected = state.selectedIncidentPackage;
  if (!selected) {
    return "Select an incident to draft a staff update.";
  }

  const transcriptLine = state.latestTranscript?.matchedLines[selected.incident.id];
  const baseUpdate = selected.staffUpdate || ctx.dispatchMessage || selected.incident.title;

  if (transcriptLine) {
    return `${baseUpdate} Radio context: ${transcriptLine}`;
  }

  return baseUpdate;
}

function answerTranscriptUnresolved(state: CommandState): string {
  const transcript = state.latestTranscript;
  if (!transcript || transcript.extractionStatus !== "extracted") {
    return "Extract a radio transcript first, then ask again about unresolved transcript items.";
  }

  const queueIds = new Set(state.incidentPackages.map(({ incident }) => incident.id));
  const unresolvedTitles = transcript.extractedIncidentIds
    .filter((id) => queueIds.has(id))
    .map((id) => state.incidentPackages.find(({ incident }) => incident.id === id))
    .filter((incidentPackage): incidentPackage is IncidentPackage => Boolean(incidentPackage))
    .filter(
      ({ incident }) =>
        incident.approvedActionIds.length < incident.recommendedActions.length,
    )
    .map(({ incident }) => incident.title);

  if (unresolvedTitles.length === 0) {
    return "All transcript-linked reports in the current queue have their primary response steps underway or complete.";
  }

  return `Transcript-linked reports still needing response steps: ${formatTitleList(unresolvedTitles)}.`;
}

function answerQueueFirst(state: CommandState): string {
  const top = state.incidentPackages[0];
  if (!top) {
    return "No incidents are loaded in the current queue.";
  }

  return `${top.incident.title} needs action first — ${top.incident.priority} priority at ${top.incident.locationLabel}.`;
}

function answerTimelineProgress(state: CommandState): string {
  const stages = state.selectedResponseStages;
  if (stages.length === 0) {
    return "Select an incident to review response progress.";
  }

  const activeStage = stages.find((stage) => stage.state === "active");
  if (activeStage) {
    return `${activeStage.label} is the active stage — ${activeStage.statusText}.`;
  }

  if (stages.every((stage) => stage.state === "done")) {
    return "All response stages are complete for the selected incident.";
  }

  const nextPending = stages.find((stage) => stage.state === "pending");
  if (nextPending) {
    return `${nextPending.label} is the next pending stage.`;
  }

  return stages.map((stage) => `${stage.label}: ${stage.state}`).join(". ");
}

function answerDoFirst(state: CommandState, ctx: SentinelContext): string {
  const selected = state.selectedIncidentPackage;
  if (!selected || !ctx.explanation) {
    return "Select an incident to get a recommended first step.";
  }

  const { incident } = selected;
  return `${ctx.explanation.nextAction} Assign ${incident.assignedRole} at ${incident.locationLabel}.`;
}

function answerWhyFirst(state: CommandState, ctx: SentinelContext): string {
  const selected = state.selectedIncidentPackage;
  if (!selected) {
    return "No incident is selected.";
  }

  const { incident } = selected;
  if (ctx.queueRank === 1) {
    return `${incident.title} leads the queue because it is ${incident.priority} priority and ranks first in the current command file.`;
  }

  if (ctx.topIncidentTitle) {
    return `${incident.title} is #${ctx.queueRank} in the queue. ${ctx.topIncidentTitle} is first based on current priority ordering.`;
  }

  return `${incident.title} is ranked #${ctx.queueRank} in the current command file.`;
}

function answerPriority(ctx: SentinelContext): string {
  if (!ctx.explanation) {
    return "Select an incident to explain its priority.";
  }
  return ctx.explanation.whyPriority;
}

function answerWhoRespond(ctx: SentinelContext): string {
  if (!ctx.explanation) {
    return "Select an incident to see the assigned team.";
  }
  return ctx.explanation.whyTeam;
}

function answerEvidence(state: CommandState, ctx: SentinelContext): string {
  const selected = state.selectedIncidentPackage;
  if (!selected || !ctx.explanation) {
    return "Select an incident to review supporting evidence.";
  }

  const lead = ctx.explanation.whyEvidence;
  if (selected.evidence.length === 0) {
    return lead;
  }

  const items = selected.evidence
    .slice(0, 3)
    .map((item) => `${item.title}: ${item.excerpt}`)
    .join(" ");

  return `${lead} Evidence on file: ${items}`;
}

function answerWhatChanged(state: CommandState): string {
  if (!state.changeSummary) {
    return "Pull latest reports to refresh command state, then ask again about what changed.";
  }

  return state.changeSummary.lines.join(" ");
}

function answerRadio(ctx: SentinelContext): string {
  if (!ctx.dispatchMessage) {
    return "Select an incident to draft a radio update.";
  }
  return ctx.dispatchMessage;
}

function answerUnresolved(state: CommandState, ctx: SentinelContext): string {
  const selected = state.selectedIncidentPackage;
  if (!selected) {
    return "Select an incident to check open response steps.";
  }

  const { incident } = selected;
  const pending = incident.recommendedActions.filter(
    (_, index) => !incident.approvedActionIds.includes(`${incident.id}-action-${index}`),
  );

  if (pending.length === 0 && incident.status === "actioned") {
    return `${incident.title}: all recommended actions are approved.`;
  }

  if (pending.length > 0) {
    return `${incident.title} still needs: ${pending.join("; ")}.`;
  }

  const globalUnresolved = state.reportSummary.unresolvedItems;
  if (globalUnresolved.length === 0) {
    return "No unresolved response steps across the current command file.";
  }

  return globalUnresolved.join(" ");
}

function answerSummary(state: CommandState, ctx: SentinelContext): string {
  const selected = state.selectedIncidentPackage;
  if (!selected) {
    return "Select an incident for a summary.";
  }

  const { incident, staffUpdate } = selected;
  const staffLine = staffUpdate
    ? ` Staff update: ${staffUpdate.slice(0, 120)}${staffUpdate.length > 120 ? "…" : ""}`
    : "";

  const logLine =
    ctx.selectedTimeline.length > 0
      ? ` Latest log: ${ctx.selectedTimeline[ctx.selectedTimeline.length - 1]?.message}.`
      : "";

  return `${incident.title} · ${incident.priority} priority · ${incident.locationLabel} · ${incident.assignedRole} · ${formatLabel(incident.status)}.${staffLine}${logLine}`;
}

function answerAskStaff(ctx: SentinelContext): string {
  if (ctx.followUpQuestions.length === 0) {
    return "No staff follow-up questions are drafted for this incident.";
  }

  return ctx.followUpQuestions
    .map((question, index) => `${index + 1}. ${question}`)
    .join(" ");
}

function answerSourceHistory(state: CommandState): string {
  const lines: string[] = [];

  if (state.lastIngestionSummary) {
    lines.push(`Latest ingestion: ${state.lastIngestionSummary}`);
  }

  if (state.sourceMode) {
    lines.push(`Current source mode: ${state.sourceMode}.`);
  }

  if (state.sourceAuditExcerpts.length > 0) {
    lines.push(
      `Recent source log: ${state.sourceAuditExcerpts.slice(0, 3).join(" | ")}`,
    );
  }

  if (lines.length === 0) {
    return "No source audit history is recorded yet. Pull latest reports, process a manual report, or extract a radio transcript to populate the source log.";
  }

  return lines.join(" ");
}

export function answerSentinelQuestion(
  question: string,
  state: CommandState,
): { answer: string } {
  const normalized = normalizeQuestion(question);
  if (!normalized) {
    return {
      answer: `${buildDefaultSentinelBrief(state)} Try a suggested question below.`,
    };
  }

  const ctx = buildSentinelContext(state);
  const intent = classifyQuestion(normalized);

  switch (intent) {
    case "transcript-added":
      return { answer: answerTranscriptAdded(state) };
    case "transcript-missing":
      return { answer: answerTranscriptMissing(state) };
    case "transcript-operator":
      return { answer: answerTranscriptOperator(state, ctx) };
    case "transcript-staff-update":
      return { answer: answerTranscriptStaffUpdate(state, ctx) };
    case "transcript-unresolved":
      return { answer: answerTranscriptUnresolved(state) };
    case "queue-first":
      return { answer: answerQueueFirst(state) };
    case "timeline-progress":
      return { answer: answerTimelineProgress(state) };
    case "do-first":
      return { answer: answerDoFirst(state, ctx) };
    case "why-first":
      return { answer: answerWhyFirst(state, ctx) };
    case "priority":
      return { answer: answerPriority(ctx) };
    case "who-respond":
      return { answer: answerWhoRespond(ctx) };
    case "evidence":
      return { answer: answerEvidence(state, ctx) };
    case "what-changed":
      return { answer: answerWhatChanged(state) };
    case "radio":
      return { answer: answerRadio(ctx) };
    case "unresolved":
      return { answer: answerUnresolved(state, ctx) };
    case "summary":
      return { answer: answerSummary(state, ctx) };
    case "ask-staff":
      return { answer: answerAskStaff(ctx) };
    case "source-history":
      return { answer: answerSourceHistory(state) };
    default:
      return {
        answer: `${buildDefaultSentinelBrief(state)} Try a suggested question below.`,
      };
  }
}
