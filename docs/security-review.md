# Security review (Phase 8b)

Date: 2026-09-24. Scope: the application code in this repository. Infrastructure (EC2, RDS, S3,
SES, kamal-proxy) is reviewed in Phase 8c. This review is not a penetration test.

## Route inventory

Every page and action under `src/app/(app)/` calls `requireUser()` or `requireAdmin()`, and every
API route is on a reviewed list. `tests/integration/architecture.test.ts` enforces both, so a new
unprotected route fails the build.

| Route | Access | Check |
|---|---|---|
| `(app)/**` pages and actions | Verified user | `requireUser()`; data functions take `userId` and filter by it |
| `(app)/admin/**` | Admin | `requireAdmin()` (404 for others); every view and change audited |
| `(auth)/**`, `(marketing)/**` | Public | No user data rendered |
| `/api/auth/[...all]` | Public | Better Auth, with database-backed rate limits |
| `/api/documents/[id]/download` | Owner | Session plus owner-scoped lookup; 404 otherwise |
| `/api/properties/[id]/compliance-pack` | Owner | Session plus owner-scoped lookup; 404 otherwise |
| `/api/account/export` | Owner | Session; the user's own rows only |
| `/api/webhooks/stripe` | Stripe | Signature on the raw body; idempotent by event id |
| `/api/health` | Public | Returns only `ok` or `degraded` |
| `/api/visit` | Public | Increments a daily counter; no input is read |

## OWASP Top 10 (2021) checklist

| Risk | Status | Evidence |
|---|---|---|
| A01 Broken access control | Addressed | Owner-scoped data layer; the architecture test limits each user-owned table to its module; IDOR tests for properties, compliance, documents, packs, export and admin |
| A02 Cryptographic failures | Addressed | Passwords hashed by Better Auth (scrypt); TLS at kamal-proxy; S3 SSE; RDS encryption (8c); HSTS in production |
| A03 Injection | Addressed | Prisma parameterised queries; raw SQL uses tagged templates only; Zod validation on every input; no `dangerouslySetInnerHTML` |
| A04 Insecure design | Addressed | Specs per phase; plan limits and read-only mode enforced on the server; idempotent reminders and webhooks |
| A05 Security misconfiguration | Addressed | Nonce CSP, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`; no `X-Powered-By`; dev-only adapters refuse to run in production |
| A06 Vulnerable components | Addressed | `npm audit --audit-level=high` in CI (0 findings); overrides for `mysql2` and `deepmerge-ts` |
| A07 Identification and authentication failures | Addressed | Email verification required; 12-character minimum; rate limits keyed on the proxy-verified client IP; sessions revoked on password reset; no user enumeration on sign-up or reset |
| A08 Software and data integrity failures | Addressed | Stripe signature verification; lockfile in CI (`npm ci`); SHA-256 recorded for every document |
| A09 Logging and monitoring failures | Addressed | Structured JSON logs with redaction; Sentry (when the DSN is set); job-health alerts; audit events |
| A10 Server-side request forgery | Not applicable | The app fetches no user-supplied URLs; requirement source URLs are only rendered as links (https only) |

## Other checks

- **Cookies:** Better Auth sets `HttpOnly` and `SameSite=Lax`, and `Secure` when `BETTER_AUTH_URL`
  is `https://` (production).
- **File uploads:** type from magic bytes; 10 MB limit (database constraint as well); always
  downloaded as `attachment` with `nosniff`, never shown inline.
- **Secrets:** only in environment variables; `.env` is gitignored; `.env.example` holds no values.
- **Personal data in logs and error reports:** redacted by `src/server/logger.ts` and `beforeSend`
  in `src/lib/sentry-options.ts` (unit tested).
- **Rate limiting behind the proxy:** `TRUSTED_PROXY_CIDRS` must list kamal-proxy's network in
  production. Otherwise a multi-value `X-Forwarded-For` is not trusted, and clients share one bucket.

## Known limitations and follow-ups

1. No malware scanning of uploads yet (hook in place; Phase 8c or later: S3 GuardDuty malware protection).
2. `style-src 'unsafe-inline'` is allowed (inline style attributes from React). Scripts are nonce-only.
3. A second reminder email is possible if the database fails straight after SES accepts a send.
4. Legal pages are drafts pending legal review and business details.
5. An external penetration test is recommended before handling significant numbers of customers.
