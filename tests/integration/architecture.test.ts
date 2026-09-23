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
  it("only src/server/properties touches the property table", () => {
    const allowed = path.join(SRC, "server", "properties");
    const offenders = sourceFiles(SRC)
      .filter((file) => !file.startsWith(allowed))
      .filter((file) => /\b(db|tx)\.property\./.test(readFileSync(file, "utf8")))
      .map((file) => path.relative(SRC, file));

    expect(offenders).toEqual([]);
  });
});
