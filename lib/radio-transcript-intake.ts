import {
  DEMO_INCIDENT_POOL,
  getPoolIncidentById,
  type DemoIncidentBatch,
  type DemoStoredIncident,
} from "@/lib/demo-incident-pool";
import { comparePriority } from "@/lib/priority";
import type { EvidenceResult, IncidentPackage, PriorityLevel, TimelineEntry } from "@/lib/types";

export const RADIO_TRANSCRIPT_KEY = "stadium-sentinel-radio-transcript";

export type RadioTranscriptSourceLabel = "Radio Log" | "Manual paste" | "Preset";

export type LogSnippet = {
  incidentId: string;
  line: string;
  timestamp: string;
};

export type RadioTranscriptRecord = {
  id: string;
  text: string;
  sourceLabel: RadioTranscriptSourceLabel;
  presetId?: string;
  createdAt: string;
  extractionStatus: "idle" | "extracted" | "empty";
  extractedIncidentIds: string[];
  addedIncidentIds: string[];
  matchedIncidentIds: string[];
  extractionSummary: string | null;
  followUpQuestions: string[];
  logSnippets: LogSnippet[];
  matchedLines: Record<string, string>;
};

export type TranscriptExtractionResult = {
  record: RadioTranscriptRecord;
  addedIncidents: DemoStoredIncident[];
  matchedIncidentIds: string[];
  addedIds: string[];
  skippedLineCount: number;
};

export type TranscriptPreset = {
  id: string;
  label: string;
  text: string;
};

export const TRANSCRIPT_PRESETS: TranscriptPreset[] = [
  {
    id: "standard",
    label: "Standard ops preset",
    text: [
      "Gate B is backed up.",
      "Elevator 4 is down.",
      "Guest near Section 112 needs wheelchair access.",
    ].join("\n"),
  },
  {
    id: "restroom",
    label: "Restroom outage line",
    text: "West Concourse restroom is out of order.",
  },
];

type TranscriptPattern = {
  incidentId: string;
  matcher: RegExp;
};

const TRANSCRIPT_PATTERNS: TranscriptPattern[] = [
  {
    incidentId: "incident-gate-b",
    matcher: /\bgate\s*b\b.*\b(backed up|queue|congestion|bottleneck)\b|\b(backed up|queue|congestion|bottleneck)\b.*\bgate\s*b\b/i,
  },
  {
    incidentId: "incident-elevator-4",
    matcher: /\belevator\s*4\b.*\b(down|out(?:age)?|offline|stuck)\b|\b(down|out(?:age)?|offline|stuck)\b.*\belevator\s*4\b/i,
  },
  {
    incidentId: "incident-section-112",
    matcher:
      /\bsection\s*112\b.*\b(wheelchair|accessible support|accessibility help|mobility assist)\b|\b(wheelchair|accessible support|accessibility help|mobility assist)\b.*\bsection\s*112\b/i,
  },
  {
    incidentId: "incident-restroom-outage",
    matcher: /\brestroom\b.*\bout of order\b|\bout of order\b.*\brestroom\b/i,
  },
  {
    incidentId: "incident-aisle-spill",
    matcher: /\bspill\b.*\baisle\b|\baisle\b.*\bspill\b/i,
  },
  {
    incidentId: "incident-lost-child",
    matcher: /\blost child\b|\bchild separated\b/i,
  },
  {
    incidentId: "incident-freezer-alarm",
    matcher: /\bfreezer\b.*\balarm\b|\bconcession\b.*\balarm\b/i,
  },
  {
    incidentId: "incident-north-concourse",
    matcher: /\bnorth concourse\b.*\b(crowd|congestion|backing up)\b/i,
  },
  {
    incidentId: "incident-medical-assist",
    matcher: /\bmedical assist\b|\bmedical response\b|\bdizziness\b/i,
  },
  {
    incidentId: "incident-blocked-aisle",
    matcher: /\bblocked aisle\b|\baisle blocked\b/i,
  },
];

const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  Immediate: 0,
  High: 1,
  Moderate: 2,
  Monitor: 3,
};

const EMPTY_FOLLOW_UPS = [
  "Did the transcript mention Gate B, Elevator 4, or Section 112?",
  "Try the standard ops preset or add location and team details.",
];

function hashLine(value: string): string {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16);
}

function sortStoredIncidents(incidents: DemoStoredIncident[]): DemoStoredIncident[] {
  return [...incidents].sort(
    (left, right) => PRIORITY_ORDER[left.priority] - PRIORITY_ORDER[right.priority],
  );
}

function matchLineToIncidentId(line: string): string | null {
  const pattern = TRANSCRIPT_PATTERNS.find(({ matcher }) => matcher.test(line));
  return pattern?.incidentId ?? null;
}

function splitTranscriptLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export function buildExtractionStatusMessage(addedCount: number, matchedCount: number): string {
  if (addedCount === 0 && matchedCount === 0) {
    return "No reports matched this transcript. Try a preset or add location and team details.";
  }

  if (addedCount === 0) {
    return `Radio transcript processed. ${matchedCount} reports matched in the current queue.`;
  }

  if (matchedCount === 0) {
    return `Radio transcript processed. ${addedCount} new report${addedCount === 1 ? "" : "s"} added.`;
  }

  return `Radio transcript processed. ${addedCount} new report${addedCount === 1 ? "" : "s"} added. ${matchedCount} reports matched in the current queue.`;
}

export function buildExtractionSummary(
  addedIncidents: DemoStoredIncident[],
  matchedIncidentIds: string[],
): string | null {
  const parts: string[] = [];

  if (addedIncidents.length > 0) {
    parts.push(`New reports added: ${addedIncidents.map((incident) => incident.title).join(", ")}`);
  }

  if (matchedIncidentIds.length > 0) {
    const matchedTitles = matchedIncidentIds
      .map((id) => getPoolIncidentById(id)?.title ?? id)
      .join(", ");
    parts.push(`Reports matched in current queue: ${matchedTitles}`);
  }

  return parts.length > 0 ? parts.join(". ") : null;
}

function createRecordId(): string {
  return `radio-transcript-${Date.now()}`;
}

function formatSnippetTimestamp(index: number): string {
  const minute = 20 + index;
  return `20:${minute.toString().padStart(2, "0")}`;
}

export function filterSnippetsForActiveQueue(
  snippets: LogSnippet[],
  activeIncidentIds: Set<string>,
): LogSnippet[] {
  return snippets.filter((snippet) => activeIncidentIds.has(snippet.incidentId));
}

export function buildTranscriptTimelineEntries(
  incidentId: string,
  matchedLine: string,
  isNewlyAdded: boolean,
  existingTimeline: TimelineEntry[],
  timestampOffset: number,
): TimelineEntry[] {
  const existingIds = new Set(existingTimeline.map((entry) => entry.id));
  const entries: TimelineEntry[] = [];
  const lineHash = hashLine(matchedLine);
  const reportEntryId = `${incidentId}-radio-${lineHash}`;
  const recognizedEntryId = `${incidentId}-radio-recognized`;

  if (!existingIds.has(reportEntryId)) {
    entries.push({
      id: reportEntryId,
      incidentId,
      timestamp: formatSnippetTimestamp(timestampOffset),
      type: "reported",
      message: `Radio report received: ${matchedLine}`,
      actor: "Radio Log",
    });
  }

  if (isNewlyAdded && !existingIds.has(recognizedEntryId)) {
    entries.push({
      id: recognizedEntryId,
      incidentId,
      timestamp: formatSnippetTimestamp(timestampOffset + 1),
      type: "reported",
      message: "Incident recognized from radio log",
      actor: "Stadium Sentinel",
    });
  }

  return entries;
}

export function appendTranscriptTimelineEntries(
  existingTimeline: TimelineEntry[],
  snippets: LogSnippet[],
  matchedLines: Record<string, string>,
  addedIds: string[],
): TimelineEntry[] {
  const addedIdSet = new Set(addedIds);
  let nextTimeline = [...existingTimeline];
  let offset = existingTimeline.length;

  for (const snippet of snippets) {
    const entries = buildTranscriptTimelineEntries(
      snippet.incidentId,
      matchedLines[snippet.incidentId] ?? snippet.line,
      addedIdSet.has(snippet.incidentId),
      nextTimeline,
      offset,
    );
    nextTimeline = [...nextTimeline, ...entries];
    offset += entries.length;
  }

  return nextTimeline;
}

export function enrichPackageWithRadioEvidence(
  incidentPackage: IncidentPackage,
  matchedLine: string,
): IncidentPackage {
  const excerpt = matchedLine.trim();
  if (!excerpt) {
    return incidentPackage;
  }

  const alreadyPresent = incidentPackage.evidence.some(
    (item) => item.sourceType === "radio_log" && item.excerpt === excerpt,
  );

  if (alreadyPresent) {
    return incidentPackage;
  }

  const radioEvidence: EvidenceResult = {
    title: "Radio log excerpt",
    sourceType: "radio_log",
    excerpt,
    rationale: "Matched from the current radio transcript.",
    sourceId: `${incidentPackage.incident.id}-radio-${hashLine(excerpt)}`,
  };

  return {
    ...incidentPackage,
    evidence: [...incidentPackage.evidence, radioEvidence],
  };
}

export function enrichPackagesWithTranscriptEvidence(
  incidentPackages: IncidentPackage[],
  matchedLines: Record<string, string>,
  recognizedIds: string[],
): IncidentPackage[] {
  const recognizedSet = new Set(recognizedIds);

  return incidentPackages.map((incidentPackage) => {
    if (!recognizedSet.has(incidentPackage.incident.id)) {
      return incidentPackage;
    }

    const matchedLine = matchedLines[incidentPackage.incident.id];
    if (!matchedLine) {
      return incidentPackage;
    }

    return enrichPackageWithRadioEvidence(incidentPackage, matchedLine);
  });
}

export function sortIncidentPackages(packages: IncidentPackage[]): IncidentPackage[] {
  return [...packages].sort((left, right) =>
    comparePriority(left.incident, right.incident),
  );
}

export function extractTranscriptIncidents(input: {
  text: string;
  activeIncidentIds: string[];
  sourceLabel: RadioTranscriptSourceLabel;
  presetId?: string;
}): TranscriptExtractionResult {
  const activeIdSet = new Set(input.activeIncidentIds);
  const lines = splitTranscriptLines(input.text);
  const matchedLines: Record<string, string> = {};
  const matchedIncidentIds: string[] = [];
  const addedIncidents: DemoStoredIncident[] = [];
  const addedIds: string[] = [];
  const extractedIncidentIds: string[] = [];
  let skippedLineCount = 0;

  for (const line of lines) {
    const incidentId = matchLineToIncidentId(line);
    if (!incidentId) {
      skippedLineCount += 1;
      continue;
    }

    matchedLines[incidentId] = line;

    if (activeIdSet.has(incidentId)) {
      if (!matchedIncidentIds.includes(incidentId)) {
        matchedIncidentIds.push(incidentId);
      }
      if (!extractedIncidentIds.includes(incidentId)) {
        extractedIncidentIds.push(incidentId);
      }
      continue;
    }

    if (addedIds.includes(incidentId)) {
      continue;
    }

    const poolIncident = getPoolIncidentById(incidentId);
    if (!poolIncident) {
      skippedLineCount += 1;
      continue;
    }

    addedIncidents.push(poolIncident);
    addedIds.push(incidentId);
    extractedIncidentIds.push(incidentId);
    activeIdSet.add(incidentId);
  }

  const activeAfterExtract = new Set([...input.activeIncidentIds, ...addedIds]);
  const logSnippets: LogSnippet[] = extractedIncidentIds
    .filter((incidentId) => activeAfterExtract.has(incidentId))
    .map((incidentId, index) => ({
      incidentId,
      line: matchedLines[incidentId] ?? "",
      timestamp: formatSnippetTimestamp(index),
    }))
    .filter((snippet) => snippet.line.length > 0);

  const addedCount = addedIds.length;
  const matchedCount = matchedIncidentIds.length;
  const extractionStatus =
    extractedIncidentIds.length === 0 ? ("empty" as const) : ("extracted" as const);

  const record: RadioTranscriptRecord = {
    id: createRecordId(),
    text: input.text,
    sourceLabel: input.sourceLabel,
    presetId: input.presetId,
    createdAt: new Date().toISOString(),
    extractionStatus,
    extractedIncidentIds,
    addedIncidentIds: addedIds,
    matchedIncidentIds,
    extractionSummary: buildExtractionSummary(addedIncidents, matchedIncidentIds),
    followUpQuestions: extractionStatus === "empty" ? EMPTY_FOLLOW_UPS : [],
    logSnippets,
    matchedLines,
  };

  return {
    record,
    addedIncidents,
    matchedIncidentIds,
    addedIds,
    skippedLineCount,
  };
}

export function mergeAddedIncidentsIntoBatch(
  currentBatch: DemoIncidentBatch | null,
  currentPackages: IncidentPackage[],
  addedIncidents: DemoStoredIncident[],
): DemoIncidentBatch | null {
  if (addedIncidents.length === 0) {
    return currentBatch;
  }

  const existingIncidents =
    currentBatch?.incidents ??
    currentPackages.map((incidentPackage) => {
      const poolIncident = getPoolIncidentById(incidentPackage.incident.id);
      if (poolIncident) {
        return poolIncident;
      }

      return {
        id: incidentPackage.incident.id,
        title: incidentPackage.incident.title,
        priority: incidentPackage.incident.priority,
        incidentType: incidentPackage.incident.incidentType,
        category: incidentPackage.incident.category,
        team: incidentPackage.incident.assignedRole,
        location: incidentPackage.incident.locationLabel,
        status: incidentPackage.incident.status,
        summary: incidentPackage.incident.rawText || incidentPackage.staffUpdate,
        evidence: incidentPackage.evidence.map((item) => item.excerpt),
        timeline: [],
      } satisfies DemoStoredIncident;
    });

  const existingIds = new Set(existingIncidents.map((incident) => incident.id));
  const merged = [
    ...existingIncidents,
    ...addedIncidents.filter((incident) => !existingIds.has(incident.id)),
  ];

  return {
    generatedAt: new Date().toISOString(),
    incidents: sortStoredIncidents(merged),
  };
}

export function rebuildTimelineFromPersistedState(
  incidentPackages: IncidentPackage[],
  baseTimeline: TimelineEntry[],
  record: RadioTranscriptRecord | null,
): TimelineEntry[] {
  if (!record || record.extractionStatus !== "extracted") {
    return baseTimeline;
  }

  const activeIds = new Set(incidentPackages.map(({ incident }) => incident.id));
  const snippets = filterSnippetsForActiveQueue(record.logSnippets, activeIds);

  return appendTranscriptTimelineEntries(
    baseTimeline,
    snippets,
    record.matchedLines,
    record.addedIncidentIds.filter((id) => activeIds.has(id)),
  );
}

function isValidLogSnippet(value: unknown): value is LogSnippet {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const snippet = value as Record<string, unknown>;
  return (
    typeof snippet.incidentId === "string" &&
    typeof snippet.line === "string" &&
    typeof snippet.timestamp === "string"
  );
}

function isValidTranscriptRecord(value: unknown): value is RadioTranscriptRecord {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;
  const validStatuses = ["idle", "extracted", "empty"];
  const validSources = ["Radio Log", "Manual paste", "Preset"];

  return (
    typeof record.id === "string" &&
    typeof record.text === "string" &&
    validSources.includes(record.sourceLabel as string) &&
    typeof record.createdAt === "string" &&
    validStatuses.includes(record.extractionStatus as string) &&
    Array.isArray(record.extractedIncidentIds) &&
    Array.isArray(record.addedIncidentIds) &&
    Array.isArray(record.matchedIncidentIds) &&
    Array.isArray(record.followUpQuestions) &&
    Array.isArray(record.logSnippets) &&
    record.logSnippets.every(isValidLogSnippet) &&
    typeof record.matchedLines === "object" &&
    record.matchedLines !== null
  );
}

export function loadRadioTranscriptRecord(): RadioTranscriptRecord | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(RADIO_TRANSCRIPT_KEY);
    if (!raw) {
      return null;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!isValidTranscriptRecord(parsed)) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function saveRadioTranscriptRecord(record: RadioTranscriptRecord): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(RADIO_TRANSCRIPT_KEY, JSON.stringify(record));
  } catch {
    // fail silently
  }
}

export function getCanonicalActiveIncidentIds(): string[] {
  return DEMO_INCIDENT_POOL.slice(0, 3).map((incident) => incident.id);
}
