"use client";

import { useEffect } from "react";

// Counts a landing-page visit. No cookies, no identifiers: the server only increments a daily total.
export function VisitBeacon() {
  useEffect(() => {
    try {
      navigator.sendBeacon("/api/visit");
    } catch {
      // Counting visits is optional.
    }
  }, []);
  return null;
}
