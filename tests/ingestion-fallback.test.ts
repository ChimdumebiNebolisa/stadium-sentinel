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
    expect(status.detailLine).toContain("Local fallback available");
  });

  it("reports elastic-ready without requiring elastic for load", () => {
    const status = resolveIngestionPathStatus(true);

    expect(status.activePath).toBe("elastic-ready");
    expect(status.detailLine).toContain("Connect stadium operations data");
  });

  it("reports seeded stadium operations ready when seed health is complete", () => {
    const status = resolveIngestionPathStatus(true, {
      ready: true,
      indices: [],
    });

    expect(status.statusLine).toContain("Seeded stadium operations data ready");
    expect(status.detailLine).toContain("Pull latest reports");
  });

  it("uses demo fallback for elastic and automatic attempts without credentials", () => {
    expect(shouldUseDemoFallbackForIngestion(false, "elastic")).toBe(true);
    expect(shouldUseDemoFallbackForIngestion(false, "automatic")).toBe(true);
    expect(resolveIngestionFallbackMessage("elastic")).toContain(
      "demo/local fallback",
    );
  });
});
