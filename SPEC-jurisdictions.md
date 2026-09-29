# Spec: jurisdictions (Phase 10)

Status: IMPLEMENTED (2026-09-28). Module id: `jurisdictions`. Depends on: `compliance`, `hardening`
(admin).
Source: owner request (2026-09-28): rules for every Australian state, editable from Admin, because an
owner may have properties in several states. Changes PLAN.md sections 5, 43 and 58 ("State-specific
compliance rules outside Victoria (generic schedule only)").

Stack, commands, code style and boundaries from `SPEC-foundation.md` apply unchanged.

---

## Objective

Every property gets the checks that apply in its own state, seeded from research, each clearly
labelled with where its timing comes from. Admins can adjust intervals, wording and sources per state,
add a requirement to a state, and turn one off, without a code change.

User stories:

- As an owner with properties in VIC and QLD, each property shows its own state's checks.
- As an owner, I can see why a check is on my list: required every N months, required before each
  tenancy, or only recommended.
- As an admin, I can change a state's interval, add a requirement to a state, or deactivate one, and
  every change is audited.

## Research summary (to be verified before launch)

Seeded rows keep `last_verified_at` null, so every card keeps showing "Not yet verified" until a
person checks the official source and clicks "Mark verified" in Admin. The table goes into
`docs/compliance-sources.md` with its links.

| State | Seeded requirement | Interval | Basis | Official source |
|---|---|---|---|---|
| VIC | Smoke alarm check | 12 months | Required interval | consumer.vic.gov.au |
| VIC | Electrical safety check | 24 months | Required interval | consumer.vic.gov.au |
| VIC | Gas safety check | 24 months | Required interval | consumer.vic.gov.au |
| NSW | Smoke alarm check | 12 months | Required interval (annual check) | nsw.gov.au, RT Regulation 2019 |
| QLD | Smoke alarm test and clean | 12 months | Before each new or renewed tenancy (within 30 days) | rta.qld.gov.au |
| WA | Smoke alarm check | 12 months | Before each new or renewed tenancy | wa.gov.au (Building and Energy) |
| TAS | Smoke alarm test and clean | 12 months | Before each new tenancy | cbos.tas.gov.au |
| ACT | Smoke alarm check | 12 months | Before each tenancy | esa.act.gov.au |
| NT | Smoke alarm test | 12 months | Before each tenancy (within 30 days) | nt.gov.au |
| SA | Smoke alarm clean and battery check | 12 months | Recommended (no fixed legal interval) | sa.gov.au, mfs.sa.gov.au |

Not seeded, because they are not recurring checks: RCD / safety switch installation (QLD, WA),
10-year smoke alarm replacement (all states), QLD's interconnected-alarm deadline (1 January 2027),
pool barrier certificates. Only Victoria mandates periodic electrical and gas checks; see Open
Question 1 for the other states.

## Data model

```prisma
enum RequirementBasis {
  REQUIRED_INTERVAL    // the law sets the interval (VIC gas every 2 years)
  BEFORE_EACH_TENANCY  // the law requires a check before each new or renewed tenancy; RentCert reminds yearly
  RECOMMENDED          // good practice or official advice, not a legal interval
}

model ComplianceRequirement {
  // existing fields unchanged
  basis RequirementBasis @default(REQUIRED_INTERVAL)
}
```

- One migration adds the column and seeds the rows in the table above (production needs them). The
  existing VIC rows keep their ids and get `REQUIRED_INTERVAL`. The GENERIC rows stay as the
  fallback for a state with no active rows.
- Due dates are still `nextDueOn()` month arithmetic. `BEFORE_EACH_TENANCY` changes wording only:
  RentCert cannot know renewal dates, so it reminds yearly and tells the owner to also check before a
  new tenancy.

## What changes for existing properties

- `requirementsFor(state)` already prefers the state's own active rows, so NSW, QLD, SA, WA, TAS, ACT
  and NT properties move from the GENERIC schedule to their state's rows automatically.
- Records and exclusions key on requirement `code`, so smoke alarm history carries over.
- Electrical and gas records on non-VIC properties stay in the history and the Compliance Pack, but
  those checks leave the schedule and stop sending reminders (unless Open Question 1 keeps them).

## Admin

`/admin/requirements`, admin only, as today:

- **Grouped by state** (VIC, NSW, QLD, SA, WA, TAS, ACT, NT, then GENERIC), with each state's
  verified count.
- **Edit** (existing form) gains Basis.
- **Add requirement to a state**: jurisdiction, code (`^[a-z][a-z0-9_]{1,39}$`, unique per state),
  name, description, interval (1–120 months), basis, source name and https URL. Reusing an existing
  code (for example `electrical`) keeps history and exclusions attached to it.
- **Deactivate** instead of delete (records reference requirements with `ON DELETE RESTRICT`). A state
  whose rows are all inactive falls back to GENERIC.
- Every create, edit and verify is audited (`admin.requirement_created` is new) with old and new
  values.
- Interval changes affect new completions only, as today. The page says so next to the field.

## Owner-facing changes

- Compliance cards show the basis under the name: "Required every 12 months in VIC", "Required before
  each new or renewed tenancy in QLD. RentCert reminds you yearly", or "Recommended in SA. Not a fixed
  legal interval". Always with "Not yet verified" until verified.
- The "General reminder schedule" notice shows only when a property really uses GENERIC.
- The Compliance Pack summary shows the same basis line.
- FAQ "Which states does RentCert support?" and the landing copy describe per-state schedules. No
  wording says a property is compliant (the existing public-wording test keeps guarding this).
- PLAN.md sections 5, 43 and 58 and CAPABILITY_MAP.md (Phase 10) are updated.

## Testing Strategy

Vitest:

- The migration seeds one active set per state with sources and null `last_verified_at`.
- `requirementsFor()` returns each state's rows; an all-inactive state falls back to GENERIC.
- A NSW property with GENERIC electrical history keeps it in history, drops it from the schedule and
  reminders, and its smoke alarm record stays current.
- Admin create: code validation, per-state uniqueness, audit event; non-admins refused (existing
  architecture test covers `requireAdmin()`).
- Basis wording per state; the Compliance Pack includes the basis line.

Playwright: an owner with a VIC and a QLD property sees three checks and one check with the right
basis lines; an admin adds a requirement to NSW and a NSW property shows it; mobile layout checks.

## Success Criteria

- Every state has its own labelled schedule; GENERIC is only a fallback.
- Admins change intervals, wording, basis and sources, and add or deactivate requirements, with an
  audit trail.
- No wording claims legal compliance; every seeded row shows "Not yet verified" until checked.
- lint, typecheck, Vitest, Playwright and build pass.

## Out of scope

Tenancy renewal dates and reminders tied to them, one-off deadlines (QLD 2027 alarm upgrade), alarm
replacement dates, RCD installation tracking, pool certificates, per-owner custom checks,
recalculating existing due dates after an interval change.

## Decisions (2026-09-28)

1. **Electrical and gas outside Victoria:** seeded as `RECOMMENDED` every 24 months for NSW, QLD, SA,
   WA, TAS, ACT and NT, labelled as not a legal requirement in that state. Owners keep their
   reminders and can mark them not applicable. (This replaces "What changes for existing properties":
   electrical and gas stay on the schedule for every state.)
2. **Verification:** every seeded row starts "Not yet verified"; a person marks each one verified in
   Admin after checking the official source, before launch.
3. Requirement names stay the same in every state ("Smoke alarm check", "Electrical safety check",
   "Gas safety check"); the state-specific rule goes in the description and the basis line.
