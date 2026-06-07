import type { IncidentPackage, TimelineEntry } from "@/lib/types";

export type ResponseStageId =
  | "intake"
  | "acknowledged"
  | "team-assigned"
  | "dispatched"
  | "resolved";

export type ResponseStageVisualState = "done" | "active" | "pending";

export type ResponseTimelineStage = {
  id: ResponseStageId;
  label: string;
  statusText: string;
  time: string;
  state: ResponseStageVisualState;
};

export type BuildResponseTimelineInput = {
  incidentPackage: IncidentPackage;
  timeline: TimelineEntry[];
  poolTimeline?: string[] | null;
  transcriptLine?: string | null;
};

type PoolLine = {
  time: string;
  message: string;
};

const STAGE_DEFINITIONS: Array<{
  id: ResponseStageId;
  label: string;
}> = [
  { id: "intake", label: "Intake" },
  { id: "acknowledged", label: "Acknowledged" },
  { id: "team-assigned", label: "Team assigned" },
  { id: "dispatched", label: "Dispatched" },
  { id: "resolved", label: "Resolved" },
];

function parsePoolLine(line: string): PoolLine | null {
  const parts = line.split(/\s*[—–-]\s*/);
  if (parts.length < 2) {
    return null;
  }

  return {
    time: parts[0]!.trim(),
    message: parts.slice(1).join(": ").trim(),
  };
}

function findPoolLine(
  poolTimeline: string[] | null | undefined,
  matcher: (message: string) => boolean,
): PoolLine | null {
  if (!poolTimeline) {
    return null;
  }

  for (const line of poolTimeline) {
    const parsed = parsePoolLine(line);
    if (parsed && matcher(parsed.message)) {
      return parsed;
    }
  }

  return null;
}

function buildStageCompletions(input: BuildResponseTimelineInput) {
  const { incidentPackage, timeline, poolTimeline, transcriptLine } = input;
  const { incident } = incidentPackage;
  const incidentTimeline = timeline.filter((entry) => entry.incidentId === incident.id);
  const reportedEntry = incidentTimeline.find((entry) => entry.type === "reported");
  const suggestedEntry = incidentTimeline.find((entry) => entry.type === "suggested");
  const approvedEntries = incidentTimeline.filter((entry) => entry.type === "approved");
  const dispatchApproved = incident.approvedActionIds.includes(`${incident.id}-action-0`);
  const allActionsApproved =
    incident.recommendedActions.length > 0 &&
    incident.recommendedActions.every((_, index) =>
      incident.approvedActionIds.includes(`${incident.id}-action-${index}`),
    );

  const intakePool = findPoolLine(poolTimeline, (message) =>
    /incident created|report received|reported|received/i.test(message),
  );
  const acknowledgedPool = findPoolLine(poolTimeline, (message) =>
    /acknowledged|confirmed|escalation/i.test(message),
  );
  const teamPool = findPoolLine(poolTimeline, (message) =>
    /team|notified|assigned|dispatched to/i.test(message) &&
    !/incident created|report received|reported|received/i.test(message),
  );

  return {
    incident,
    reportedEntry,
    suggestedEntry,
    approvedEntries,
    dispatchApproved,
    allActionsApproved,
    intakePool,
    acknowledgedPool,
    teamPool,
    transcriptLine,
    completed: [
      Boolean(reportedEntry || intakePool || transcriptLine || incident.id),
      Boolean(acknowledgedPool || suggestedEntry),
      Boolean(suggestedEntry || teamPool || incident.assignedRole),
      dispatchApproved,
      allActionsApproved,
    ],
  };
}

function getStageDetails(
  stageId: ResponseStageId,
  context: ReturnType<typeof buildStageCompletions>,
  state: ResponseStageVisualState,
): Pick<ResponseTimelineStage, "statusText" | "time"> {
  const {
    incident,
    reportedEntry,
    suggestedEntry,
    approvedEntries,
    intakePool,
    acknowledgedPool,
    teamPool,
    transcriptLine,
  } = context;

  switch (stageId) {
    case "intake":
      if (state === "done") {
        return {
          statusText:
            transcriptLine !== null && transcriptLine !== undefined
              ? `Radio report received: ${transcriptLine}`
              : intakePool?.message ?? reportedEntry?.message ?? "Report received",
          time: intakePool?.time ?? reportedEntry?.timestamp ?? "Pending",
        };
      }
      return {
        statusText: "Awaiting report intake",
        time: "Pending",
      };
    case "acknowledged":
      if (state === "done") {
        const poolMessage = acknowledgedPool?.message;
        const statusText =
          poolMessage && !/^acknowledged$/i.test(poolMessage)
            ? poolMessage
            : "Operations acknowledged";
        return {
          statusText,
          time: acknowledgedPool?.time ?? suggestedEntry?.timestamp ?? "Pending",
        };
      }
      return {
        statusText: "Awaiting acknowledgment",
        time: "Pending",
      };
    case "team-assigned":
      if (state === "done") {
        return {
          statusText:
            teamPool?.message ??
            suggestedEntry?.message ??
            `${incident.assignedRole} assigned`,
          time: teamPool?.time ?? suggestedEntry?.timestamp ?? "Pending",
        };
      }
      return {
        statusText: "Assign response team",
        time: "Pending",
      };
    case "dispatched":
      if (state === "done") {
        const dispatchEntry =
          approvedEntries.find((entry) => entry.id.endsWith("-approved-0")) ??
          approvedEntries[0];
        return {
          statusText: dispatchEntry?.message ?? "Primary dispatch logged",
          time: dispatchEntry?.timestamp ?? "Pending",
        };
      }
      return {
        statusText: "Awaiting dispatch approval",
        time: "Pending",
      };
    case "resolved":
      if (state === "done") {
        const lastApproved = approvedEntries.at(-1);
        return {
          statusText: "Response steps complete",
          time: lastApproved?.timestamp ?? "Pending",
        };
      }
      return {
        statusText: state === "active" ? "Closing response steps" : "Awaiting resolution",
        time: "Pending",
      };
    default:
      return {
        statusText: "Pending",
        time: "Pending",
      };
  }
}

export function buildResponseTimeline(
  input: BuildResponseTimelineInput,
): ResponseTimelineStage[] {
  const context = buildStageCompletions(input);
  const firstIncomplete = context.completed.findIndex((complete) => !complete);

  return STAGE_DEFINITIONS.map((stage, index) => {
    const isComplete = context.completed[index] ?? false;
    let state: ResponseStageVisualState = "pending";

    if (isComplete) {
      state = "done";
    } else if (firstIncomplete === index) {
      state = "active";
    }

    const details = getStageDetails(stage.id, context, state);

    return {
      id: stage.id,
      label: stage.label,
      statusText: details.statusText,
      time: details.time,
      state,
    };
  });
}
