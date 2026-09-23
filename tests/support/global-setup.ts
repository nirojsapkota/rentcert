import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";

// Bring the test database schema up to date once per run.
export default function setup() {
  try {
    process.loadEnvFile();
  } catch {}
  rmSync("tmp/test-storage", { recursive: true, force: true });
  const url = process.env.TEST_DATABASE_URL ?? "postgresql://postgres@localhost:5432/rentcert_test";
  execFileSync("npx", ["prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
}
