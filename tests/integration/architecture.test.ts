import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../../src");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (full.startsWith(path.join(SRC, "generated"))) return [];
    if (statSync(full).isDirectory()) return sourceFiles(full);
    return /\.(ts|tsx)$/.test(name) ? [full] : [];
  });
}

describe("tenant isolation architecture", () => {
  // Each user-owned table may only be touched by its own module, which scopes every query by user.
  it.each([
    ["property", "properties"],
    ["complianceRecord", "compliance"],
    ["propertyRequirementExclusion", "compliance"],
  ])("only src/server/%s's module touches %s", (model, moduleDir) => {
    const allowed = path.join(SRC, "server", moduleDir);
    const pattern = new RegExp(`\\b(db|tx)\\.${model}\\.`);
    const offenders = sourceFiles(SRC)
      .filter((file) => !file.startsWith(allowed))
      .filter((file) => pattern.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(SRC, file));

    expect(offenders).toEqual([]);
  });
});
