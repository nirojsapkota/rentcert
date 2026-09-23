# Spec: hardening (Phase 8)

Status: 8a IMPLEMENTED (2026-09-23); 8b and 8c scoped. Module id: `hardening`. Depends on: all earlier modules.
Source: PLAN.md sections 31–36, 38, 42, 46, 47, 50–55, 60, 61, 65.

Phase 8 is too large for one review, so it is split into three sub-phases, each with its own
approval and commit. This file details 8a; 8b and 8c list their scope and the decisions they need now.

---

## 8a. Product surface

### Admin (PLAN.md section 42)

- `User.role` (`USER` | `ADMIN`). Admins are granted from the command line only:
  `npm run admin:grant -- <email>` (no UI for granting roles).
- `/admin` (admins only; others get 404):
  - Users: email, sign-up date, email verified, plan and status, active property count. 25 per page, search by email.
  - Properties: suburb, state, postcode, owner email, active or archived, record count. No street address in lists.
  - Subscriptions: plan, status, period end, cancel-at-period-end.
  - Compliance requirements: edit name, description, interval months, source name and URL,
    active, and **mark verified** (sets `last_verified_at`). Every change is audited.
  - Settings: `trial_days` (0–730).
  - Metrics (PLAN.md sections 59 and 60): sign-ups, properties added, first certificate uploaded, reminders sent,
    checkouts started, paid conversions, MRR from active subscriptions, and churn, per month.
- Admins **cannot** open or download users' documents, and admin pages never show document names.
- Every admin page view and change writes an `AuditEvent` with the admin's user id.

### Data export (PLAN.md section 35)

`/account` → "Export my data" downloads a ZIP with `account.json` (profile), `properties.json`,
`compliance-records.json`, `reminders.json`, `audit-events.json` and a `documents/` folder with the
original files. It is built on the fly for the signed-in user only, and audited.
New dependency: a small ZIP writer (`archiver` or `fflate`).

### Product analytics (PLAN.md section 47)

Own `product_events` table (no third-party tracker): `signup`, `property_created`,
`compliance_record_created`, `document_uploaded`, `reminder_sent`, `compliance_pack_downloaded`,
`checkout_started`, `subscription_started`. It holds the user id, event name and timestamp only. No
addresses, filenames or document data. It feeds the admin metrics page. A page-view count for
"visitor → signup" uses a cookieless daily counter on the landing page (no personal data).

### Public pages (PLAN.md sections 31–33, 61)

- Landing page with the sections in PLAN.md section 31 (problem, how it works, dashboard mockup, vault,
  reminders, pricing, FAQ, disclaimer, CTA), using only the approved wording ("Keep your compliance
  records organised", "Get reminders before the dates you've entered").
- `/pricing` and a FAQ section with the answers in PLAN.md section 33.
- `/privacy` and `/terms`: **draft templates**, clearly marked "Draft – requires legal review
  before launch". They describe what the product stores (names, emails, addresses, compliance
  data, documents), where (AWS Sydney region), retention and deletion, and Stripe and email
  processors. They never claim "fully compliant with the Privacy Act".
- SEO pages (`/victoria-…`, PLAN.md section 46) are **deferred** until the compliance sources are verified.

### Tests (8a)

Admin access control (non-admin gets 404, all admin routes, IDOR on the admin document path),
requirement edits audited and reflected in schedules, the export contains only the user's data and
the right files, the metrics maths, event emission at each point, and a wording check that the
public pages contain none of the PLAN.md section 61 phrases.

---

## 8b. Production hardening (scope; detailed spec after 8a)

- Content-Security-Policy with nonces (Next.js 16 proxy), in addition to the existing headers.
- Trusted client IP for rate limiting: only the load balancer's `x-forwarded-for` hop is used
  (Better Auth `advanced.ipAddress`). This closes the spoofing gap noted in Phase 1.
- Structured JSON logs with request ids, and redaction of tokens, cookies, signed URLs and emails.
- Error tracking (see question 4), job failure alerts (FAILED reminders, dead pg-boss jobs), and a
  `/api/health` check extended to the queue.
- Human-readable error pages; no stack traces in production.
- A security review pass: dependency audit, OWASP checklist, and IDOR sweep across every route.

## 8c. Deployment (scope; detailed spec after 8b)

- Dockerfile (one image, `web` and `worker` commands), GitHub Actions deploy on `main`.
- **Owner decision: one EC2 instance deployed with Kamal, plus RDS** (about A$40/month). Kamal
  runs the `web` and `worker` roles from one image. kamal-proxy terminates TLS (Let's Encrypt) and
  sets `X-Forwarded-For`, which 8b trusts as the only proxy hop. The owner patches the OS
  (unattended security upgrades enabled).
- **Owner decision: Terraform** for EC2, security groups, RDS, S3, SES, IAM instance role and SSM parameters.
- AWS in Sydney (`ap-southeast-2`). RDS PostgreSQL with automated
  backups and point-in-time recovery; S3 with Block Public Access, TLS-only, versioning, and a lifecycle rule
  that expires old versions after 30 days; SES with a verified domain; secrets in SSM or Secrets Manager.
- Infrastructure as code (see question 6), a runbook, and a documented restore test.

---

## Decisions (2026-09-23)

- Hosting: option (b), EC2 + Kamal + RDS. Infrastructure as code: Terraform.
- Questions 1, 2 and 4 were not answered; the proposals are used (CLI-granted admins without
  document access; own analytics table; Sentry in 8b), and the owner can overrule them.
- Question 3 is open: legal pages use placeholders until business details arrive.

## Open Questions

1. **Admins:** a `role` column granted from the command line, and admins cannot see documents. OK? (Proposed: yes.)
2. **Analytics:** own events table and admin metrics page, no third-party tracker. OK? (Proposed: yes.)
3. **Legal pages:** I need the business details for the drafts: legal entity name, ABN (if any),
   contact email, and the state for governing law. Until then they use placeholders marked for review.
4. **Error tracking (8b):** Sentry (hosted service, free tier; adds `@sentry/nextjs`) or CloudWatch
   logs and alarms only? (Proposed: Sentry.)
5. **Hosting shape (8c):**
   (a) ECS Fargate (web + worker) + RDS + ALB. Managed and reliable, about A$90/month;
   (b) one EC2 instance with Kamal + RDS. About A$40/month, but you patch the server yourself;
   (c) Lightsail container service + Lightsail database. About A$50/month, with fewer controls. (Proposed: (a).)
6. **Infrastructure as code (8c):** AWS CDK in TypeScript (same language as the app) or Terraform? (Proposed: CDK.)
