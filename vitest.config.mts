import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

try {
  process.loadEnvFile();
} catch {}

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5432/rentcert_test";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    // "server-only" throws outside React Server Components; tests run server code directly.
    alias: { "server-only": fileURLToPath(new URL("./tests/support/empty-module.ts", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
    environment: "node",
    globalSetup: ["tests/support/global-setup.ts"],
    setupFiles: ["tests/support/setup.ts"],
    // Integration tests share one database, so run files one at a time.
    fileParallelism: false,
    env: {
      DATABASE_URL: testDatabaseUrl,
      EMAIL_PROVIDER: "test",
      BETTER_AUTH_URL: "http://localhost:3000",
      BETTER_AUTH_SECRET: "test-secret-that-is-at-least-32-characters-long",
      QUEUE_DRIVER: "inline",
      TRUSTED_PROXY_CIDRS: "172.18.0.0/16",
      STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
      STRIPE_PRICE_PROPERTY: "price_property",
      STRIPE_PRICE_PORTFOLIO: "price_portfolio",
      STORAGE_DRIVER: "local",
      STORAGE_LOCAL_PATH: "tmp/test-storage",
    },
  },
});
