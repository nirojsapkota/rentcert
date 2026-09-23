# Spec: foundation (Phase 1)

Status: IMPLEMENTED (2026-09-23). Module id: `foundation`. See `CAPABILITY_MAP.md`.

This spec also holds the project-wide decisions required by PLAN.md section 68 (A–D).

---

## Decisions log

| Date | Decision | Reason |
|---|---|---|
| 2026-09-23 | Stack is Next.js full-stack (TypeScript, React) instead of Rails + Hotwire. PLAN.md updated to match. | Owner decision. Next.js keeps the app server-rendered with no public API (PLAN.md section 64). |
| 2026-09-23 | Each property has a list of applicable requirements. The user can mark one as not applicable (for example gas). | Owner decision; not every property has gas. |
| 2026-09-23 | The first due date comes from the last check date the user enters for each requirement. If the date is unknown, the requirement is due now. | Owner decision; CAV says a missing check within the interval is to be done "as soon as possible". |
| 2026-09-23 | Trial length is an admin setting. Default 365 days. | Owner decision. |
| 2026-09-23 | Accounts are deleted on user request, with hard delete of dependent data and documents. | Owner decision. |
| 2026-09-23 | Archived properties do not count toward plan limits. | Owner decision. |
| 2026-09-23 | Properties in all Australian states and territories are supported. Victoria has researched rules; other states get a labelled generic schedule. | Owner decision. PLAN.md updated to match. |
| 2026-09-23 | Seed intervals: smoke alarm 12 months, electrical 24 months, gas 24 months, all `last_verified_at = null`. | Research in `docs/compliance-sources.md`. A human verifies before launch. |

---

## A. Architecture summary

```text
Browser (React server + client components)
   |
Next.js app (Node 24): pages, server actions, route handlers
   |                     \
PostgreSQL (Prisma)       Worker process (pg-boss, same codebase)
   |                         |
S3 (private bucket)       Email provider (Resend / SES / Postmark adapter)
   |
Stripe (Checkout + webhooks to /api/webhooks/stripe)
```

- One repository, one container image, two process types: `web` and `worker`.
- pg-boss stores jobs in PostgreSQL, so there is no Redis.
- No public API. Route handlers exist only for webhooks, health, and file downloads.

## B. Domain model

```text
User 1─* Property 1─* PropertyRequirement *─1 ComplianceRequirement
                 1─* ComplianceRecord    *─1 ComplianceRequirement
                                         1─* ComplianceDocument
                                         1─* ComplianceReminder
User 1─1 BillingAccount 1─* Subscription
User 1─* AuditEvent
AppSetting (key/value, admin-managed: trial_days, due_soon_window_days)
```

- `ComplianceRequirement` is configuration (what must happen and how often).
- `ComplianceRecord` is an event (what happened at a property, and when).
- `PropertyRequirement` records whether a requirement applies to a property.
- Status is calculated by one function and is not stored.

## C. Implementation plan

| Phase | Scope |
|---|---|
| 1 foundation | This spec |
| 2 properties | Property CRUD, archive, VIC validation, applicable requirements, dashboard shell |
| 3 compliance | Requirements, records, calculators, history, onboarding, dashboard statuses |
| 4 vault | Documents in S3, validation, authorised download and delete |
| 5 reminders | Reminder model, daily job, idempotent emails |
| 6 compliance-pack | PDF generator and download |
| 7 billing | Stripe Checkout, webhooks, plan limits, trial setting |
| 8 hardening | Admin, export, legal and marketing pages, analytics, observability, CI/CD, deploy |

Each phase gets its own `SPEC-<module-id>.md` and review gate before code.

## D. Identified ambiguities

| Topic | Status |
|---|---|
| Victorian compliance rules | Researched, not verified. See `docs/compliance-sources.md`. |
| Date calculation source | Resolved: last check date for each requirement; unknown means due now. |
| Reminder semantics | Open for Phase 5: send time (proposed 8am user local time); behaviour when a record is completed between reminders (proposed: cancel pending reminders). |
| Subscription trial | Partly resolved: 365-day default, admin-configurable. Open: does the trial require a card at checkout? Note: a 365-day trial delays the paid-conversion signal in PLAN.md section 59. |
| Document retention | Proposed: documents live until the user deletes them or the account. Record history is kept while the account exists. |
| Account deletion | Resolved: hard delete on request, plus a timestamp-only `AccountDeletion` row. |

---

## Objective

Create the project foundation so that a person can create an account, verify their email,
sign in, sign out, reset a password, and delete their account.

User stories:

- As a landlord, I sign up with first name, last name, email and password.
- As a landlord, I receive a verification email and cannot use the app until I verify.
- As a landlord, I reset a forgotten password with an emailed link.
- As a landlord, I delete my account, and all my data is removed.

## Tech Stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 24, TypeScript (strict) |
| Framework | Next.js 16 (App Router), React 19 |
| Styling | Tailwind CSS 4 |
| Database | PostgreSQL 16+ (local server is 16), Prisma 7.10 (stable; npm `latest` is 8.0 RC, not used) |
| Auth | Better Auth 1.7 with the Prisma adapter: email and password, email verification, password reset, account deletion, built-in rate limiting |
| Validation | Zod 4 |
| Email | React Email templates. Adapter selected by `EMAIL_PROVIDER`: `console` (dev), `file` (Playwright), `test` (Vitest). |
| Dates | `date-fns` and `@date-fns/tz` (calendar dates as `YYYY-MM-DD`) |
| Tests | Vitest 5 (unit and integration against a real test database), Playwright 1.63 (end-to-end) |
| Package manager | npm |

## Commands

```bash
bin/setup                  # .env, npm install, migrate dev + test DBs, Playwright browser
bin/dev                    # next dev (worker added in Phase 5)
npm run build              # next build
npm run lint               # eslint .
npm run typecheck          # next typegen && tsc --noEmit
npm test                   # vitest run
npm test -- tests/unit/greeting.test.ts  # one test file
npm test -- -t "rejects a blank first name"   # one test by name
npm run test:e2e           # playwright test
npm run db:migrate -- --name <change>   # create and apply a migration
# Seed data arrives with compliance requirements in Phase 3.
```

## Project Structure

```text
prisma/schema.prisma       Data model and migrations
src/app/(marketing)/       Public pages
src/app/(auth)/            Sign up, sign in, verify, reset
src/app/(app)/             Signed-in pages (dashboard, account)
src/app/api/               Route handlers: auth, health, webhooks, downloads
src/server/                Domain logic, data access, policies (server-only)
src/server/db.ts           Prisma client
src/server/auth.ts         Better Auth configuration
src/server/mail/           Mail adapter and templates
src/server/audit.ts        AuditEvent writer
src/components/            Shared UI components
tests/unit/                Vitest tests for pure logic
tests/integration/         Vitest tests against the test database
tests/e2e/                 Playwright tests for acceptance scenarios
docs/                      Research and operations docs
```

Every file in `src/server/` imports `server-only`, so it never ships to the browser.

## Code Style

Data access always takes the signed-in user's id. No lookup by record id alone.

```ts
// src/server/properties/queries.ts
import "server-only";
import { db } from "@/server/db";

export async function findPropertyForUser(userId: string, propertyId: string) {
  return db.property.findFirst({ where: { id: propertyId, userId } });
}
```

Server actions follow one shape: authenticate, validate, call domain code, redirect.

```ts
"use server";
export async function archiveProperty(propertyId: string) {
  const user = await requireVerifiedUser();
  await archivePropertyForUser(user.id, propertyId);
  revalidatePath("/properties");
}
```

Conventions:

- File names in kebab-case. React components in PascalCase. Database columns in snake_case
  through Prisma `@map`.
- No business logic in pages or components.
- No magic numbers. Intervals and windows come from `ComplianceRequirement` or `AppSetting`.
- User-facing errors are plain sentences. Log the technical error on the server.

## Testing Strategy

- Vitest runs against a real PostgreSQL test database (`rentcert_test`). No database mocks.
- Every data-access function has a test proving that user A cannot read or change user B's data.
- Playwright covers PLAN.md section 41 scenarios as each phase delivers them.
- Phase 1 tests: sign up, weak password rejected, unverified user blocked, verification link,
  password reset, sign out, account deletion removes the user and dependent rows, `/health`.

## Boundaries

- Always: scope queries by user id; validate input with Zod on the server; run lint, typecheck
  and tests before calling a task done; write an `AuditEvent` for create, update and delete of
  user data.
- Ask first: new dependencies not listed in this spec; schema changes outside the current phase;
  changes to compliance intervals or legal wording; anything that sends real email or charges money.
- Never: commit secrets or `.env`; log passwords, tokens, Stripe secrets, signed URLs or
  document contents; state that a property is legally compliant; build features from PLAN.md
  section 58.

## Phase 1 scope

In scope:

1. Next.js app with TypeScript, Tailwind, ESLint, Vitest, Playwright.
2. Prisma schema: `User` (email, first_name, last_name, timezone default `Australia/Melbourne`,
   notification_email) plus Better Auth tables, and `AuditEvent`.
3. Auth pages and flows: sign up, verify email, sign in, sign out, forgot and reset password.
4. Password rule: at least 12 characters. Rate limiting on auth endpoints.
5. Account page: edit name, timezone and notification email; delete account.
6. Base layout with primary navigation (Dashboard, Properties, Documents, Billing, Account),
   mobile responsive. Links for later phases show placeholder pages.
7. Disclaimer text in the footer: RentCert is a tracking product and gives no legal advice.
8. `GET /api/health` returns `{"status":"ok"}` after a database ping.
9. Mail adapter with `console` provider for development.
10. `.env.example`, `bin/setup`, `bin/dev`, README first draft, CLAUDE.md.

Out of scope: properties, compliance, documents, reminders, PDF, Stripe, admin, CI.

## Success Criteria

- `bin/setup && bin/dev` runs on a clean checkout with local PostgreSQL.
- Sign up creates the account and sends a verification email (PLAN.md scenario 1).
- An unverified user cannot open any `(app)` page.
- A password shorter than 12 characters is rejected with a readable message.
- Repeated failed sign-ins are rate limited.
- Password reset works end to end with the console mail adapter.
- Account deletion removes the user, sessions and audit events for that user.
- `/api/health` returns 200 with `{"status":"ok"}` and no other data.
- `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:e2e` pass.

## Open Questions

1. Does the trial require a card at checkout? (Needed by Phase 7.)
2. Which email provider in production: Resend, SES or Postmark? (Needed by Phase 5.)
3. Rate limiting reads the client IP from `x-forwarded-for`. In production, only the load
   balancer may set that header, or a client can spoof it to dodge limits. Configure
   Better Auth `advanced.ipAddress` for the chosen AWS setup. (Needed by Phase 8.)

## Resolved with proposed defaults (no answer received)

- Account deletion keeps a timestamp-only `AccountDeletion` row.
- A small CI workflow (lint, typecheck, audit, Vitest, Playwright, build) ships in Phase 1.

## Implementation notes

- Rate limits apply only to HTTP calls to `/api/auth`, so auth forms are client components
  that use the Better Auth client instead of server actions.
- Client auth forms are disabled until hydration and use `method="post"`, so an early click
  never submits credentials in a URL (found during end-to-end testing).
- `package.json` overrides `mysql2` (^3.24.4) and `deepmerge-ts` (^8.0.2) to clear high-severity
  audit findings in Prisma and Better Auth transitive dependencies.
- A Content-Security-Policy is deferred to Phase 8. Baseline security headers ship now.
