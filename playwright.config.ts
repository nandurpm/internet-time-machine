import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./client/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3015",
    headless: true,
    viewport: { width: 1280, height: 900 },
    launchOptions: {
      executablePath: "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: {
    command: "PORT=3015 NODE_ENV=development pnpm dev",
    url: "http://127.0.0.1:3015",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
