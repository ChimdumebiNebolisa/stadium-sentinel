import { describe, expect, it } from "vitest";

import {
  resolveIngestionFallbackMessage,
  resolveIngestionPathStatus,
  shouldUseDemoFallbackForIngestion,
} from "@/lib/ingestion-fallback";

describe("ingestion fallback handling", () => {
  it("keeps demo/local fallback available when elastic is unavailable", () => {
    const status = resolveIngestionPathStatus(false);

    expect(status.demoFallbackAvailable).toBe(true);
    expect(status.elasticConfigured).toBe(false);
    expect(status.activePath).toBe("elastic-unavailable");
    expect(status.statusLine).toContain("demo/local");
  });

  it("reports elastic-ready without requiring elastic for load", () => {
    const status = resolveIngestionPathStatus(true);

    expect(status.activePath).toBe("elastic-ready");
    expect(status.detailLine).toContain("never required for page load");
  });

  it("uses demo fallback for elastic and automatic attempts without credentials", () => {
    expect(shouldUseDemoFallbackForIngestion(false, "elastic")).toBe(true);
    expect(shouldUseDemoFallbackForIngestion(false, "automatic")).toBe(true);
    expect(resolveIngestionFallbackMessage("elastic")).toContain(
      "demo/local fallback",
    );
  });
});
