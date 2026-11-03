import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3002",
    launchOptions: {
      executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium",
      args: ["--no-sandbox"],
    },
  },
  webServer: [
    {
      command: "node tests/helpers/classroom-server.mjs",
      port: 54321,
      timeout: 60000,
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --port 3002",
      url: "http://127.0.0.1:3002/login",
      timeout: 120000,
      reuseExistingServer: false,
      env: {
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-publishable-fixture",
      },
    },
  ],
});
