# Spec: compliance (Phase 3)

Status: IMPLEMENTED (2026-09-23). Module id: `compliance`. Depends on: `properties`.
Source: PLAN.md sections 3, 5, 6, 7, 10, 11, 12, 29, 30, 43, 62. Research: `docs/compliance-sources.md`.

Stack, commands, code style and boundaries from `SPEC-foundation.md` apply unchanged.

---

## Objective

A landlord sees, for each property, when each compliance check is next due, and records
completed checks. RentCert calculates the next due date from the dates the landlord enters.
It never says whether a property is legally compliant (PLAN.md section 62).

User stories:

- After adding a property, I enter the last check date for each check, or say "I don't know"
  or "Not applicable".
- On a property page I see a card per check: status, last completed, next due, days remaining.
- I mark a check as completed with the date, provider, licence number and notes. The next due
  date updates. The earlier record stays in the history.
- On the dashboard I see counts of overdue, due soon and up-to-date checks, and a table of
  upcoming deadlines across all my active properties, with filters.

## Domain model

A requirement is configuration. A record is an event. They stay separate (PLAN.md section 29).

```prisma
model ComplianceRequirement {
  id               String    @id @default(uuid(7)) @db.Uuid
  code             String    // smoke_alarm | electrical | gas
  jurisdiction     String    // "VIC", later "NSW" etc.; "GENERIC" for the unresearched fallback
  name             String
  description      String
  recurrenceMonths Int       @map("recurrence_months")
  sortOrder        Int       @map("sort_order")
  active           Boolean   @default(true)
  sourceName       String?   @map("source_name")
  sourceUrl        String?   @map("source_url")
  lastVerifiedAt   DateTime? @map("last_verified_at")

  @@unique([jurisdiction, code])
  @@map("compliance_requirements")
}

model ComplianceRecord {
  id                    String   @id @default(uuid(7)) @db.Uuid
  propertyId            String   @map("property_id")        // FK, ON DELETE CASCADE
  requirementId         String   @map("requirement_id")     // FK, ON DELETE RESTRICT
  kind                  ComplianceRecordKind                 // COMPLETED | UNKNOWN_LAST_CHECK
  completedOn           DateTime? @map("completed_on") @db.Date
  nextDueOn             DateTime  @map("next_due_on") @db.Date
  providerName          String?   @map("provider_name")
  providerLicenceNumber String?   @map("provider_licence_number")
  notes                 String?
  createdAt, updatedAt

  @@index([propertyId, requirementId, nextDueOn])
  @@index([nextDueOn])
  @@map("compliance_records")
}

// A requirement code the owner marked "not applicable" for one property (for example gas).
model PropertyRequirementExclusion {
  propertyId      String @map("property_id")   // FK, ON DELETE CASCADE
  requirementCode String @map("requirement_code")
  createdAt
  @@id([propertyId, requirementCode])
}
```

Rules:

- Check constraint: `kind = 'COMPLETED'` requires `completed_on` to be set.
- The database cascades `user → property → records`, so account deletion removes everything.
  The app refuses property deletion while records exist (see Properties change below), so
  history is never lost through the property page.
- Exclusions use the requirement `code`, not its id, so "no gas" survives a change of state.

### Which requirements apply to a property

`requirementsFor(state)` returns the active requirements for that state's jurisdiction. If a
state has none configured, it returns the `GENERIC` set. Today: VIC gets the Victorian rows, and
every other state gets `GENERIC`. Adding NSW rules later is a data change, not a code change.

### Seeded configuration (in a migration, because production needs it)

| Jurisdiction | Code | Name | Months | Source |
|---|---|---|---|---|
| VIC | smoke_alarm | Smoke alarm check | 12 | Consumer Affairs Victoria, smoke alarms page |
| VIC | electrical | Electrical safety check | 24 | Consumer Affairs Victoria, gas and electrical safety page |
| VIC | gas | Gas safety check | 24 | Consumer Affairs Victoria, gas and electrical safety page |
| GENERIC | smoke_alarm, electrical, gas | Same names | 12, 24, 24 | None. Labelled as a general schedule. |

`last_verified_at` stays null for every row until a person verifies it.

## Calculations (one place each)

`src/server/compliance/due-date.ts`: `nextDueOn(completedOn, recurrenceMonths)`

- Calendar month arithmetic on `YYYY-MM-DD`. A day that does not exist in the target month
  moves to that month's last day. Examples: 2024-02-29 + 12 → 2025-02-28; 2024-02-29 + 48 →
  2028-02-29; 2025-08-31 + 6 → 2026-02-28.
- Never adds 365 or 730 days. Never goes through a timezone.

`src/server/compliance/status.ts`: `complianceStatus(nextDueOn, today, dueSoonDays)`

| Status | Rule | Label |
|---|---|---|
| overdue | nextDueOn < today | "Overdue by N days" |
| due | nextDueOn = today | "Due today" |
| due_soon | nextDueOn ≤ today + dueSoonDays | "Due in N days" |
| upcoming | otherwise | "Due in N days" |

- `today` is the date in the user's timezone.
- `dueSoonDays` defaults to 30, from `COMPLIANCE_DUE_SOON_DAYS`. The admin setting arrives in Phase 7/8.
- Two more display states: `not_applicable` (excluded) and `not_set_up` (no record yet).
- Each status has an icon and a text label, not only a colour.

The **current record** for a property and requirement code is the record with the latest
`nextDueOn` (tie: latest `createdAt`). A backfilled older check therefore never replaces a newer one.

## Flows

1. **Set up checks** (`/properties/[id]/setup`): shown after a property is created, and from any
   `not_set_up` card. For each applicable requirement: "Last check date", "I don't know", or
   "Not applicable". Saving creates:
   - a date: a `COMPLETED` record with `nextDueOn = date + interval`;
   - "I don't know": an `UNKNOWN_LAST_CHECK` record with `nextDueOn = today` (due now), following
     the CAV guidance that a missing check is done "as soon as possible";
   - "Not applicable": an exclusion.
   The redirect goes to the property page, which shows: "Based on the dates you entered…
   These are reminders, not legal advice."
2. **Mark completed** (`/properties/[id]/checks/[code]/complete`): completed date (not in the
   future, not before 1990), provider name, provider licence number, and notes, all optional
   except the date. It creates a `COMPLETED` record. Document upload joins in Phase 4.
3. **Edit a record** (`/properties/[id]/records/[recordId]/edit`): fixes typos in the date,
   provider, licence or notes. `nextDueOn` is recalculated. An audit event stores the old and
   new values of the changed fields. Records cannot be deleted in Phase 3.
4. **Not applicable / applicable again**: a toggle on each card, with an audit event.

## Pages

- **Property page** (PLAN.md section 11): one card per requirement, in `sortOrder`. Each card shows
  the name, status label, last completed, next due, days remaining, and "Mark completed".
  Non-VIC properties show once: "General reminder schedule. RentCert has not yet researched
  [State] rules. Confirm what applies to your property." VIC cards show the source link and
  "Not yet verified" until `lastVerifiedAt` is set.
  Below: a compliance history table (requirement, completed, next due, provider), 20 per page,
  newest completion first.
- **Dashboard** (PLAN.md section 10): counts for active properties, Overdue, Due soon (includes
  due today), and Up to date. The "Upcoming deadlines" table lists the current record of every
  applicable requirement across active properties, soonest first. Filters: All, Overdue,
  Due soon, Upcoming, Completed. "Completed" lists completed records from the last 12 months,
  newest first. Empty state: "You're all caught up."
- **Add property**: heading "Tell us about your first property" when the user has none (PLAN.md section 30).

Wording: never "compliant", "legal" or "guaranteed". Use "due", "overdue", "up to date",
"based on the dates you entered".

## Properties change

`deleteProperty` refuses when the property has any compliance record. It returns a reason and
the page shows: "This property has compliance history, so it can't be deleted. Archive it instead."

## Audit events

`compliance_record.created`, `compliance_record.updated` (changed fields with old and new
values; dates and provider text only), `property.checks_set_up`, `property.requirement_excluded`,
`property.requirement_included`.

## Project structure additions

```text
src/server/compliance/due-date.ts        nextDueOn (pure)
src/server/compliance/status.ts          complianceStatus, labels, days remaining (pure)
src/server/compliance/requirements.ts    requirementsFor(state)
src/server/compliance/queries.ts         property schedule, history, dashboard summary (owner-scoped)
src/server/compliance/commands.ts        setUpChecks, recordCompletion, updateRecord, set exclusion
src/lib/compliance-validation.ts         Zod schemas for setup, completion and edit forms
src/app/(app)/properties/[id]/setup, checks/[code]/complete, records/[recordId]/edit
```

Only `src/server/compliance/` may call `db.complianceRecord` or `db.propertyRequirementExclusion`.
The architecture test extends to both.

## Testing Strategy

- Unit: `nextDueOn` (leap years, month ends, 12/24/48 months), `complianceStatus` (every
  boundary: yesterday, today, today+30, today+31), `requirementsFor` (VIC, NSW → GENERIC).
- Integration:
  - Setup creates the right record kind and exclusions.
  - A completion updates the current record, and older records stay in history.
  - A backfilled older completion does not become current.
  - An edit recalculates `nextDueOn` and audits old and new values.
  - Property delete is refused when records exist.
  - Isolation: user B cannot read or change user A's schedule, records or exclusions.
  - Dashboard summary counts and filters, archived properties excluded.
  - Dashboard and property page use a fixed number of queries (no N+1), checked by counting queries.
  - "Today" follows the user's timezone at the day boundary.
- End to end: add a property, set up checks (one date, one unknown, one not applicable), see the
  cards, mark gas completed (PLAN.md scenario 3), see history and dashboard counts. Plus an NSW
  property showing the general-schedule notice.

## Success Criteria

- PLAN.md scenarios 2 and 3 pass: the property shows its initial schedule, and marking gas
  completed saves the record and calculates the next due date.
- Month arithmetic and status boundaries match the tables above.
- No page says or implies that a property is legally compliant.
- lint, typecheck, Vitest, Playwright, build and audit pass.

## Out of scope

Documents (Phase 4), reminders (Phase 5), PDF (Phase 6), admin editing of requirements
(Phase 8), per-property custom intervals, deleting records.

## Open Questions

1. Records can be edited (with audit) but not deleted. OK? (Proposed: yes. Deleting a record
   entered by mistake can come later with an audit trail.)
2. Dashboard "Completed" filter = completed checks from the last 12 months. OK? (Proposed: yes.)
