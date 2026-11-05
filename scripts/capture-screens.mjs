// Captures the product screenshots used on the landing page from the seeded demo account.
// Run with the dev server up and the demo seed loaded:
//   npm run db:seed && npm run screens
// Re-run whenever the dashboard UI changes, and commit the images in public/screens/.
import { chromium } from "playwright";

const BASE = process.env.SCREENS_BASE_URL ?? "http://localhost:3000";
const OUT = new URL("../public/screens/", import.meta.url).pathname;

const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 760 }, deviceScaleFactor: 2 });
  await page.goto(`${BASE}/sign-in`, { waitUntil: "networkidle" });
  await page.fill('input[name="email"]', "demo@rentcert.local");
  await page.fill('input[name="password"]', "demo-password-123");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);
  await page.waitForLoadState("networkidle");
  // Hide the Next.js dev indicator so it never lands in a marketing image.
  await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" });
  await page.screenshot({ path: `${OUT}dashboard.png`, clip: { x: 0, y: 0, width: 1200, height: 760 } });
  console.info(`Saved ${OUT}dashboard.png`);
} finally {
  await browser.close();
}
