import { defineConfig } from "@playwright/test";

// Smoke tests run against a dev server you start yourself: `npm run dev`, then `npm run test:e2e`.
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  use: { baseURL: process.env.E2E_URL ?? "http://localhost:3000", viewport: { width: 1440, height: 900 } },
});
