import { defineConfig } from "@playwright/test";
import fs from "node:fs";
const edge = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
export default defineConfig({
  testDir: "./e2e",
  timeout: 60000,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "artifacts/e2e-results.json" }]],
  use: {
    baseURL: process.env.TEST_URL || "http://127.0.0.1:5173",
    headless: true,
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0",
    acceptDownloads: true,
    launchOptions: fs.existsSync(edge) ? { executablePath: edge } : {},
  },
  outputDir: "test-results",
});
