# RentCert

Compliance deadline reminders and a certificate vault for self-managing Victorian landlords.

RentCert is a tracking and document-storage tool. It does not provide legal, electrical, gas,
smoke alarm or other compliance advice.

Product requirements: `PLAN.md`. Build order and module status: `CAPABILITY_MAP.md`.
Current phase spec: `SPEC-foundation.md`.

## Requirements

| Tool | Version |
|---|---|
| Node.js | 24 or later |
| npm | 11 or later |
| PostgreSQL | 16 or later |
| Next.js | 16 (installed by npm) |

Docker is not required.

## Setup

```bash
bin/setup   # creates .env, installs packages, migrates dev and test databases, installs Playwright Chromium
bin/dev     # starts http://localhost:3000
```

`bin/setup` creates `.env` from `.env.example` on the first run and generates `BETTER_AUTH_SECRET`.
Edit `DATABASE_URL` and `TEST_DATABASE_URL` if your PostgreSQL user or host differ.
Prisma creates the databases when they do not exist.

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection for the app |
| `TEST_DATABASE_URL` | PostgreSQL connection for Vitest and Playwright (data is truncated on every run) |
| `BETTER_AUTH_SECRET` | Signs sessions and tokens. At least 32 random bytes. |
| `BETTER_AUTH_URL` | Public base URL of the app, used in email links |
| `EMAIL_PROVIDER` | `console` (dev), `file` (writes `tmp/mail/*.json`), `test` (in memory). Production providers arrive in Phase 5. |
| `MAILER_FROM` | From address for emails |
| `EMAIL_PROVIDER_API_KEY` | Production email provider key (Phase 5) |
| `COMPLIANCE_DUE_SOON_DAYS` | Days before a due date that counts as "due soon" (default 30) |
| `STORAGE_DRIVER` | `local` (development, tests) or `s3` (production) |
| `STORAGE_LOCAL_PATH` | Folder for local document storage (default `storage/`, gitignored) |
| `AWS_REGION`, `AWS_S3_BUCKET` | Private bucket for `STORAGE_DRIVER=s3`. Credentials come from the AWS credential chain, never from `.env` in production. |

Stripe and AWS S3 variables are added in the phases that need them (see `PLAN.md` section 38).
Never commit `.env`.

## Email in development

With `EMAIL_PROVIDER=console`, emails print to the `bin/dev` terminal between `[mail]` markers.
Copy the verification or reset link from there. The console and file adapters refuse to run in production.

## Tests

```bash
npm test                                   # Vitest: unit + integration against TEST_DATABASE_URL
npm test -- tests/unit/greeting.test.ts    # one file
npm test -- -t "rejects a blank first name"  # one test by name
npm run test:e2e                           # Playwright: starts next dev on port 3100 against the test database
npm run lint
npm run typecheck                          # generates Next.js route types, then runs tsc
```

## Database

```bash
npm run db:migrate -- --name <change>   # create and apply a migration in development
npm run db:seed                         # demo@rentcert.local / demo-password-123, 3 fictional properties with sample compliance records
npx prisma studio                       # browse data
```

## Document storage

Uploads (PDF, JPG, PNG, up to 10 MB) go through the app, which checks the file bytes before
storing them. In development they are written to `storage/`. With `STORAGE_DRIVER=s3` they go to
a private bucket with server-side encryption, and downloads redirect to presigned URLs that
expire after 60 seconds. The bucket must block all public access.

## Not yet covered

Stripe local webhook testing (Phase 7) and email providers (Phase 5) are documented when those
phases land.
