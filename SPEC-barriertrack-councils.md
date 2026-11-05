# SPEC: barriertrack-councils (Phase 13)

Status: APPROVED with defaults and built. The seed holds council names only; no contact details until verified (see `docs/council-sources.md`). Saving a council with a source URL marks it verified.

## Goal
Give inspectors a Victorian council directory with "how to lodge" details, so each pool is linked to its council and each inspection shows where the certificate goes.

## Scope
- `Council` model: name, lodgementMethod (PORTAL | EMAIL | POST | OTHER), contactEmail, contactPhone, portalUrl, notes, `sourceUrl`, `verifiedAt` (nullable). It is configuration, not user data: no `userId`, seeded by migration, never truncated in tests (like `compliance_requirements`).
- Seed 15-20 metropolitan councils. Every row records its source in `docs/council-sources.md`. Rows with no verified source keep `verifiedAt = null` and show "Not yet verified. Check with the council."
- `Pool.councilId` (nullable FK, `onDelete: SetNull`). The pool form gets a council picker, pre-selected by suburb where the seed has a suburb mapping, never forced.
- Inspection page gets a "How to lodge" panel from the pool's council. Wording is "Based on information we last checked on <date>", never authoritative.
- Admin: `Admin → Councils` list and edit pages (`requireAdmin()` in each, 404 for non-admins), audited as `council.updated` with field names only. The admin module may read and write `Council`.
- Module: `src/server/councils/` (queries, commands). Council is configuration, so the architecture test maps `council` to `councils` and `admin`.

## Out of scope
All 79 councils, automatic lodgement, a council portal integration, suburb-to-council automation beyond the seeded mapping.

## Tests
- Integration: pool-council link, `SetNull` on council delete, owner scoping on the pool, admin-only edit (a non-admin gets 404), audit has field names only, and seeded rows exist and survive the test truncation.
- Unit: unverified rows render the warning wording.
- E2E: the inspector picks a council on a pool and sees the lodge panel. The admin edits a council. Mobile overflow check.
- Update `tests/integration/architecture.test.ts` and `docs/security-review.md` if any route is added (none planned).

## Open decisions (defaults)
1. Seed councils: the metro list from `docs/council-sources.md`, to be researched from official council pages. [Default: research first, seed only what has a source.]
2. Suburb mapping: skip in v1, manual picker only. [Default: skip.]
3. Council deletion in admin: not offered, edit only. [Default: edit only.]
