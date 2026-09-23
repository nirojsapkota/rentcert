# Spec: properties (Phase 2)

Status: IMPLEMENTED (2026-09-23). Module id: `properties`. Depends on: `foundation`.
Source: PLAN.md sections 4, 10, 11, 22, 23, 26, 49, 52, 56. Overrides the Victoria-only rule (see Decision).

Stack, commands, code style and boundaries from `SPEC-foundation.md` apply unchanged.
This spec lists only what is new.

---

## Objective

A signed-in landlord can add, view, edit, archive, restore and delete their Australian rental
properties, in any state or territory. No user can see or change another user's properties.

User stories:

- As a landlord, I add a property with its address and, if known, its lease start date.
- As a landlord, I see a list of my active properties, and separately my archived ones.
- As a landlord, I open a property and see its address, lease start date and notes.
- As a landlord, I edit a property's details.
- As a landlord, I archive a property I no longer rent out, and restore it later.
- As a landlord, I delete a property I added by mistake.
- As a landlord with no properties, the dashboard tells me how to add my first one.

## Decision: all Australian states (2026-09-23)

Owner decision: properties in every Australian state and territory are accepted from Phase 2.
This replaces the "Victorian properties only" rule in PLAN.md sections 4 and 43.

- `state` is one of `NSW`, `VIC`, `QLD`, `SA`, `WA`, `TAS`, `NT`, `ACT`.
- Postcode is any 4-digit Australian postcode. RentCert does not check that the postcode belongs
  to the chosen state, because border towns break simple ranges (for example Barooga NSW 3644).
- Compliance rules per state are a Phase 3 question. See Open Questions.

## Scope change to the capability map

`CAPABILITY_MAP.md` puts "per-property applicable requirements" in Phase 2. This spec moves it
to Phase 3. Reason: applicability needs the `ComplianceRequirement` table, which Phase 3 creates.
The Phase 3 setup step asks, for each requirement: last check date, "not sure", or "not
applicable" (for example no gas). Phase 2 stays about properties only.

## Data model

```prisma
model Property {
  id             String    @id @default(uuid(7)) @db.Uuid
  userId         String    @map("user_id")
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  addressLine1   String    @map("address_line_1")
  addressLine2   String?   @map("address_line_2")
  suburb         String
  state          AustralianState
  postcode       String
  nickname       String?
  notes          String?
  leaseStartDate DateTime? @map("lease_start_date") @db.Date
  archivedAt     DateTime? @map("archived_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@index([userId, archivedAt])
  @@map("properties")
}

enum AustralianState {
  NSW
  VIC
  QLD
  SA
  WA
  TAS
  NT
  ACT
}
```

- PLAN.md names an `active` flag. This spec uses `archivedAt` instead: a property is active
  when `archivedAt` is null. The timestamp also records when it was archived.
- The PostgreSQL enum restricts `state`. A check constraint (raw SQL in the migration) enforces
  `postcode ~ '^[0-9]{4}$' AND postcode >= '0200'`.
- `leaseStartDate` is a calendar date (`@db.Date`). It never goes through timezone conversion.

## Validation rules

| Field | Rule | Message |
|---|---|---|
| Address line 1 | Required, trimmed, 1–100 chars | "Enter the street address." |
| Address line 2 | Optional, up to 100 chars | |
| Suburb | Required, 1–60 chars, letters, spaces, `'` and `-` | "Enter the suburb." |
| State | One of the 8 states and territories | "Choose a state or territory." |
| Postcode | 4 digits, 0200–9999 | "Enter a 4-digit Australian postcode." |
| Nickname | Optional, up to 60 chars | |
| Notes | Optional, up to 2,000 chars | |
| Lease start date | Optional, valid `YYYY-MM-DD`, from 1990-01-01 to 2 years after today | "Enter a valid lease start date." |

The form shows a state select with full names (for example "Victoria (VIC)"). No default is preselected.

## Behaviour

| Action | Rule |
|---|---|
| Create | Always allowed in Phase 2. Phase 7 adds the plan-limit check. |
| Edit | Allowed for active and archived properties. |
| Archive | Sets `archivedAt`. The property leaves the default list and, from Phase 5, gets no reminders. |
| Restore | Clears `archivedAt`. Phase 7 adds the plan-limit check. |
| Delete | Allowed only while the property has no compliance records. From Phase 3, a property with records can only be archived, to keep its history. The user confirms first. |
| Not yours | Any id that is not the signed-in user's property returns 404. The response looks the same as for an id that does not exist. |

Every create, update, archive, restore and delete writes an `AuditEvent`: `property.created`,
`property.updated` (metadata: changed field names), `property.archived`, `property.restored`,
`property.deleted`.

## Pages

| Route | Content |
|---|---|
| `/properties` | Active properties, 20 per page, newest first. "Archived" tab (`?view=archived`). Empty state: "Add your first property". |
| `/properties/new` | Property form. |
| `/properties/[id]` | Header (nickname or street, suburb, state, postcode), lease start date, notes. Actions: Edit, Archive or Restore, Delete. A "Compliance" section says compliance tracking arrives soon. |
| `/properties/[id]/edit` | Property form with current values. |
| `/dashboard` | Count of active properties. Empty state with "Add property" button when there are none. |

Dates show as "12 October 2024" (`en-AU`).

## Project structure additions

```text
src/lib/property-validation.ts       Zod schema shared by form and server
src/lib/calendar-date.ts             Parse and format YYYY-MM-DD calendar dates
src/server/properties/queries.ts     findPropertyForUser, listPropertiesForUser, countActiveProperties
src/server/properties/commands.ts    create, update, archive, restore, delete (with audit events)
src/app/(app)/properties/...         Pages and server actions
prisma/seed.ts                       Demo user (verified) and 3 demo properties
```

Only `src/server/properties/` may call `db.property`. Pages and actions go through these
functions, which always take `userId`.

## Seed data

`npm run db:seed` creates `demo@rentcert.local` (password printed on the console, email verified)
with 3 fictional properties: 2 in Victoria and 1 in New South Wales. No real people's data. The seed builds the password
hash with Better Auth's hashing function, so the demo user can sign in normally.

## Testing Strategy

- Unit: property schema (every rule in the validation table), calendar-date helpers
  (leap day, no timezone shift).
- Integration (real database):
  - Create, update, archive, restore and delete write the expected rows and audit events.
  - Isolation: user B gets "not found" for user A's property on find, update, archive,
    restore and delete. User A's row is unchanged afterwards.
  - Lists and counts return only the user's own properties, and pagination works.
  - The database rejects an unknown state and the postcodes `123`, `12345` and `0100`.
- Architecture test: fails if any file outside `src/server/properties/` calls `db.property`.
- End to end (Playwright): add, view, edit, archive, restore and delete a property. User B
  opening user A's property URL gets the 404 page (PLAN.md scenario 5). Runs on desktop and mobile.

## Success Criteria

- A verified user can add a property and sees it on `/properties` and on the dashboard count.
- An invalid postcode or an unknown state is rejected with the message in the validation table,
  both in the form and at the database.
- Archived properties disappear from the default list and appear under "Archived".
- Another user's property id returns 404 on every page and action, with no data in the response.
- Every change writes one audit event with no sensitive data.
- Lists are paginated, with no N+1 queries: the list page makes one query for rows and one for the count.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` and `npm run build` pass.

## Out of scope

Compliance requirements, records and applicability (Phase 3), documents (Phase 4), plan
limits (Phase 7), address autocomplete, and checking that a postcode belongs to its state.

## Resolved questions (approved 2026-09-23)

1. All Australian states and 4-digit postcodes (see Decision above).
2. Delete only while a property has no compliance records; otherwise archive only.
3. Per-property applicability moves to Phase 3.
4. Lease start date is optional.
5. Phase 3: other states get the same three reminders as a generic schedule, clearly labelled
   as not based on that state's rules. Per-state rules come later, each verified first.
