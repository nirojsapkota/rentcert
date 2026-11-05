# SPEC: barriertrack-inspections (Phase 12)

Status: APPROVED and built. Deviation: photo storage keys use the vault shape `documents/<userId>/<uuid>` because the storage drivers only accept that shape; account deletion and the export then cover photos unchanged, and the orphan cleanup treats photo keys as known.

Depends on: barriertrack-foundation (Phase 11, done).

## Goal
Record each inspection of a pool or spa, work out when it is next due (4 years later), and attach photos.

## In scope
- `Inspection`: userId, poolId, `kind` (INITIAL | PERIODIC | REINSPECTION), `inspectedOn` (`@db.Date`), `outcome` (PASS | FAIL | PENDING), `certificateNumber` (optional text, as entered by the inspector), `lodgedOn` (optional date), `nextRecallOn` (`@db.Date`, nullable), notes. Index (userId, nextRecallOn) and (poolId, inspectedOn).
- `nextRecallOn` is set only when outcome is PASS: `inspectedOn` plus 48 months using month arithmetic (`src/lib/calendar-date.ts`), never 1460 days. FAIL and PENDING leave it null. One function, `nextRecallDate()` in `src/server/barrier/recall-date.ts`, is the only place that computes it; views and later jobs call it.
- The pool's current inspection is its PASS with the latest `inspectedOn`. Editing an inspection recomputes `nextRecallOn` and writes an audit event with field names only. Inspections can be edited but never deleted (same rule as compliance records).
- `InspectionPhoto`: inspectionId, userId, `storageKey` (`inspection-photos/<userId>/<uuid>`), detected type, size, optional caption (up to 200 chars), `uploadedAt`. Max 10 photos per inspection, 8 MB each, JPEG, PNG or WebP only. File type comes from magic bytes only (extend `vault/file-type.ts` with a photo allowlist), and the extension is rewritten to match.
- Storage through the existing drivers (`vault/storage`). Downloads and thumbnails only through a new `/api/inspection-photos/[id]/download` route: session check, `requireInspector` equivalent, owner-scoped lookup, `attachment` with `nosniff`. The route is added to the reviewed API list in `tests/integration/architecture.test.ts` and `docs/security-review.md`.
- Account deletion removes the `inspection-photos/<userId>/` prefix, and the export lists photos with file names but never storage keys.
- Pages: log an inspection from a pool (`/pools/[id]/inspections/new`), edit it, and see an inspection history list on the pool page, with the next recall date and a "due in N months" label (wording: "due", "based on the dates you entered", never "compliant").
- Dashboard (inspector): count of recalls due in the next 90 days.

## Out of scope
Certificates and PDFs (Phase 15), recall emails (Phase 14), council directory (Phase 13), calendar (Phase 16), billing limits (Phase 17), photo editing or reordering.

## Tests
- Unit: `nextRecallDate` (month-end cases such as 29 Feb, leap years, FAIL gives null).
- Integration: owner scoping for inspections and photos, edit recomputes date, audit has field names only, photo limit and size limit, magic-byte rejection of a renamed file, storage key never contains a filename, account deletion cascade and prefix removal, export contents.
- E2E: log a passing inspection, see the next recall date, upload a photo, mobile overflow check.
- Architecture test: `inspection` and `inspectionPhoto` models map to the `barrier` module; truncation lists updated in `tests/support/setup.ts` and `tests/e2e/global-setup.ts`.
- `npm run lint`, `npm run typecheck`, `npm test`.

## Open questions
1. Should a FAIL outcome allow a follow-up REINSPECTION that, once passed, sets the recall date? (Proposed: yes, same form, no extra linking in v1.)
2. Is 4 years always counted from `inspectedOn`, or from the certificate `lodgedOn` date? (Proposed: `inspectedOn`, and the date is visible so the inspector can correct it.)
3. Photo size cap of 8 MB each and 10 per inspection: acceptable? (Proposed: yes.)
