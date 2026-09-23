import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// PLAN.md section 61: claims the public pages must never make.
const BANNED = [/guaranteed compliance/i, /never get fined/i, /100% legally compliant/i, /VCAT-proof/i, /government approved/i, /fully compliant with/i];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) ? [full] : [];
  });
}

describe("public page wording", () => {
  const sources = [...files(path.resolve("src/app/(marketing)")), ...files(path.resolve("src/components/marketing"))];

  it.each(BANNED.map((pattern) => [pattern.source, pattern]))("never says %s", (_name, pattern) => {
    const offenders = sources.filter((file) => pattern.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("marks the legal pages as drafts until reviewed", () => {
    for (const page of ["privacy", "terms"]) {
      expect(readFileSync(path.resolve(`src/app/(marketing)/${page}/page.tsx`), "utf8")).toContain("<DraftNotice />");
    }
  });
});
