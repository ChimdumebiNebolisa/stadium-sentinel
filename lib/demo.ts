import { buildDeterministicAgentState } from "@/lib/agent/deterministic";

export function buildDemoState(report?: string) {
  return buildDeterministicAgentState(report);
}
