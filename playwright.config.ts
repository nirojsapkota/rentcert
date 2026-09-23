import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile();
} catch {}

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;
export const E2E_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5432/rentcert_test";

export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL: BASE_URL, trace: "retain-on-failure" },
  // Tests import `test` from tests/e2e/fixtures.ts, which gives each test its own client IP
  // so auth rate limits never collide.
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npx prisma migrate deploy && npx next dev --port ${PORT}`,
    url: `${BASE_URL}/api/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      EMAIL_PROVIDER: "file",
      BETTER_AUTH_URL: BASE_URL,
      BETTER_AUTH_SECRET: "e2e-secret-that-is-at-least-32-characters-long",
      QUEUE_DRIVER: "inline",
      STRIPE_SECRET_KEY: "sk_test_e2e",
      STRIPE_API_HOST: "localhost",
      STRIPE_API_PORT: "12111",
      STRIPE_API_PROTOCOL: "http",
      STRIPE_WEBHOOK_SECRET: "whsec_e2e_secret",
      STRIPE_PRICE_PROPERTY: "price_property",
      STRIPE_PRICE_PORTFOLIO: "price_portfolio",
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_PATH: "tmp/e2e-storage",
    },
  },
});
