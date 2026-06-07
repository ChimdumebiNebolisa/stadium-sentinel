import type { PriorityLevel } from "@/lib/types";

const priorityStyles: Record<PriorityLevel, string> = {
  Immediate: "landing-priority-immediate",
  High: "landing-priority-high",
  Moderate: "landing-priority-moderate",
  Monitor: "landing-priority-monitor",
};

export function LandingPriorityPill({ level }: { level: PriorityLevel }) {
  return (
    <span className={`landing-priority-pill ${priorityStyles[level]}`}>{level}</span>
  );
}
