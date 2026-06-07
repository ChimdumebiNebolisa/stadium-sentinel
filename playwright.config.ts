import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "default",
      testIgnore: /radio-transcript-fallback/,
    },
    {
      name: "transcript-fallback",
      testMatch: /radio-transcript-fallback/,
    },
  ],
  webServer: {
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: false,
    env: {
      ...process.env,
      NEXT_PUBLIC_REAL_DEMO_FLOW:
        process.env.REAL_DEMO_E2E === "1" ? "true" : "false",
    },
  },
});
