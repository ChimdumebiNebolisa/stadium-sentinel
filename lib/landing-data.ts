import type { PriorityLevel } from "@/lib/types";

export const NAV_LINKS = [
  { label: "Workflow", href: "#workflow" },
  { label: "Demo", href: "#demo" },
  { label: "Agent Layer", href: "#agent-layer" },
  { label: "Command Center", href: "/command" },
] as const;

export const COMMAND_FILE_META = {
  fileId: "FILE-2039",
  title: "Matchday Incident File",
  event: "City vs. United",
  status: "ACTIVE (In Progress)",
  created: "14:02:45 UTC",
  url: "sentinel.stadium/ops/file-2039",
  sources: ["Guest Svc", "Security", "Facilities", "Radio (R)"],
} as const;

export const RAW_INTAKE_LINES = [
  {
    timestamp: "14:02:11",
    source: "Fac(R)",
    text: "Elevator 4 is down, doors stuck on level 2.",
  },
  {
    timestamp: "14:02:18",
    source: "GS",
    text: "Guest near Section 112 needs wheelchair access.",
  },
  {
    timestamp: "14:02:30",
    source: "Sec",
    text: "Gate B is backed up, need crowd control.",
  },
] as const;

export const PARSED_INCIDENTS: ReadonlyArray<{
  id: string;
  description: string;
  priority: PriorityLevel;
  team: string;
}> = [
  {
    id: "#401",
    description: "Section 112 assist",
    priority: "Immediate",
    team: "Guest Services",
  },
  {
    id: "#402",
    description: "Elevator 4 down",
    priority: "High",
    team: "Facilities",
  },
  {
    id: "#403",
    description: "Gate B backed up",
    priority: "High",
    team: "Security / Crowd Flow",
  },
];

export const COMMAND_FILE_STICKIES = [
  {
    title: "COMMAND FILE",
    body: "Brings diverse reports into one focused command file.",
    variant: "navy" as const,
    position: "top-left" as const,
    connectorSide: "right" as const,
  },
  {
    title: "PRIORITY ROUTING",
    body: "Routes tasks and incidents by operational priority.",
    variant: "amber" as const,
    position: "middle-right" as const,
  },
  {
    title: "RESPONSE HISTORY",
    body: "Append-only stream of decisions toward resolution.",
    variant: "blue" as const,
    position: "bottom-left" as const,
  },
  {
    title: "REPORT MEMORY",
    body: "Dashboard-native archive for post-event operational review.",
    variant: "green" as const,
    position: "bottom-right" as const,
    connectorSide: "left" as const,
  },
] as const;

export const DISPATCH_FILTERS = [
  { label: "ALL", count: 4, active: true },
  { label: "SECURITY", count: 1, active: false },
  { label: "FACILITIES", count: 3, active: false },
] as const;

export const DISPATCH_QUEUE_ROWS: ReadonlyArray<{
  time: string;
  incident: string;
  status: "DISPATCHED" | "PENDING" | "RESOLVED";
  location: string;
  assigned: string | null;
  team: "SECURITY" | "FACILITIES";
}> = [
  {
    time: "14:05",
    incident: "Elevator 4 down",
    status: "DISPATCHED",
    location: "Elevator 4",
    assigned: "Unit FAC-2",
    team: "FACILITIES",
  },
  {
    time: "14:02",
    incident: "Gate B backed up",
    status: "DISPATCHED",
    location: "Gate B",
    assigned: "Unit SEC-Alpha",
    team: "SECURITY",
  },
  {
    time: "13:58",
    incident: "Restroom out of order",
    status: "PENDING",
    location: "West Concourse",
    assigned: null,
    team: "FACILITIES",
  },
  {
    time: "13:45",
    incident: "Spill near aisle",
    status: "PENDING",
    location: "Section 204",
    assigned: "Unit FAC-1",
    team: "FACILITIES",
  },
];

export const SWIMLANE_TIME_MARKS = ["13:30", "13:45", "14:00", "NOW"] as const;

export const CAPABILITY_CARDS = [
  {
    icon: "mic" as const,
    title: "See live reports clearly",
    body: "Turn messy staff notes, source-system updates, and live reports into clear incident context.",
  },
  {
    icon: "folder" as const,
    title: "Know who is handling it",
    body: "Show the assigned team, current status, and next step so staff do not duplicate work.",
  },
  {
    icon: "memory" as const,
    title: "Keep everyone updated",
    body: "Preserve evidence, timeline, reports, and approved updates in one shared operational record.",
  },
] as const;

export const TECH_APPENDIX_ITEMS = [
  {
    title: "Elasticsearch",
    body: "Vector context & text search",
  },
  {
    title: "Incident Memory",
    body: "Persistent event logging",
  },
  {
    title: "Elastic MCP",
    body: "Agent tool integration",
  },
  {
    title: "Platform Verification",
    body: "Audit trails & access control",
  },
] as const;

export const FOOTER_LINKS = [
  "Privacy Policy",
  "Terms of Service",
  "Security Standards",
  "API Reference",
] as const;
