import type { Metadata, Viewport } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans } from "next/font/google";
import { connection } from "next/server";
import "./globals.css";

// Self-hosted by next/font at build time, so no request goes to Google and the CSP stays 'self'.
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600", "700"], variable: "--font-plex-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono", display: "swap" });

// viewport-fit=cover makes the browser report the real safe-area insets (status bar, notch, home
// indicator). Without it they read as 0 even on browsers that draw the page under the status bar.
// The body and headers pad by those insets (globals.css), so nothing sits under the clock or icons.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#16191d", // matches the ink app bar, so the phone status bar blends in
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
    <html lang="en-AU" className={`h-full antialiased ${plexSans.variable} ${plexMono.variable}`}>
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
