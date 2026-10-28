import { defineConfig, devices } from "@playwright/test";

// End-to-end tests run against a production build on port 3100 with a
// SEPARATE database (flatmarket_test) and storage directory. Each run creates
// its own uniquely named accounts; never point TEST_DATABASE_URL at real data.
const TEST_DB = process.env.TEST_DATABASE_URL ?? "postgresql://flatmarket:flatmarket_dev@localhost:5432/flatmarket_test?schema=public";
const PORT = 3100;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  globalSetup: "./tests/e2e/global-setup.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
    locale: "el-GR",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: TEST_DB,
      APP_URL: `http://localhost:${PORT}`,
      APP_SECRET: "e2e-test-secret-e2e-test-secret-e2e-test-secret",
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_DIR: "./storage-test",
      ANTHROPIC_API_KEY: "",
      CLAID_API_KEY: "",
      EMAIL_PROVIDER: "",
      SIGNUP_MODE: "open",
      ADMIN_EMAILS: "",
    },
  },
});
