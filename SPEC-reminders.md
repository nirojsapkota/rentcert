# Spec: reminders (Phase 5)

Status: IMPLEMENTED (2026-09-23). Module id: `reminders`. Depends on: `compliance`.
Source: PLAN.md sections 13, 14, 15, 37, 41 (scenario 6), 62.

Stack, commands, code style and boundaries from `SPEC-foundation.md` apply unchanged.

---

## Objective

Landlords get one useful email before and after each due date they entered, never duplicates,
and the app keeps working when email delivery fails.

User stories:

- I get an email 30 days and 7 days before a check is due, on the due date, and 7 days after
  it becomes overdue.
- Each email names the property, the check and the due date, and links to the property.
- Once I record the check, I get no more reminders for the old due date.
- I get a welcome email after I verify my account.
- I can turn reminder emails off (and on again) in Account settings.

## Data model

```prisma
enum ReminderType   { DAYS_30 DAYS_7 DUE_DATE OVERDUE_7 }
enum ReminderStatus { PENDING SENT FAILED SKIPPED }

model ComplianceReminder {
  id                 String         @id @default(uuid(7)) @db.Uuid
  complianceRecordId String         @map("compliance_record_id") @db.Uuid  // FK, ON DELETE CASCADE
  reminderType       ReminderType   @map("reminder_type")
  scheduledFor       DateTime       @map("scheduled_for") @db.Date
  status             ReminderStatus @default(PENDING)
  attempts           Int            @default(0)
  lastError          String?        @map("last_error")   // short error code only, no personal data
  sentAt             DateTime?      @map("sent_at")
  createdAt          DateTime       @default(now()) @map("created_at")

  @@unique([complianceRecordId, reminderType])   // the idempotency guarantee
  @@index([status, scheduledFor])
  @@map("compliance_reminders")
}
```

`User` gains `reminderEmailsEnabled Boolean @default(true)`.

## Reminder rules

For each **current** record (see `SPEC-compliance.md`) on an **active** property, for an
**applicable** requirement, owned by a **verified** user with reminders enabled:

| Type | Scheduled for |
|---|---|
| `DAYS_30` | nextDueOn − 30 days |
| `DAYS_7` | nextDueOn − 7 days |
| `DUE_DATE` | nextDueOn |
| `OVERDUE_7` | nextDueOn + 7 days |

- A reminder is **due** when `scheduledFor ≤ today` in the user's timezone and the user's local
  time is 08:00 or later.
- **No catch-up spam:** when several types are due at once (for example after downtime, or for
  a backfilled record), only the latest due type is sent.
- **Nothing before the record existed:** a type whose `scheduledFor` is on or before the date the
  record was created is never sent. So "I don't know" at setup (due the same day) sends no
  "due today" email, only the overdue follow-up 7 days later, and a newly entered record never
  triggers an old reminder.
- A superseded record (a newer completion exists) gets no further reminders, because only
  current records are considered.
- Status wording comes from `complianceStatus()`. Reminder code never re-derives status.

## Idempotency and delivery

1. **Scan job** (`send-compliance-reminders`, hourly): works out which reminder is due per
   current record, then claims it with
   `INSERT … ON CONFLICT (compliance_record_id, reminder_type) DO NOTHING RETURNING id`. Only a
   successful insert enqueues a send. Two scans running at once cannot both claim the same reminder.
2. **Send job** (`send-reminder-email`, one per reminder): loads the reminder, **re-checks** that
   it still applies (record still current, property active, reminders enabled), then sends and
   marks it `SENT` with `sentAt`. A reminder that no longer applies becomes `SKIPPED`.
   The send job only sends from `PENDING`, so a retried job never sends twice after success.
3. **Failures:** pg-boss retries with exponential backoff (5 attempts). Each failure increments
   `attempts` and stores a short error code. After the last attempt the status becomes `FAILED`.
   The web app never waits on email, so an email outage only delays reminders.

There is one small window: the provider accepts the email, then the database update fails, and a
retry sends a second copy. This is accepted, because the email provider call is not
transactional. Amazon SES has no idempotency key, so the window stays open (it needs a database
failure straight after a successful send).

Implementation notes (2026-09-23):

- Production provider: Amazon SES (`EMAIL_PROVIDER=ses`, `@aws-sdk/client-sesv2`).
- A reminder sent late (after downtime, or a catch-up) states the real days remaining, not the
  nominal 30 or 7.
- `QUEUE_DRIVER=inline` runs jobs in-process for Vitest and Playwright.

## Jobs and processes

- Queue: **pg-boss** (PostgreSQL-backed, no Redis). New dependency, named in PLAN.md.
- New process: `src/worker.ts` (`npm run worker`). It registers job handlers and the hourly
  schedule. `bin/dev` runs web and worker together. Production runs 2 process types from 1 image.
- Welcome email: after email verification, enqueue `send-welcome-email` (retried the same way).
- Orphaned-file cleanup (left over from Phase 4): a daily job deletes stored objects that have no
  document row and are older than 24 hours.

## Emails

The provider is selected by `EMAIL_PROVIDER`: `console`, `file` or `test` (existing), plus
**one production provider (see Open Questions)**. Emails go to `notificationEmail`, or to the
sign-in email when that is not set.

| Email | Subject | Key sentence |
|---|---|---|
| Welcome | "Welcome to RentCert" | How to add a property and set up dates. |
| 30-day | "Gas safety check for 12 Smith Street is due in 30 days" | "Your gas safety check for 12 Smith Street is due in 30 days. Due date: 28 October 2026." |
| 7-day | "… is due in 7 days" | Same pattern. |
| Due today | "… is due today" | "The due date you entered for this check is today." |
| Overdue | "… is overdue" | "Your compliance record is overdue. This record is past the due date entered in RentCert. Please confirm the applicable requirement and arrange the relevant check if required." |

- Every reminder has a "View property" button, the RentCert disclaimer, and "You can turn off
  reminder emails in Account settings."
- Never "breaking the law", "illegal", "fined", "non-compliant" or similar (PLAN.md sections 15 and 62).
  A test checks every template for these words.

## Account setting

`/account` gains an "Email reminders" on/off switch (audited as `user.updated` with the
changed field name).

## Project structure additions

```text
src/server/reminders/schedule.ts     Which reminder type is due for a record (pure)
src/server/reminders/scan.ts         Finds due reminders and claims them (idempotent insert)
src/server/reminders/send.ts         Sends one reminder, with re-checks and status updates
src/server/jobs/queue.ts             pg-boss setup and job names
src/server/mail/templates/*.tsx      Welcome and reminder templates
src/worker.ts                        Worker entry point
```

## Testing Strategy

- Unit: `dueReminderType()` for every boundary (the day before, on, and after each scheduled
  date), catch-up picks only the latest, the record-creation rule, the 08:00 local-time rule
  across timezones.
- Integration (real database, `test` mail adapter):
  - Scenario 6: a due reminder sends one email and is marked `SENT`. Running the scan again sends
    nothing. Two scans in parallel send one email.
  - A superseded record, an archived property, a not-applicable requirement, an unverified user
    and a user with reminders off each send nothing. A reminder that stops applying between
    scan and send becomes `SKIPPED`.
  - Failure: a provider error increments attempts and keeps `PENDING`. The final failure sets `FAILED`.
  - Wording: rendered templates contain the property, check and due date, and none of the banned words.
  - Isolation: a reminder never goes to another user's address.
  - Welcome email is enqueued once on verification.
- End to end: turning reminders off and on in Account settings.

## Success Criteria

- Scenario 6 passes: one email, marked sent. A second scan sends no copy.
- Emails keep neutral wording. The app keeps working while email delivery fails.
- lint, typecheck, Vitest, Playwright, build and audit pass.

## Out of scope

SMS, per-user choice of reminder days, digests, calendar invites, and email open or click tracking.

## Open Questions

1. **Production email provider:** Amazon SES (fits the AWS deployment; needs domain
   verification and leaving the SES sandbox), Resend, or Postmark? (Proposed: Amazon SES through
   `@aws-sdk/client-sesv2`.)
2. Send reminders from 08:00 in the user's timezone. OK? (Proposed: yes.)
3. An "Email reminders" on/off setting in Account. OK? (Proposed: yes, default on.)
4. "I don't know" at setup sends no "due today" email, only the overdue follow-up 7 days later. OK? (Proposed: yes.)
