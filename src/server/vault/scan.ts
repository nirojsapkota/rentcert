import "server-only";
import type { ScanStatus } from "@/generated/prisma/client";

// Malware scanning extension point. The MVP does not scan; Phase 8 can plug in a scanner
// (for example S3 GuardDuty malware protection) and return CLEAN or INFECTED.
export async function scanDocument(bytes: Uint8Array): Promise<ScanStatus> {
  void bytes;
  return "NOT_SCANNED";
}
