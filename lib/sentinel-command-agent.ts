import {
  buildDispatchMessage,
  buildFollowUpQuestions,
  type ChangeSummary,
  type DemoReportDraft,
  type IncidentMemorySummary,
} from "@/lib/demo-agent-workflow";
import { buildSentinelExplanation } from "@/lib/sentinel-explanation";
import type {
  IncidentPackage,
  ReportSummary,
  TimelineEntry,
} from "@/lib/types";

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

  if (state.changeSummary) {
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
  | "unknown";

function classifyQuestion(normalized: string): QuestionIntent {
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
    normalized.includes("what should i ask")
  ) {
    return "ask-staff";
  }
  return "unknown";
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
    default:
      return {
        answer: `${buildDefaultSentinelBrief(state)} Try a suggested question below.`,
      };
  }
}
