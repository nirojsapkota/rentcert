# SPEC: barriertrack-foundation (Phase 11)

Status: APPROVED and built (2026-10-13). Account type is fixed at sign-up; the separate `/inspectors` marketing page is deferred to Phase 17.

Source: `new_plan.md` (BarrierTrack), session plan phases 11-17.

## Goal
Let a Victorian pool/spa barrier inspector keep a register of clients and the pools or spas they inspect, inside the existing RentCert app.

## In scope
- `User.accountType` enum `LANDLORD | INSPECTOR` (default `LANDLORD`), chosen at sign-up and set via a Better Auth `input` field validated in the user create hook. Nav and dashboard switch on it. Landlord behaviour is unchanged.
- `Client`: name, email, phone, notes, `optedOutAt`; owner-scoped, archive instead of delete when a pool exists.
- `Pool` (pool or spa site): client, address (reuse address search, VIC only), kind POOL | SPA, notes, `archivedAt`.
- Server module `src/server/barrier/` (`commands.ts`, `queries.ts`); every function takes `userId` and filters by it; invalid UUIDs are not found.
- Pages under `src/app/(app)/clients/` and `src/app/(app)/pools/`; each page and action calls `requireUser()` and requires `accountType === INSPECTOR`.
- Audit events for create, update and archive (field names only).
- Account deletion cascades; data export includes clients and pools (`list…ForExport`).

## Out of scope
Inspections, photos, councils, recall emails, certificates, calendar, billing limits (Phases 12-17).

## Tests
- Integration: scoping (other user's id is not found), archive rules, audit, export, cascade delete.
- Update `tests/integration/architecture.test.ts` (`client`, `pool` map to `barrier`), `tests/support/setup.ts` truncation, `tests/e2e/global-setup.ts`.
- E2E: inspector signs up, adds client and pool; mobile overflow check.
- `npm run lint`, `npm run typecheck`, `npm test`.

## Open questions
1. Is account type fixed at sign-up, or switchable in Account settings? (Proposed: fixed, admin can change.)
2. Do landlord and inspector products share one marketing site? (Proposed: add a separate `/inspectors` page in Phase 17.)
