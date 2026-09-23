export const JOBS = {
  scanReminders: "send-compliance-reminders",
  sendReminder: "send-reminder-email",
  sendWelcome: "send-welcome-email",
  cleanupFiles: "cleanup-orphaned-files",
} as const;

export type JobName = (typeof JOBS)[keyof typeof JOBS];

// 5 attempts in total with exponential backoff (about 30s, 1m, 2m, 4m).
export const RETRY_OPTIONS = { retryLimit: 4, retryDelay: 30, retryBackoff: true } as const;
