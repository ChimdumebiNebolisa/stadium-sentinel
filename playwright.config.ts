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
    reuseExistingServer: !process.env.CI,
  },
});
