# RentCert

## Compliance Deadline Reminders & Certificate Vault for Self-Managing Australian Landlords

## 1. ROLE

You are the lead product engineer responsible for designing and implementing RentCert from this specification.

Build a production-quality MVP, not a throwaway prototype.

Priorities, in order:

1. Correctness
2. Simplicity
3. Security
4. Maintainability
5. Good UX
6. Fast implementation
7. Low infrastructure cost

Do not over-engineer.

Do not introduce microservices, Kubernetes, event buses, complex CQRS, or unnecessary infrastructure.

The initial product is intentionally a small SaaS.

---

# 2. PRODUCT

RentCert helps self-managing Australian residential landlords track rental-property compliance deadlines and securely store compliance certificates/reports.

Victoria is the first state with researched compliance rules. Properties in every state and territory are supported (decision 2026-09-23).

Primary customer:

* Australian residential landlord (Victoria first)
* Self-managing
* 1–5 properties
* Not using a professional property manager

Secondary customer:

* Small independent property managers
* Very small portfolios

Core value proposition:

> Never miss a property compliance deadline again.

RentCert is NOT the company performing inspections.

RentCert tracks:

* compliance requirements
* due dates
* completion dates
* certificates/reports
* reminders
* compliance history

The application must clearly state that RentCert is a tracking/document-management product and does not provide legal, electrical, gas, smoke-alarm or other compliance advice.

---

# 3. IMPORTANT LEGAL/COMPLIANCE REQUIREMENT

Do NOT assume that the business rules supplied in this specification are legally authoritative.

The application must make compliance intervals configurable rather than scattering hard-coded values throughout the codebase.

Initial Victorian configuration should be based on verified official Victorian sources before production launch.

Other states and territories start with a generic reminder schedule (the same three checks), clearly labelled as not based on that state's rules. Per-state rules are added later, each verified against that state's official sources.

Potential initial requirements include:

* Smoke alarm compliance/check
* Electrical safety check
* Gas safety check

The system must support:

```text
Requirement
- name
- description
- recurrence interval
- jurisdiction
- active
```

Example:

```text
Smoke Alarm
recurrence: 12 months

Electrical Safety
recurrence: 24 months

Gas Safety
recurrence: 24 months
```

These are initial product configuration values only and must be verified against current official requirements.

Store source/reference information for each compliance requirement.

Example:

```text
source_name
source_url
last_verified_at
```

Do not present legal information as legal advice.

---

# 4. MVP

The MVP must support:

## Authentication

* Sign up
* Sign in
* Sign out
* Password reset
* Email verification
* Account deletion

## Properties

Users can:

* Create property
* Edit property
* View property
* Archive property
* Delete property if permitted

Property fields:

```text
address_line_1
address_line_2
suburb
state
postcode
nickname
notes
lease_start_date
active
```

Properties in every Australian state and territory are supported.

Validate:

```text
state = one of NSW, VIC, QLD, SA, WA, TAS, NT, ACT
postcode = 4-digit Australian postcode (0200–9999)
```

Do not check that the postcode belongs to the state: border towns break simple ranges.

Do not build a complete Australian address database.

---

# 5. COMPLIANCE REQUIREMENTS

Each property has compliance requirements.

Initial types:

```text
smoke_alarm
electrical
gas
```

Do NOT hard-code compliance logic into controllers.

Create a proper domain model.

Suggested structure:

```text
ComplianceRequirement
ComplianceRecord
```

## ComplianceRequirement

Fields:

```text
id
name
code
description
recurrence_months
jurisdiction
active
source_name
source_url
last_verified_at
```

Example:

```text
name: Smoke Alarm Check
code: smoke_alarm
recurrence_months: 12
jurisdiction: VIC
```

## ComplianceRecord

Represents a compliance event for a property.

Fields:

```text
id
property_id
compliance_requirement_id
completed_on
next_due_on
provider_name
provider_license_number
notes
status
created_at
updated_at
```

Status should be calculated where practical rather than unnecessarily persisted.

Possible statuses:

```text
upcoming
due_soon
due
overdue
completed
```

However, historical completed records must remain immutable enough to preserve an audit trail.

---

# 6. DATE CALCULATION

When a property is created:

Use the relevant starting date to calculate initial due dates.

The product must explicitly distinguish between:

```text
lease_start_date
inspection_completed_on
next_due_on
```

Do NOT blindly assume lease start date is always the legal trigger date.

The UI should explain:

> RentCert uses the dates you provide to calculate reminders. Confirm the applicable compliance date with your licensed provider or the official guidance for your state or territory.

When a compliance event is completed:

```text
next_due_on =
completed_on + recurrence_interval
```

Use calendar-aware date arithmetic.

Do not calculate using:

```ts
addDays(completedOn, 365)
addDays(completedOn, 730)
```

for recurring annual/biannual compliance.

Prefer:

```ts
addMonths(completedOn, requirement.recurrenceMonths) // date-fns
```

This avoids incorrect behaviour around leap years and calendar dates.

---

# 7. COMPLIANCE RECORD WORKFLOW

A user opens a property.

They see:

```text
Compliance

Smoke Alarm
Status: Due in 18 days
Next due: 11 Oct 2026

Electrical Safety
Status: Due in 92 days
Next due: 24 Dec 2026

Gas Safety
Status: Overdue
Due: 2 Sep 2026
```

User clicks:

```text
Mark completed
```

Form:

```text
Completed date
Provider
Provider licence number
Notes
Upload certificate/report
```

After saving:

```text
Completed: 23 Sep 2026
Next due: 23 Sep 2027
```

The previous record must remain in compliance history.

---

# 8. DOCUMENT / CERTIFICATE VAULT

Users must be able to upload compliance documents.

Supported initial formats:

```text
PDF
JPG
JPEG
PNG
```

Maximum file size:

```text
10 MB
```

Do not allow arbitrary executable file types.

Documents belong to a compliance record.

Suggested model:

```text
ComplianceDocument
```

Fields:

```text
id
compliance_record_id
filename
content_type
byte_size
storage_key
uploaded_at
```

Use object storage.

Production target:

```text
AWS S3
```

Development:

```text
local storage
```

Use the AWS SDK for S3 (`@aws-sdk/client-s3`) behind a small storage adapter, with a local filesystem adapter for development.

Do not expose public S3 URLs.

Documents must be private.

Downloads should use short-lived signed URLs or controlled downloads through an authorised Next.js route handler.

---

# 9. DOCUMENT SECURITY

Treat uploaded documents as sensitive business documents.

Requirements:

* Private storage
* No public bucket
* Authorisation before download
* Authorisation before deletion
* Content-type validation
* File-size validation
* Filename sanitisation
* Virus/malware scanning should be designed as an extension point
* Never trust the browser-provided MIME type
* Do not execute uploaded files

A user must never be able to access another user's document by modifying an ID in the URL.

Test for IDOR vulnerabilities.

Example:

```text
/users/1/properties/123/documents/456
```

must not expose anything if document 456 belongs to another account.

---

# 10. DASHBOARD

After login, show a useful dashboard.

Example:

```text
Good morning, Niroj

Your compliance overview

5 Properties

2 Due Soon
1 Overdue
12 Up to Date
```

Then:

```text
Upcoming deadlines

Property                 Requirement       Due          Status

12 Smith St              Gas               28 Sep       Due soon
4 Jones Rd               Smoke Alarm       12 Oct       Upcoming
8 Brown Ave              Electrical        4 Nov        Upcoming
```

Provide filters:

```text
All
Overdue
Due Soon
Upcoming
Completed
```

---

# 11. PROPERTY PAGE

Property page should contain:

## Header

```text
12 Smith Street
Narre Warren VIC 3805

Lease started:
12 October 2024
```

Actions:

```text
Edit
Archive
Download Compliance Pack
```

## Compliance summary

Cards for:

```text
Smoke Alarm
Electrical
Gas
```

Each card shows:

```text
Status
Last completed
Next due
Days remaining
```

## Compliance history

Table:

```text
Requirement
Completed
Next due
Provider
Documents
```

---

# 12. COMPLIANCE STATUS RULES

Implement one central status service.

Example:

```ts
ComplianceStatusCalculator
```

Do not duplicate date/status logic across views, controllers and jobs.

Suggested rules:

```text
overdue:
next_due_on < today

due:
next_due_on == today

due_soon:
next_due_on <= today + configured_due_soon_window

upcoming:
otherwise
```

Default due-soon window:

```text
30 days
```

Make it configurable.

---

# 13. REMINDERS

Email reminders are a core MVP feature.

Send reminders:

```text
30 days before
7 days before
```

Also send an overdue reminder.

Suggested:

```text
on due date
7 days overdue
```

Do not repeatedly spam users.

Create a reminder tracking model.

Suggested:

```text
ComplianceReminder
```

Fields:

```text
id
compliance_record_id
reminder_type
scheduled_for
sent_at
status
```

Example:

```text
30_day
7_day
due_date
overdue_7_day
```

Use idempotency.

The same reminder must never accidentally be sent multiple times.

---

# 14. BACKGROUND JOBS

Use a PostgreSQL-backed job queue so no extra infrastructure (such as Redis) is needed.

Recommended production backend:

```text
pg-boss
```

running in a separate worker process built from the same codebase.

Create jobs such as:

```text
SendComplianceRemindersJob
SendReminderEmailJob
```

A scheduled daily job should:

1. Find active compliance records.
2. Determine which reminders are due.
3. Check whether the reminder has already been sent.
4. Send email.
5. Record successful delivery.
6. Record failures.
7. Retry transient failures.

The application must remain functional if email delivery temporarily fails.

---

# 15. EMAILS

Initial emails:

## Welcome

Subject:

```text
Welcome to RentCert
```

## 30-day reminder

Example:

```text
Your gas safety check for 12 Smith Street is due in 30 days.

Due date:
28 October 2026

View property
```

## 7-day reminder

Same concept.

## Due today

Clearly identify that the deadline is today.

## Overdue

Clearly identify:

```text
Your compliance record is overdue.
```

Avoid legal claims such as:

> You are now breaking the law.

unless verified and specifically appropriate.

Use neutral language:

> This record is past the due date entered in RentCert. Please confirm the applicable requirement and arrange the relevant check if required.

---

# 16. COMPLIANCE PACK PDF

User can click:

```text
Download Compliance Pack
```

Generate a PDF containing:

## Cover

```text
RentCert Compliance Pack

Property:
12 Smith Street
Narre Warren VIC 3805

Generated:
23 September 2026
```

## Property details

```text
Address
Lease start
```

## Compliance summary

```text
Smoke Alarm
Last completed
Next due
Status

Electrical
Last completed
Next due
Status

Gas
Last completed
Next due
Status
```

## Compliance history

Include all relevant historical records.

## Documents

For each document:

```text
Document name
Compliance type
Upload date
```

Where practical, append or provide references to the original certificates.

For MVP, the PDF may contain a document index rather than physically merging uploaded PDFs.

Do not claim that the PDF itself is a legally recognised certificate.

---

# 17. PDF TECHNOLOGY

Prefer:

```text
PDFKit (pdfkit)
```

or another mature Node.js PDF library.

Keep PDF generation isolated:

```text
CompliancePackGenerator
```

It should not contain controller logic.

Example:

```ts
await new CompliancePackGenerator(property).generate()
```

---

# 18. SUBSCRIPTIONS

Use Stripe.

Initial plans:

## Property plan

```text
$9 AUD / month / property
```

## Portfolio plan

```text
$19 AUD / month
Up to 5 properties
```

Annual plan can be added after MVP validation.

Do not implement complex billing logic manually.

Stripe is the source of truth for payment state.

Suggested models:

```text
Subscription
BillingAccount
```

Track:

```text
stripe_customer_id
stripe_subscription_id
plan
status
current_period_start
current_period_end
```

---

# 19. STRIPE WORKFLOW

User creates account.

They can add one property during onboarding.

They then see:

```text
Start your free trial
```

if a trial is offered.

Checkout should use Stripe Checkout initially.

Do not build custom credit-card forms.

Use Stripe-hosted checkout.

After successful payment:

```text
Stripe webhook
    ↓
Next.js webhook route handler
    ↓
Verify Stripe signature
    ↓
Update subscription
```

Important Stripe events should include:

```text
checkout.session.completed
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
invoice.payment_failed
```

Webhook processing must be idempotent.

---

# 20. PLAN LIMITS

For MVP:

Free/trial:

```text
1 property
```

Property plan:

```text
1 property
```

Portfolio:

```text
5 properties
```

Enforce limits server-side.

Never rely only on frontend UI.

Example:

```ts
await canAddProperty(user.id)
```

---

# 21. ACCOUNT MODEL

Recommended:

```text
User
```

Fields:

```text
email
email_verified
first_name
last_name
timezone
notification_email
created_at
updated_at
```

The password hash is stored by Better Auth in its account table, not on `User`.

Default timezone:

```text
Australia/Melbourne
```

Do not assume UTC dates when calculating compliance deadlines.

Store timestamps in UTC.

Store dates as dates where the value represents a calendar date.

---

# 22. MULTI-TENANCY

Every user's data must be isolated.

Relationship:

```text
User 1 ─* Property
(Property.userId references User.id: the property's one owner)

User (owner) 1 ─* AccountCollaborator *─ 1 User (collaborator)
(an owner may share all their properties with collaborators; see SPEC-coowner-access.md)
```

Then:

```text
Property 1 ─* ComplianceRecord
ComplianceRecord 1 ─* ComplianceDocument
```

Every query must be scoped through the authenticated user where applicable. Reads and compliance
work use `accessibleBy(userId)` (owner or collaborator); owner-only actions filter by `userId`.

Never do:

```ts
db.property.findUnique({ where: { id: params.id } })
```

in user-facing pages, server actions or route handlers.

Prefer:

```ts
db.property.findFirst({ where: { id: params.id, userId: user.id } })
```

This should be enforced through tests.

---

# 23. AUTHORISATION

For MVP, use a simple authorisation layer.

Plain TypeScript policy functions (for example `canViewProperty(user, property)`) are acceptable. No authorisation library is needed.

Rules:

An owner can:

* view, edit, archive, restore, delete and transfer own properties
* view and create compliance records on own properties
* view, download and delete documents on own properties
* invite and remove collaborators, and revoke invites

A collaborator (someone the owner shared their account with) can, on that owner's properties:

* view properties, compliance records and documents, and download files and compliance packs
* create and edit compliance records, and upload and delete documents
* leave the shared account

A collaborator cannot edit, archive, delete or transfer the owner's properties, invite others, or
see the owner's billing. Writes follow the owner's plan.

No user can access data of an account that has not shared with them.

---

# 24. DATABASE

PostgreSQL.

Initial tables:

```text
users

properties

compliance_requirements

compliance_records

compliance_documents

compliance_reminders

subscriptions

billing_accounts
```

Optional:

```text
audit_events
```

---

# 25. DATABASE CONSTRAINTS

Use database constraints wherever useful.

Examples:

```text
users.email unique

compliance_requirements.code unique

subscriptions.stripe_subscription_id unique

billing_accounts.stripe_customer_id unique
```

Use foreign keys.

Use appropriate indexes.

Important indexes:

```text
properties.user_id

compliance_records.property_id

compliance_records.next_due_on

compliance_records.compliance_requirement_id

compliance_reminders.scheduled_for

compliance_reminders.status
```

---

# 26. AUDIT HISTORY

Compliance data has potential evidentiary value.

Do not silently overwrite historical compliance records.

If a user changes:

```text
completed date
provider
next due date
```

prefer creating an audit record.

MVP can use:

```text
AuditEvent
```

Fields:

```text
user_id
resource_type
resource_id
action
metadata
created_at
```

Examples:

```text
property.created
compliance_record.created
compliance_record.updated
document.uploaded
document.deleted
```

Do not store sensitive document contents in audit metadata.

---

# 27. UI TECHNOLOGY

Recommended stack:

```text
Node.js 24 + TypeScript
Next.js (App Router) + React
PostgreSQL + Prisma
Better Auth
Tailwind CSS
pg-boss (background jobs)
AWS S3 (@aws-sdk/client-s3)
Stripe
Vitest + Playwright
```

Use Next.js as one full-stack application: React server components and server actions for the UI, and route handlers only for webhooks, health checks and file downloads.

Do NOT build a separate SPA and JSON API for the MVP.

The product is primarily CRUD/forms/dashboard/document management, so keep pages server-rendered and use client components only where interaction needs them.

---

# 28. APPLICATION STRUCTURE

Suggested Next.js structure:

```text
prisma/            schema, migrations, seed
src/
  app/             routes: (marketing), (auth), (app), api/
  components/      shared UI components
  server/          server-only code
    services/      domain services
    policies/      authorisation functions
    jobs/          pg-boss job handlers
    mail/          email templates and adapter
    pdfs/          PDF generators
  worker.ts        worker process entry point
tests/
  unit/  integration/  e2e/
```

Services:

```text
ComplianceDueDateCalculator
ComplianceStatusCalculator
ComplianceReminderScheduler
CompliancePackGenerator
SubscriptionManager
```

Avoid putting business logic into pages, components, server actions or route handlers.

Server actions and route handlers should primarily:

```text
authenticate
authorise
load resources
call domain/service logic
render/redirect
```

---

# 29. DOMAIN DESIGN

Important distinction:

A requirement is not the same as a compliance event.

Example:

```text
ComplianceRequirement
    "Gas Safety Check"
```

versus:

```text
ComplianceRecord
    Gas Safety Check
    completed 12 Oct 2024
    next due 12 Oct 2026
    provider = ABC Safety
```

This distinction must be maintained.

---

# 30. ONBOARDING

After signup:

Step 1:

```text
Tell us about your first property
```

Step 2:

```text
Property address
Lease start date
```

Step 3:

```text
Review compliance dates
```

Example:

```text
Based on the dates you've entered:

Smoke alarm
Next reminder: ...

Electrical
Next reminder: ...

Gas
Next reminder: ...
```

Important:

The UI must say these dates are reminders based on user-entered information and do not constitute legal advice.

---

# 31. LANDING PAGE

Create a public marketing page.

Headline:

```text
Never miss a rental compliance deadline again.
```

Subheading:

```text
RentCert helps self-managing Australian landlords track compliance dates,
store certificates and get reminders before important deadlines.
```

CTA:

```text
Start free
```

Secondary:

```text
See how it works
```

Sections:

1. Problem
2. How it works
3. Compliance dashboard screenshot/mockup
4. Certificate vault
5. Reminder emails
6. Pricing
7. FAQ
8. Disclaimer
9. CTA

Do not make unsupported legal claims.

---

# 32. PRICING PAGE

Display:

### Single Property

```text
$9/month
```

### Portfolio

```text
$19/month
Up to 5 properties
```

Optional:

```text
Annual pricing
```

Do not implement annual billing unless explicitly required for MVP.

---

# 33. FAQ

Include:

### Is RentCert a property management system?

No.

### Does RentCert perform inspections?

No.

### Does RentCert issue certificates?

No.

### Can RentCert guarantee legal compliance?

No.

### Who performs safety checks?

Use appropriately qualified/licensed professionals as required by the rules in your state or territory.

### Can I store certificates?

Yes.

---

# 34. SECURITY REQUIREMENTS

Implement:

* CSRF protection
* Secure cookies
* Password hashing
* Rate limiting on authentication endpoints
* Strong password requirements
* Email verification
* Authorisation checks
* Private file storage
* Signed document URLs
* Stripe webhook signature verification
* SQL injection protection through Prisma parameterised queries (no raw SQL string building)
* XSS protection
* Secure headers
* Production HTTPS

Never log:

* passwords
* Stripe secrets
* document contents
* authentication tokens
* signed document URLs

---

# 35. PRIVACY

The product will contain:

* names
* email addresses
* property addresses
* compliance information
* uploaded documents

Build with Australian privacy expectations in mind.

Create:

```text
Privacy Policy
Terms of Service
```

Do not write claims such as "fully compliant with Australian Privacy Act" without legal review.

Provide a mechanism to:

```text
Export account data
Delete account
```

Deletion must handle dependent data appropriately.

---

# 36. OBSERVABILITY

Production application should have:

* structured logs
* error tracking
* job failure monitoring
* basic application metrics
* health endpoint

Example:

```text
/health
```

Response:

```json
{
  "status": "ok"
}
```

Do not expose database credentials or sensitive information through health endpoints.

---

# 37. EMAIL DELIVERY

Use a transactional email provider.

Keep provider abstraction simple.

Example:

```text
Resend
Postmark
AWS SES
```

The provider should be configurable through environment variables.

Do not hard-code provider credentials.

---

# 38. ENVIRONMENT VARIABLES

Example:

```text
DATABASE_URL

BETTER_AUTH_SECRET
BETTER_AUTH_URL

AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AWS_S3_BUCKET

STRIPE_SECRET_KEY
STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET

MAILER_FROM

EMAIL_PROVIDER_API_KEY
```

Never commit secrets.

Provide:

```text
.env.example
```

but never include real credentials.

---

# 39. LOCAL DEVELOPMENT

Provide simple setup:

```bash
bin/setup
bin/dev
```

The README must explain:

```text
Node.js version
Next.js version
PostgreSQL
package manager (npm)
environment variables
database setup
Stripe local webhook testing
S3/local storage
email development
```

Use Docker only if it genuinely simplifies onboarding.

Do not make Docker mandatory if the app can run locally easily.

---

# 40. TESTING

Minimum test coverage:

## Models

Test:

* associations
* validations
* date calculations
* status calculation

## Services

Test:

```text
ComplianceDueDateCalculator
ComplianceStatusCalculator
ComplianceReminderScheduler
```

## Policies

Test:

```text
user A cannot access user B property
user A cannot download user B document
```

## Controllers

Test:

* authentication
* authorisation
* CRUD
* invalid input

## Jobs

Test:

* correct reminders
* no duplicate reminders
* overdue reminders
* failed email handling

## Stripe

Test:

* webhook signature
* duplicate webhook
* subscription activation
* cancellation
* failed payment

## PDF

Test:

* property information
* compliance records
* document index

---

# 41. ACCEPTANCE TESTS

The following must work before calling the MVP complete.

### Scenario 1

User signs up.

Expected:

```text
Account created.
Email verification requested.
```

### Scenario 2

User creates property.

Expected:

```text
Property created.
Initial compliance schedule displayed.
```

### Scenario 3

User marks gas check completed.

Expected:

```text
Compliance record saved.
Next due date calculated.
```

### Scenario 4

User uploads PDF certificate.

Expected:

```text
Document stored privately.
Document appears on compliance record.
```

### Scenario 5

User tries to access another user's property.

Expected:

```text
403 or 404.
No data leakage.
```

### Scenario 6

Reminder becomes due.

Expected:

```text
One email sent.
Reminder marked sent.
```

Running scheduler again must NOT send another copy.

### Scenario 7

User downloads Compliance Pack.

Expected:

```text
Valid PDF.
Correct property.
Correct compliance history.
Correct generation date.
```

### Scenario 8

User subscribes through Stripe.

Expected:

```text
Stripe checkout
→ webhook
→ subscription activated
→ property limit updated
```

### Scenario 9

Stripe sends the same webhook twice.

Expected:

```text
No duplicate subscription state.
```

---

# 42. ADMIN

MVP requires a minimal admin interface.

Admin should be able to:

```text
View users
View properties
View subscription status
View compliance requirement configuration
```

Admin must NOT have unrestricted access to private documents by default.

If document access is required for support, it must be explicit and audited.

Do not build a huge admin system.

---

# 43. COMPLIANCE CONFIGURATION

Do not hard-code:

```ts
addMonths(date, 12)
addMonths(date, 24)
```

throughout the application.

Instead:

```ts
(await db.complianceRequirement.findUniqueOrThrow({ where: { code: "smoke_alarm" } })).recurrenceMonths
```

This allows future jurisdictions.

Example future configuration:

```text
VIC
NSW
QLD
```

Potential future requirement:

```text
NSW smoke alarm
QLD smoke alarm
```

For the MVP, only Victorian rules are researched and configured. Properties in other states use a generic schedule labelled as not state-specific.

Do not configure NSW/QLD or other state-specific rules until each is verified against official sources.

---

# 44. FUTURE ARCHITECTURE

Potential future features:

```text
NSW
QLD
SA
WA
TAS
ACT
NT
```

Potential future product tiers:

```text
Landlord
Portfolio
Property Manager
Agency
```

Potential future integrations:

```text
Safety inspection providers
Xero
PropertyMe
PropertyTree
Inspection Manager
Calendar
Google Calendar
Outlook Calendar
```

Potential future automation:

```text
Automatic booking with inspection providers
Provider marketplace
Certificate verification
AI document extraction
Compliance anomaly detection
```

Do not implement these now.

---

# 45. PARTNERSHIP FEATURE

Design the system so a safety provider can eventually refer a customer.

Future concept:

```text
Partner
PartnerReferral
```

But this does NOT need to be implemented in MVP.

Do not spend MVP development time on a partner portal.

A referral code can be introduced later.

---

# 46. SEO

Create public pages:

```text
/
 /victoria-rental-compliance
 /victoria-electrical-safety-check
 /victoria-gas-safety-check
 /victoria-smoke-alarm-requirements
```

However, do not publish legal/compliance content until it has been checked against current official sources.

SEO pages should provide useful information rather than keyword stuffing.

---

# 47. ANALYTICS

Track basic product events:

```text
signup
property_created
compliance_record_created
document_uploaded
reminder_sent
compliance_pack_downloaded
checkout_started
subscription_started
```

Do not send document contents or sensitive property information to analytics providers.

---

# 48. MVP UI STYLE

Design should feel:

```text
Trustworthy
Calm
Professional
Simple
Australian
```

Avoid:

```text
Enterprise dashboard complexity
Too many colours
Huge navigation
Unnecessary charts
```

Primary navigation:

```text
Dashboard
Properties
Documents
Billing
Account
```

Mobile responsive.

A landlord should be able to check a property from their phone.

---

# 49. EMPTY STATES

Create useful empty states.

No properties:

```text
Add your first property

Start tracking your compliance deadlines and certificates.

[Add property]
```

No documents:

```text
No certificates uploaded yet.

Upload your first compliance certificate.
```

No upcoming deadlines:

```text
You're all caught up.
```

---

# 50. ERROR HANDLING

Errors must be human-readable.

Bad:

```text
ActiveRecord::RecordInvalid
```

Good:

```text
We couldn't save this compliance record.
Please check the completed date and try again.
```

Do not hide errors from logs.

Do not expose stack traces in production.

---

# 51. ACCESSIBILITY

Target WCAG 2.1 AA where practical.

Requirements:

* keyboard navigation
* visible focus states
* semantic HTML
* labels for forms
* accessible error messages
* sufficient contrast
* buttons must have clear labels
* no information conveyed by colour alone

---

# 52. PERFORMANCE

The MVP should comfortably support:

```text
10,000 users
50,000 properties
```

without architectural changes.

Do not optimise prematurely.

Avoid N+1 queries.

Use eager loading where appropriate.

Paginate:

```text
properties
compliance history
documents
```

---

# 53. BACKUP / RECOVERY

Production database:

* automated backups
* point-in-time recovery where supported

S3:

* versioning where appropriate
* lifecycle policies where appropriate

Do not promise users a specific recovery time unless infrastructure supports it.

---

# 54. DEPLOYMENT

Preferred initial deployment:

```text
AWS
```

Possible simple architecture:

```text
Internet
   |
Load Balancer / HTTPS
   |
Next.js application + worker
   |
PostgreSQL
   |
S3
   |
Email provider
   |
Stripe
```

Do not introduce Kubernetes.

A simple container deployment is preferred.

Possible:

```text
AWS ECS
or
AWS App Runner
or
Kamal
```

Choose the simplest option that provides reliable deployment.

---

# 55. CI/CD

Use GitHub Actions.

Pipeline:

```text
push / PR
   ↓
npm ci
   ↓
lint
   ↓
security checks
   ↓
tests
   ↓
build
```

Suggested tools:

```text
ESLint
TypeScript (tsc --noEmit)
npm audit
Vitest
Playwright
```

Do not make CI unnecessarily slow.

---

# 56. SEED DATA

Create seed data for local development.

Example:

```text
3 compliance requirements
1 demo user
2 demo properties
multiple compliance records
sample statuses
```

Do not seed real people's data.

---

# 57. DEVELOPMENT PHASES

Build in this order.

## Phase 1 — Foundation

* Next.js application
* PostgreSQL
* authentication
* Tailwind
* base layout
* User model

## Phase 2 — Properties

* Property model
* CRUD
* dashboard
* authorisation
* tests

## Phase 3 — Compliance

* ComplianceRequirement
* ComplianceRecord
* due date calculation
* status calculation
* compliance history

## Phase 4 — Documents

* S3 storage adapter
* upload
* download
* delete
* authorisation
* tests

## Phase 5 — Reminders

* reminder model
* scheduled jobs
* email templates
* idempotency
* tests

## Phase 6 — PDF

* CompliancePackGenerator
* PDF download
* tests

## Phase 7 — Stripe

* pricing
* Stripe Checkout
* subscriptions
* webhooks
* plan limits

## Phase 8 — Production hardening

* security
* monitoring
* error handling
* privacy
* terms
* backups
* CI/CD

---

# 58. DO NOT BUILD YET

Explicitly avoid:

* Tenant portal
* Rent collection
* Maintenance management
* Property listings
* Accounting
* Agency CRM
* Complex calendar
* Mobile native apps
* AI assistant
* Chatbot
* State-specific compliance rules outside Victoria (generic schedule only)
* Provider marketplace
* Automatic inspection booking
* Advanced analytics
* Microservices
* Kubernetes
* Event-driven architecture

The MVP must remain small.

---

# 59. PRODUCT VALIDATION

The product should support the following validation hypothesis:

> Australian self-managing landlords with 1–5 properties, starting in Victoria, will pay approximately $9–19/month for a simple compliance reminder and certificate-storage product.

Do not assume this hypothesis is true.

The product should make it easy to measure:

```text
visitor
→ signup
→ property added
→ certificate uploaded
→ reminder received
→ checkout started
→ paid
```

These are the important conversion points.

---

# 60. BUSINESS METRICS

Track:

```text
Visitor → signup conversion
Signup → property conversion
Property → certificate upload
Trial → paid
Monthly churn
MRR
Properties per customer
Reminder engagement
Compliance Pack downloads
```

Do not build a complicated analytics system.

---

# 61. LANDING PAGE COPY PRINCIPLES

Do not claim:

```text
Guaranteed compliance
Never get fined
100% legally compliant
VCAT-proof
Government approved
```

unless independently verified and legally reviewed.

Prefer:

```text
Keep your compliance records organised.
Get reminders before the dates you've entered.
Store certificates in one secure place.
```

---

# 62. IMPORTANT PRODUCT DISTINCTION

RentCert tracks information.

It does not determine whether a property is legally compliant.

For example:

If a user enters:

```text
Gas check completed:
1 January 2025
```

RentCert can calculate:

```text
Next reminder:
1 January 2027
```

based on the configured recurrence.

It must not state:

```text
Your property is legally compliant until 1 January 2027.
```

This distinction is critical.

---

# 63. CODING STANDARDS

Follow standard Next.js App Router and TypeScript conventions.

Prefer:

```ts
db.property.findFirst({ where: { id: params.id, userId: user.id } })
```

over custom global lookup mechanisms.

Prefer small services over giant service objects.

Prefer domain-oriented names.

Avoid:

```text
God objects
Fat controllers
Duplicated date logic
Magic numbers
Callbacks for complex business logic
Premature abstractions
```

Use clear names.

---

# 64. API

MVP does not require a public API.

Keep the application server-rendered.

If an internal JSON endpoint is needed for UI behaviour, keep it private.

Do not build API authentication until there is an actual API consumer.

---

# 65. DEFINITION OF DONE

The MVP is complete when:

* User can sign up
* User can create a property
* Compliance schedule appears
* User can record compliance completion
* Due dates calculate correctly
* Statuses display correctly
* User can upload certificates
* Documents are private
* User can download documents
* User receives reminders
* Duplicate reminders are prevented
* User can download Compliance Pack PDF
* Stripe subscription works
* Property limits work
* Another user cannot access their data
* Tests pass
* Security scans pass
* Production configuration is documented
* README is complete
* Legal/compliance wording is clearly qualified
* No major N+1 queries
* CI passes

---

# 66. CLAUDE EXECUTION INSTRUCTIONS

Do not attempt to build the entire application in one enormous response.

Work incrementally.

Before implementing a major phase:

1. Inspect the existing repository.
2. Understand the current architecture.
3. Identify what already exists.
4. Propose the smallest change required.
5. Implement it.
6. Run tests.
7. Fix failures.
8. Review security implications.
9. Commit-ready state.
10. Move to the next phase.

If starting from an empty repository:

First create the project foundation.

Then implement Phase 1 only.

Do not jump ahead.

---

# 67. IMPORTANT CLAUDE BEHAVIOUR

When requirements are ambiguous:

Do not silently invent business rules.

Identify the ambiguity.

For legal/compliance requirements:

* flag assumptions
* isolate them in configuration
* recommend verification against current official sources for the relevant state or territory

For technical decisions:

Choose the simplest production-appropriate solution.

Do not introduce technology merely because it is fashionable.

---

# 68. REQUIRED FIRST RESPONSE FROM CLAUDE

Before writing application code, Claude should produce:

### A. Architecture summary

Show:

```text
Browser
   ↓
Next.js (React + Node.js)
   ↓
PostgreSQL
   ↓
S3
   ↓
Email
   ↓
Stripe
```

### B. Domain model

Show relationships between:

```text
User
Property
ComplianceRequirement
ComplianceRecord
ComplianceDocument
ComplianceReminder
Subscription
BillingAccount
```

### C. Implementation plan

Show Phase 1–8.

### D. Identified ambiguities

Especially:

* Victorian compliance rules
* date calculation source
* reminder semantics
* subscription trial
* document retention
* account deletion

### E. Then begin Phase 1.

Do not ask unnecessary questions.

Make sensible technical defaults.

Only stop and ask the user when a decision materially affects product behaviour, legal correctness, security, or architecture.

---

# 69. FINAL PRINCIPLE

Build the smallest credible product that can get the first 10 paying customers.

Do not optimise for technical sophistication.

Optimise for:

```text
Landlord signs up
        ↓
Adds property
        ↓
Sees upcoming compliance dates
        ↓
Uploads certificate
        ↓
Receives useful reminder
        ↓
Downloads compliance history
        ↓
Keeps paying because it prevents forgotten deadlines
```

That is the core product.

Everything else is secondary.
