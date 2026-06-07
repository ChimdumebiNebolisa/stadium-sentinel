import { describe, expect, it } from "vitest";

import {
  evaluateAutomaticIngestionGate,
  runAutomaticIngestionPrototype,
} from "@/lib/automatic-ingestion";

describe("automatic ingestion prototype", () => {
  it("stays gated when elastic is not configured", () => {
    const gate = evaluateAutomaticIngestionGate(true, false);

    expect(gate.enabled).toBe(false);
    expect(gate.reason).toContain("Elastic");
  });

  it("returns fallback message instead of applying ingest when gated", () => {
    const result = runAutomaticIngestionPrototype({ transcriptRecord: null });

    expect("error" in result).toBe(true);
    if ("error" in result) {
      expect(result.fallbackMessage).toContain("demo/local fallback");
    }
  });
});
