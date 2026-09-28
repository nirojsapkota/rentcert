import type { Metadata } from "next";
import { ConfirmForm } from "@/components/confirm-form";
import { MAX_COLLABORATORS } from "@/server/sharing/commands";
import { getSharingOverview } from "@/server/sharing/queries";
import { requireUser } from "@/server/session";
import { leaveSharedAccountAction, removeCollaboratorAction, revokeInviteAction } from "./actions";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Sharing" };

const date = (value: Date) => value.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export default async function SharingPage() {
  const user = await requireUser();
  const { collaborators, invites, sharedWithMe } = await getSharingOverview(user.id);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Sharing</h1>
        <p className="mt-1 text-ink-muted">
          Invite a co-owner or family member to help keep track of your properties with their own login. They can
          record checks, upload certificates and get reminder emails. Your plan covers them; they don&apos;t see
          your billing.
        </p>
      </div>

      <section aria-labelledby="invite-heading" className="rounded-lg border border-line bg-surface p-6">
        <h2 id="invite-heading" className="text-lg font-semibold">
          Invite someone
        </h2>
        <p className="mt-1 text-sm text-ink-muted">You can share with up to {MAX_COLLABORATORS} people, including pending invites.</p>
        <div className="mt-4">
          <InviteForm />
        </div>
      </section>

      <section aria-labelledby="people-heading" className="rounded-lg border border-line bg-surface p-6">
        <h2 id="people-heading" className="text-lg font-semibold">
          People with access
        </h2>
        {collaborators.length === 0 && invites.length === 0 ? (
          <p className="mt-2 text-sm text-ink-muted">You haven&apos;t shared your properties with anyone.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line">
            {collaborators.map(({ member, createdAt }) => (
              <li key={member.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {member.firstName} {member.lastName}
                  </p>
                  <p className="break-all text-sm text-ink-muted">
                    {member.email} · since {date(createdAt)}
                  </p>
                </div>
                <ConfirmForm
                  action={removeCollaboratorAction.bind(null, member.id)}
                  question={`Remove ${member.firstName}'s access to your properties?`}
                  label="Remove"
                />
              </li>
            ))}
            {invites.map((invite) => (
              <li key={invite.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="break-all font-medium">{invite.email}</p>
                  <p className="text-sm text-ink-muted">Invite pending · expires {date(invite.expiresAt)}</p>
                </div>
                <ConfirmForm
                  action={revokeInviteAction.bind(null, invite.id)}
                  question={`Revoke the invite to ${invite.email}? The link will stop working.`}
                  label="Revoke"
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      {sharedWithMe.length > 0 && (
        <section aria-labelledby="shared-heading" className="rounded-lg border border-line bg-surface p-6">
          <h2 id="shared-heading" className="text-lg font-semibold">
            Shared with you
          </h2>
          <ul className="mt-4 divide-y divide-line">
            {sharedWithMe.map(({ owner, createdAt }) => (
              <li key={owner.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-medium">
                    {owner.firstName} {owner.lastName}&apos;s properties
                  </p>
                  <p className="text-sm text-ink-muted">since {date(createdAt)}</p>
                </div>
                <ConfirmForm
                  action={leaveSharedAccountAction.bind(null, owner.id)}
                  question={`Leave ${owner.firstName}'s properties? You'll need a new invite to get access again.`}
                  label="Leave"
                />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
