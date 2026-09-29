import { createHash } from "node:crypto";
import { test as base, type Browser, type BrowserContext, type TestInfo } from "@playwright/test";

// Auth endpoints are rate limited per client IP. Give every test (and every extra user in a
// test) its own address so tests never share a rate-limit bucket.
export function fakeClientIp(seed: string): string {
  const [a, b, c] = createHash("sha256").update(seed).digest();
  return `10.${a}.${b}.${c}`;
}

// Address search never leaves the test machine: an empty answer unless a test routes its own.
export async function stubAddressSearch(context: BrowserContext) {
  await context.route("**/api/address-search?**", (route) => route.fulfill({ json: { suggestions: [] } }));
}

export const test = base.extend({
  // Named `provide` (not `use`) so the React hooks lint rule does not misfire.
  extraHTTPHeaders: async ({}, provide, testInfo) => {
    await provide({ "x-forwarded-for": fakeClientIp(testInfo.testId) });
  },
  context: async ({ context }, provide) => {
    await stubAddressSearch(context);
    await provide(context);
  },
});

export async function newUserPage(browser: Browser, testInfo: TestInfo, label: string) {
  const context = await browser.newContext({
    ...testInfo.project.use,
    extraHTTPHeaders: { "x-forwarded-for": fakeClientIp(`${testInfo.testId}:${label}`) },
  });
  await stubAddressSearch(context);
  return context.newPage();
}

export { expect } from "@playwright/test";
