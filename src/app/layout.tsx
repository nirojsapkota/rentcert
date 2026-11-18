import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

// Self-hosted by next/font at build time, so no request goes to Google and the CSP stays 'self'.
const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-jakarta", display: "swap" });

// viewport-fit=cover makes the browser report the real safe-area insets (status bar, notch, home
// indicator). Without it they read as 0 even on browsers that draw the page under the status bar.
// The body and headers pad by those insets (globals.css), so nothing sits under the clock or icons.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0f2557", // matches the navy sidebar and mobile header, so the phone status bar blends in
  colorScheme: "light",
};

export const metadata: Metadata = {
  title: { default: "RentCert", template: "%s · RentCert" },
  description:
    "Track rental compliance dates, store certificates and get reminders before the deadlines you enter.",
};

// Every page renders per request so the CSP nonce from src/proxy.ts can be applied.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  await connection();
  return (
    <html lang="en-AU" className={`h-full antialiased ${jakarta.variable}`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
