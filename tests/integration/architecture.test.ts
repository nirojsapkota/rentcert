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
  // The admin module is the one deliberate cross-account reader (admin-only pages), and it may
  // read properties but never documents.
  it.each([
    ["property", ["properties", "admin"]],
    ["complianceRecord", ["compliance"]],
    ["propertyRequirementExclusion", ["compliance"]],
    ["complianceDocument", ["vault"]],
    ["complianceReminder", ["reminders"]],
  ])("only the allowed modules touch %s", (model, moduleDirs) => {
    const allowed = moduleDirs.map((dir) => path.join(SRC, "server", dir));
    const pattern = new RegExp(`\\b(db|tx)\\.${model}\\.`);
    const offenders = sourceFiles(SRC)
      .filter((file) => !allowed.some((dir) => file.startsWith(dir)))
      .filter((file) => pattern.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(SRC, file));

    expect(offenders).toEqual([]);
  });
});

describe("admin architecture", () => {
  const ADMIN_APP = path.join(SRC, "app", "(app)", "admin");

  it("every admin page and action checks requireAdmin()", () => {
    const offenders = sourceFiles(ADMIN_APP)
      .filter((file) => /(page|actions)\.tsx?$/.test(file))
      .filter((file) => !readFileSync(file, "utf8").includes("requireAdmin()"))
      .map((file) => path.relative(SRC, file));
    expect(offenders).toEqual([]);
  });

  it("the admin module never reads documents", () => {
    const offenders = sourceFiles(path.join(SRC, "server", "admin")).filter((file) =>
      /complianceDocument|compliance_documents|storageKey|filename/.test(readFileSync(file, "utf8").replace(/\/\/.*$/gm, "")),
    );
    expect(offenders).toEqual([]);
  });
});
