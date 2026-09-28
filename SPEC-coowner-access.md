# Spec: coowner-access (Phase 9)

Status: IMPLEMENTED (2026-09-28). Module id: `coowner-access`. Depends on: `properties`,
`compliance`, `vault`, `reminders`, `billing`.
Source: the owner's co-owner access brief and decisions (2026-09-28). Changes PLAN.md sections 22
and 23.

Stack, commands, code style and boundaries from `SPEC-foundation.md` apply unchanged.

---

## Objective

An owner shares their RentCert account's properties with other people (a spouse, a sibling, a
family trust member), who work on them with their own login. Sharing is **per owner**: a
collaborator sees every property the owner has, including ones added later. Billing does not
change: properties count against the owner's plan only.

User stories:

- As an owner, I invite someone by email from the "Sharing" page.
- As an invitee, I open the link, sign in or create an account, accept, and see the owner's
  properties.
- As an owner, I see pending invites and collaborators, and I revoke either at any time.
- As an owner, I transfer one property to a collaborator.
- As a collaborator, I record checks, upload and download certificates, get reminder emails for
  the owner's properties, and can leave.

Per-property sharing and finer controls are a later phase.

## Decisions (2026-09-28)

- One owner per property, kept in `Property.userId` (`NOT NULL`, so never zero owners). Billing,
  plan limits, archive and restore keep using it. No `OWNER` membership rows and no backfill.
- Sharing is account-level: one collaborator row per (owner, collaborator) pair.
- Accepting needs a verified account whose email matches the invite (case-insensitive).
- Property edit, archive, restore and delete stay owner-only.
- A collaborator's export lists their memberships only, not the owner's records or files.
- An owner can delete their account while shared: the confirm screen warns, and collaborators get
  an email afterwards (see "Account deletion").
- Limits are per owner: at most 5 collaborators plus pending invites, and at most 10 invite
  emails per day.

## Conflicts with PLAN.md

PLAN.md section 22 (`User 1 ─* Property`) and section 23 ("view own properties", "No user can
access another user's data") change. Section 22 becomes "a property has one owner; an owner may
share all their properties with collaborators". Section 23 lists what each role may do. Accounts
with no sharing between them stay fully isolated.

## Data model

```prisma
model AccountCollaborator {
  id        String   @id @default(uuid(7)) @db.Uuid
  ownerId   String   @map("owner_id")    // FK users, ON DELETE CASCADE
  memberId  String   @map("member_id")   // FK users, ON DELETE CASCADE
  createdAt DateTime @default(now()) @map("created_at")

  @@unique([ownerId, memberId])
  @@index([memberId])
  @@map("account_collaborators")
}

model SharingInvite {
  id         String    @id @default(uuid(7)) @db.Uuid
  ownerId    String    @map("owner_id")                  // FK users, ON DELETE CASCADE
  email      String                                      // lower-cased
  tokenHash  String    @unique @map("token_hash")        // SHA-256; the token itself is never stored
  expiresAt  DateTime  @map("expires_at")
  acceptedAt DateTime? @map("accepted_at")
  createdAt  DateTime  @default(now()) @map("created_at")

  @@unique([ownerId, email])   // re-inviting replaces the pending invite
  @@map("sharing_invites")
}
```

A database `CHECK (owner_id <> member_id)` stops self-sharing. Ids and columns follow the other
tables (`uuid(7)`, snake_case).

`ComplianceReminder` gains a recipient `userId` (FK, ON DELETE CASCADE). The unique key becomes
`(compliance_record_id, reminder_type, user_id)`. The migration backfills `user_id` with the
property owner for existing rows.

Both new tables join the Vitest truncate list, the Playwright global setup, and the
architecture test's model-ownership list (owned by `src/server/sharing/`).

## Access rules (one place)

`src/server/properties/access.ts` exports:

- `accessibleBy(userId)`: a `Prisma.PropertyWhereInput` of
  `{ OR: [{ userId }, { user: { collaborators: { some: { memberId: userId } } } }] }`.
- `findPropertyForMember(userId, propertyId)`: the property plus the caller's role
  (`"OWNER" | "COLLABORATOR"`), or null.

Every query that today filters by `property: { userId }` for reading or compliance work changes to
`property: accessibleBy(userId)`:

| Area | Files |
|---|---|
| Property reads | `properties/queries.ts` (find, list, dashboard) |
| Compliance | `compliance/queries.ts` (record lookup, schedule, dashboard statuses), `compliance/commands.ts` |
| Documents | `vault/queries.ts`, `vault/commands.ts`, `/api/documents/[id]/download`, `/documents` page |
| Compliance pack | `compliance-pack/load.ts`, `/api/properties/[id]/compliance-pack` |
| Reminders | `reminders/queries.ts`, `compliance/queries.ts` `listReminderCandidates` |

Owner-only paths keep `{ id, userId }`: property create, edit, archive, restore, delete, transfer,
and the Sharing page. Unknown, foreign and non-member ids still all return `notFound()`.

| Action | Owner | Collaborator |
|---|---|---|
| View properties (active and archived), schedules, history, documents; download files and compliance packs | yes | yes |
| Record and edit completions, setup wizard, "not applicable", upload and delete documents | yes | yes |
| Add, edit, archive, restore, delete or transfer a property | yes | no |
| Invite, revoke invites, remove collaborators | yes | no |
| Leave | — | yes |
| See the owner's plan or billing | yes | no |

**Write entitlement comes from the owner.** Compliance writes and uploads check the property
owner's `canWrite`, not the acting user's. A collaborator whose own trial ended can still work on
the properties of an owner who pays. If the owner's plan lapses to read-only, their collaborators
are read-only on those properties too.

There are no per-property reminder settings. Each person keeps their own account-level
`reminderEmailsEnabled` switch.

## Invite flow

1. Owner opens `/sharing` and enters an email.
2. Refused with a plain message: the owner's own email, an existing collaborator, more than 5
   collaborators plus pending invites, or more than 10 invite emails in the last 24 hours
   (counted from `sharing.invite_sent` audit events, so re-sends count).
3. Otherwise create or replace the `SharingInvite` (32 random bytes, base64url, 7-day expiry) and
   send an email through `deliver()` with the link `/invites/<token>`. The email names the owner's
   first name only: no addresses.
4. `/invites/[token]` (outside `(app)`, so signed-out people can open it):
   - Invalid, expired, accepted or revoked token: one message, "This invite is no longer valid.
     Ask the owner to send a new one."
   - Signed out: "Sign in or create an account to accept." Links carry `?invite=<token>`, and
     sign-in, sign-up and email verification return to `/invites/<token>`. Only that path shape
     is accepted as a return target (no open redirect).
   - Signed in: shows the owner's first name, the number of properties, and an **Accept** button.
     Acceptance is always an explicit click, even for existing users.
5. Accept requires a verified account whose email matches the invite. A mismatch shows "This
   invite was sent to a different email address. Sign in with that address to accept."
6. Accept creates the `AccountCollaborator` row and sets `acceptedAt` in one transaction, then
   redirects to the dashboard.
7. Revoke deletes the invite row. Remove and Leave delete the collaborator row. Every request
   re-checks access, so access ends on the next request.

## Property transfer

- On the property page, the owner picks one of their collaborators and confirms. The confirm text
  says the property leaves the owner's account, and that the owner and their other collaborators
  lose access unless the new owner shares with them.
- The new owner needs a free property slot on their plan (`hasPropertySlot` under their advisory
  lock). If none: "They need a plan with room for another property first."
- **Files move with the property.** Storage keys are `documents/<ownerUserId>/<uuid>`, and account
  deletion removes the whole `documents/<userId>/` prefix. So a transfer copies each file to the
  new owner's prefix, updates `Property.userId` and the document rows in one transaction, then
  deletes the old objects. A failure before the commit leaves only unreferenced copies, which the
  existing orphan cleanup removes. Storage drivers gain `copy(from, to)`.
- Uploads by a collaborator go under the **owner's** prefix, for the same reason.

## Reminders

- Recipients for a record: the property owner plus the owner's collaborators, each with a
  verified email and `reminderEmailsEnabled`. The owner's entitlement decides whether the property
  gets reminders at all.
- `dueReminder()` stays the only rule. It runs once per recipient with that recipient's timezone,
  so each person gets their email from 08:00 their time. Idempotency is the unique
  `(record, type, user)` row.
- `sendReminder()` re-checks at send time that the recipient still has access.

## Account deletion and export

- **Collaborator deletes their account:** their collaborator rows and reminder rows cascade.
- **Owner deletes their account while shared:** allowed. The confirm screen says how many people
  lose access to how many properties. After deletion, each collaborator gets an email: "<first
  name> closed their RentCert account, so you no longer have access to their properties." The
  recipient list is collected in `deleteUser.beforeDelete` and sent in `afterDelete`, so nobody is
  emailed if the deletion fails. Properties and files are deleted as today.
- **Export:** unchanged for owned properties. It adds a list of accounts shared with the user
  (owner first name, joined date) and accounts the user shares with (collaborator email, joined
  date). It never includes another owner's records or files.

## Audit events

`sharing.invite_sent`, `sharing.invite_revoked`, `sharing.invite_accepted`,
`sharing.collaborator_removed`, `sharing.collaborator_left`, `property.transferred`. Metadata holds
user ids, never emails or tokens. Compliance and document events keep recording the acting user.

## Pages and UI

- `/sharing` (in the account area): invite form, pending invites (email, expiry, Revoke),
  collaborators (name, email, Remove), and "Shared with you" (owner name, Leave).
- Dashboard, properties list and documents page: shared properties appear under "Shared by
  <first name>". Plan usage on `/billing` counts owned properties only.
- Property page: "Transfer" for the owner; "Shared by <first name>" for a collaborator, and
  owner-only buttons hidden.
- Account deletion confirm: the sharing warning.
- `/invites/[token]` as described above.

## Project structure additions

```
src/server/properties/access.ts     accessibleBy(), findPropertyForMember()
src/server/properties/transfer.ts   transferProperty()
src/server/sharing/commands.ts      invite, revoke, accept, remove, leave
src/server/sharing/queries.ts       collaborators, invites, closure notice recipients
src/server/sharing/tokens.ts        token generation and hashing
src/server/mail/templates/          invite and account-closed emails
src/app/(app)/sharing/
src/app/invites/[token]/
```

## Testing Strategy

Vitest (integration, real Postgres):

- Access matrix: owner, collaborator and stranger against every call site above, including the
  download route and compliance pack. Stranger and missing ids behave the same.
- A property the owner adds after sharing is visible to the collaborator at once.
- Collaborator is refused every owner-only action.
- Invites: hashed storage, 7-day expiry, single use, revoke, re-invite replaces, both limits,
  email mismatch, one generic message for all invalid cases.
- Transfer: slot check, owner swap, files copied and old objects removed, old owner and old
  collaborators lose access, audit event.
- Remove and Leave take effect on the next call.
- Reminders: one email per recipient, each from 08:00 local; removed collaborator gets none; owner
  read-only means none; idempotent per recipient.
- Account deletion: collaborator cascade; owner deletion sends closure emails, none if deletion
  fails.
- Export: sharing lists only.
- Migration: applied to seeded data, every existing reminder row gets its owner as recipient.

Playwright: owner invites; invitee signs up through the link from `tmp/mail`, verifies, lands on
the invite, accepts, sees the property and records a check; owner removes them; the collaborator's
next request to the property is a 404. A second spec covers an existing user accepting and a
property transfer. Mobile layout check on `/sharing` and the invite page.

## Success Criteria

- Invite, accept, revoke, remove, leave and transfer work end to end.
- No property ever has zero owners (`NOT NULL`, tested for transfer and deletion).
- Accounts with no sharing stay fully isolated; the architecture test covers the new models.
- Billing and plan limits unchanged for owners; collaborators never see billing.
- `npm run lint`, `npm run typecheck`, `npm test` and `npm run test:e2e` pass; the migration runs
  on the seeded dev database.
- PLAN.md sections 22 and 23 and CAPABILITY_MAP.md updated.

## Out of scope

Per-property sharing, granular permissions, collaborators inviting others, per-property reminder
opt-out, admin-adjustable limits, changes to the admin "never touch documents" rule.

## Open Questions

None.
