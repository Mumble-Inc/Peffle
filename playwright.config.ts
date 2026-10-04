import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import fs from "fs";
import os from "os";
import path from "path";

const root = process.cwd();
const e2ePort = process.env.PLAYWRIGHT_PORT ?? "3011";
const e2eBaseUrl = `http://localhost:${e2ePort}`;

dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local"), override: true });

const webServerEnv = Object.fromEntries(
  Object.entries(process.env).filter((entry): entry is [string, string] => entry[1] !== undefined),
);
webServerEnv.RAZORFLOW_USE_DEV_EMAIL = "1";
webServerEnv.PEFFLE_STORAGE = path.join(os.tmpdir(), `razorflow-peffle-e2e-${e2ePort}.sqlite`);
webServerEnv.GEMINI_API_KEY = "";
webServerEnv.RAZORPAY_WEBHOOK_SECRET =
  process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || "razorflow-e2e-webhook-secret";
webServerEnv.RAZORFLOW_STUB_RAZORPAY_REFUND = "1";
webServerEnv.DEMO_MODE = "1";
process.env.RAZORPAY_WEBHOOK_SECRET = webServerEnv.RAZORPAY_WEBHOOK_SECRET;
try {
  fs.unlinkSync(webServerEnv.PEFFLE_STORAGE);
} catch {
  // first run
}

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  timeout: 45_000,
  use: {
    baseURL: e2eBaseUrl,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npx next dev --port ${e2ePort}`,
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 120_000,
    env: webServerEnv,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
    },
  ],
});
