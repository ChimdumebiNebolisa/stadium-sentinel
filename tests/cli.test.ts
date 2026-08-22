import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const tsxCli = require.resolve("tsx/cli");
const cliEntry = path.join(repoRoot, "cli", "stadium-sentinel.ts");

function runCli(args: string[]): { status: number; stdout: string; stderr: string } {
  const result = spawnSync(process.execPath, [tsxCli, cliEntry, ...args], {
    cwd: repoRoot,
    encoding: "utf8",
    timeout: 120_000,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
  };
}

describe("stadium-sentinel CLI contract", () => {
  it("validate exits 0 for the bundled fixture and 1 for an invalid venue", () => {
    const ok = runCli(["validate", "fixtures/harborline-park.json"]);
    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain("VALID");

    const invalid = runCli(["validate", "package.json"]);
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain("E_UNSUPPORTED_SCHEMA_VERSION");
  });

  it("analyze emits byte-stable JSON with a fingerprint", () => {
    const args = [
      "analyze",
      "fixtures/harborline-park.json",
      "--scenario",
      "fixtures/east-tunnel-closed.json",
      "--json",
    ];
    const a = runCli(args);
    const b = runCli(args);
    expect(a.status).toBe(0);
    expect(a.stdout).toBe(b.stdout);

    const parsed = JSON.parse(a.stdout) as { fingerprint: string; simulation: { clearanceSeconds: number } };
    expect(parsed.fingerprint).toMatch(/^[0-9a-f]{64}$/);
  });

  it("compare reports deltas and route changes", () => {
    const result = runCli([
      "compare",
      "fixtures/harborline-park.json",
      "-",
      "fixtures/east-tunnel-closed.json",
    ]);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("maxTheoreticalFlow");
    expect(result.stdout).toContain("route changes:");
    expect(result.stdout).toContain("sec-e: gate-east -> gate-north");
  });

  it("usage errors exit with code 2", () => {
    const missing = runCli(["analyze"]);
    expect(missing.status).toBe(2);
    const unknown = runCli(["frobnicate"]);
    expect(unknown.status).toBe(2);
  });
});
