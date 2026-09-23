# Capability Map: RentCert MVP

Status: APPROVED (2026-09-23).

Source requirements: `PLAN.md` (sections 1–69, Next.js stack). Build order follows PLAN.md
section 57.

| Phase | Module id | Responsibility | Depends on |
|---|---|---|---|
| 1 (done) | foundation | Next.js app, PostgreSQL + Prisma, Tailwind, base layout, `User`, auth (sign up, sign in, sign out, reset, email verification, account deletion), `AuditEvent`, `/health`, mail adapter | — |
| 2 (done) | properties | Property CRUD, archive and restore, Australian state and postcode validation, tenant scoping, dashboard shell (counts only) | foundation |
| 3 (done) | compliance | `ComplianceRequirement` config (VIC rules plus a labelled generic schedule for other states), per-property applicability, `ComplianceRecord`, due-date and status calculators, property cards, history, mark-completed flow, onboarding wizard, dashboard statuses and filters | properties |
| 4 (done) | vault | `ComplianceDocument`, S3 private storage, upload validation (magic bytes), authorised download and delete, scan hook | compliance |
| 5 | reminders | `ComplianceReminder`, daily scheduler (pg-boss), idempotent reminder emails, welcome email | compliance |
| 6 | compliance-pack | `CompliancePackGenerator` PDF: cover, details, summary, history, document index | compliance, vault |
| 7 | billing | Stripe Checkout, idempotent signed webhooks, `BillingAccount`, `Subscription`, plan limits, admin-configurable trial length | foundation, properties |
| 8 | hardening | Admin (read-only), data export, legal pages, landing, pricing, FAQ, analytics events, observability, CI/CD, deploy | all |

Notes:

- `billing` adds the plan-limit check to the property create path. `properties` does not depend
  on `billing`, so no cycle exists. Until Phase 7, property creation is unlimited.
- Archived properties do not count toward plan limits.
- Onboarding sits in Phase 3 because it needs due-date calculation.
- The admin settings store (trial length) arrives in Phase 7. The full admin UI arrives in Phase 8.
- SEO compliance pages stay unpublished until `docs/compliance-sources.md` is verified.
- Each module spec is saved as `SPEC-<module-id>.md` at the project root.
