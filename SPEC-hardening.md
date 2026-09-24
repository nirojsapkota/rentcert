# Spec: hardening (Phase 8)

Status: 8a IMPLEMENTED (2026-09-23); 8b IMPLEMENTED (2026-09-24); 8c IMPLEMENTED as code (2026-09-24); not applied or deployed. Module id: `hardening`. Depends on: all earlier modules.
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

## 8b. Production hardening (approved 2026-09-24)

### Content-Security-Policy (nonce-based)

- `src/proxy.ts` (Next.js 16 Proxy) generates a nonce per request and sets:
  `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'; style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self';
  form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests` (development adds `'unsafe-eval'`).
- Nonces need dynamic rendering, so the few static pages (landing, pricing, legal, auth forms)
  become dynamic. The cost is small at our traffic.
- `style-src 'unsafe-inline'` stays because React and Next inject inline styles. Scripts are the
  risk that CSP closes, and they are nonce-only.
- Sentry events go through a same-origin tunnel route, so `connect-src` stays `'self'`.
- A test checks the header on a page and that no inline script runs without the nonce.

### Trusted client IP for rate limiting

- Better Auth `advanced.ipAddress`: `ipAddressHeaders: ["x-forwarded-for"]` and
  `trustedProxies` set to the Docker network range kamal-proxy connects from
  (`TRUSTED_PROXY_CIDRS`, for example `172.18.0.0/16`). The chain is walked right to left, so a
  client-supplied `x-forwarded-for` value can no longer choose its own rate-limit bucket.
- The app port is reachable only from kamal-proxy (8c security group and Docker network).
- A test sends a spoofed header through a simulated proxy chain and checks the rate limit still applies.

### Structured logs

- `pino` JSON logs in web and worker, with `requestId` (from `x-request-id`, set in the Proxy if
  missing), level, message and module. Redaction paths remove cookies, authorization, tokens,
  passwords, signed URLs (`X-Amz-Signature`), storage keys and email addresses.
- Existing `console.*` calls move to the logger. A unit test checks that redaction works.

### Error tracking and alerts

- **Sentry** (`@sentry/nextjs`) for web and worker, disabled when `SENTRY_DSN` is unset.
  `sendDefaultPii: false`; `beforeSend` strips cookies, headers, query strings and request bodies;
  traces are sampled at 10 % for basic performance metrics.
- **Job alerts:** an hourly check reports to Sentry, and emails `ALERT_EMAIL`, when reminders
  reached `FAILED` in the last 24 hours, pg-boss has failed jobs, or the worker heartbeat is
  older than 10 minutes.
- **Health:** `/api/health` returns `{"status":"ok"}` only when the database answers and the worker
  heartbeat (written every minute to `app_settings`) is fresh. Otherwise it returns 503
  `{"status":"degraded"}`, with no detail.

### Error pages

`app/error.tsx`, `app/global-error.tsx` and `not-found.tsx` show plain messages with a reference id
(the Sentry event id). There are no stack traces in production (Next.js default, checked by a test
against `next start`).

### Security review pass

`docs/security-review.md`: an OWASP Top 10 checklist with findings and fixes; cookie flags in
production (`Secure`, `HttpOnly`, `SameSite=Lax`); `npm audit`; a list of every route with its
auth check, cross-checked against the IDOR tests; secrets kept only in the environment.

### Needs from you (8b)

- A Sentry account and project DSN (free tier is fine). The code ships without it and turns on once
  `SENTRY_DSN` is set.
- An address for `ALERT_EMAIL`.

## 8c. Deployment (DRAFT, awaiting review)

Owner decisions: one EC2 instance with Kamal, plus RDS (about A$40–50/month); Terraform.

### What gets built (code only)

I write and validate everything locally (`terraform validate`, `terraform plan` only when you ask,
`docker build`). **I do not run `terraform apply` or `kamal deploy`**: those create billable AWS
resources and publish the app, so you run them, following the runbook.

**Container image** (`Dockerfile`, multi-stage, `node:24-slim`, ARM64):
- One image with two commands: `web` (`next start -p 3000`) and `worker` (`npm run worker`).
- Runs as a non-root user. `prisma` moves to runtime dependencies so migrations can run from the image.

**Kamal** (`config/deploy.yml`, `.kamal/secrets`):
- Roles `web` and `worker` on the same host. kamal-proxy terminates TLS (Let's Encrypt) for your
  domain, with its health check on `/api/health`.
- A pre-deploy hook runs `prisma migrate deploy` from the new image before the switch.
- Secrets come from one AWS Secrets Manager secret through Kamal's `aws_secrets_manager` adapter.
  Nothing secret is in the repo.
- `TRUSTED_PROXY_CIDRS` is set to the Kamal Docker network, and `HEALTH_CHECK_WORKER=true`.

**Terraform** (`infra/`, region `ap-southeast-2`):

| Resource | Settings |
|---|---|
| VPC | 2 public subnets (EC2), 2 private subnets (RDS), no NAT gateway (cost) |
| EC2 | `t4g.small` (2 vCPU, 2 GB, ARM), Ubuntu 24.04, Docker via user-data, unattended security upgrades, Elastic IP, encrypted 30 GB gp3, IMDSv2 only |
| Security groups | 80/443 from anywhere; 22 as decided in question 2; the app port is never exposed |
| RDS | PostgreSQL 16 `db.t4g.micro`, private, encrypted, automated backups 7 days (point-in-time recovery), deletion protection, access from the EC2 security group only |
| S3 (documents) | Private, Block Public Access, SSE-S3, TLS-only bucket policy, versioning, old versions expire after 30 days |
| SES | Domain identity with DKIM, MAIL FROM domain; production access requested manually |
| ECR | Private repository, scan on push, keep the last 20 images |
| IAM | Instance role limited to that bucket, SES send from the domain, reading that one secret, ECR pull. A GitHub OIDC role for CI to push images |
| Secrets Manager | One JSON secret with the app's environment (values filled in by you) |
| Budget | AWS Budgets alert at A$60/month |

**CI/CD** (`.github/workflows/deploy.yml`): on `main`, after the existing checks pass, build the
ARM image, push to ECR with the OIDC role, then deploy (see question 2).

**Docs:** `docs/runbook.md` (first deploy, deploy, rollback `kamal rollback`, logs, secrets
rotation, DB restore to a point in time), and `docs/restore-test.md` (a restore drill with its result
recorded after you run it).

### Decisions (2026-09-24)

- **No domain yet:** `domain` is a Terraform variable and a Kamal environment value. SES,
  DNS records and HTTPS are created only once it is set. First deploy waits for a domain.
- **Deploys from GitHub Actions** over SSH **tunnelled through AWS Systems Manager**
  (`AWS-StartSSHSession`), using GitHub OIDC credentials. Port 22 is closed to the internet, and
  there are no long-lived AWS keys in GitHub.
- **EC2 `t3.small` (x86)** instead of `t4g.small`, so images build natively on standard GitHub
  runners (about US$4/month more).
- **Terraform state:** S3 bucket with native locking (`use_lockfile`), created by `infra/bootstrap`.
- **Cost-first (owner decision):** PostgreSQL 16 runs on the EC2 host as a Kamal accessory instead of
  RDS (saves about US$18/month). Data sits on a separate encrypted EBS volume, with hourly `pg_dump`
  to a private S3 bucket (30 days), daily EBS snapshots (7 days), and an alert when the newest dump
  is older than 2 hours. SSM Parameter Store (free) replaces Secrets Manager. `t3` standard CPU
  credits (no surprise charges). Budget alert at US$30. RDS returns once there is revenue.
- **AWS profile:** `rentcert` (IAM user `rentcert-terraform`), never root.
- **Health checks:** kamal-proxy checks `/api/health?scope=web` (database only), so the first
  deploy can pass before any worker heartbeat exists. External monitoring uses `/api/health`
  (database plus worker).

### Needs from you (8c)

1. **Domain and DNS:** which domain (for example `app.rentcert.com.au`), and is DNS in Route 53?
   If yes, Terraform creates the A, DKIM and MAIL FROM records. If not, it prints them for you to add.
2. **How deploys reach the server (SSH for Kamal):**
   (a) Deploy from your laptop only: port 22 open to your IP. Simple and tight, but no automatic deploys.
   (b) Deploy from GitHub Actions: port 22 open to the internet with key-only SSH and fail2ban.
   (c) GitHub Actions through Tailscale: port 22 closed to the internet; needs a free Tailscale account.
   (Proposed: (a) now, and (c) once you want automatic deploys.)
3. **Terraform state:** an S3 bucket with state locking (created by a small bootstrap step). (Proposed: yes.)
4. **AWS credentials (security):** the AWS CLI on this machine is signed in with the **root
   account's access keys**. Please create an IAM user or IAM Identity Center user with admin
   rights for Terraform, turn on MFA, and delete the root access keys. The Terraform code assumes a
   non-root profile named `rentcert`.

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
