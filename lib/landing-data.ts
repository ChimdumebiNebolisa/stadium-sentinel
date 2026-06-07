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
  { label: "ALL", count: 12, active: true },
  { label: "SECURITY", count: 4, active: false },
  { label: "FACILITIES", count: 5, active: false },
] as const;

export const DISPATCH_QUEUE_ROWS = [
  {
    time: "14:05",
    incident: "Section 112 assist",
    status: "DISPATCHED" as const,
    location: "Section 112",
    assigned: "Unit GS-4",
  },
  {
    time: "14:02",
    incident: "Gate B backed up",
    status: "DISPATCHED" as const,
    location: "Gate B",
    assigned: "Unit SEC-Alpha",
  },
  {
    time: "13:58",
    incident: "Restroom out of order",
    status: "PENDING" as const,
    location: "Section 204",
    assigned: null,
  },
  {
    time: "13:45",
    incident: "Medical: Heat exhaustion",
    status: "RESOLVED" as const,
    location: "Section 118",
    assigned: "Med Team 2",
  },
] as const;

export const SWIMLANE_TIME_MARKS = ["13:30", "13:45", "14:00", "NOW"] as const;

export const CAPABILITY_CARDS = [
  {
    icon: "mic" as const,
    title: "Operations intake",
    body: "Connect stadium operations data and review current incident reports.",
  },
  {
    icon: "folder" as const,
    title: "Command File",
    body: "Every incident generates a structured artifact ready for post-event operational review.",
  },
  {
    icon: "memory" as const,
    title: "Agent-Readable Incident Memory",
    body: "Append-only incident memory gives agent workflows approved operational context.",
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
