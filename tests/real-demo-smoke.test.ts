import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("real demo smoke artifacts", () => {
  it("includes required docs and verification script", () => {
    const root = process.cwd();
    const required = [
      "docs/real-demo-script.md",
      "docs/devpost-talking-points.md",
      "scripts/verify-real-demo.mjs",
    ];

    for (const relativePath of required) {
      expect(fs.existsSync(path.join(root, relativePath))).toBe(true);
    }
  });
});
