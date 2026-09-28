import type { Metadata } from "next";
import { Alert } from "@/components/ui/alert";
import { findProfile } from "@/server/account";
import { countOwnedProperties } from "@/server/properties/queries";
import { getSharingOverview } from "@/server/sharing/queries";
import { requireUser } from "@/server/session";
import { DeleteAccountForm } from "./delete-account-form";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Account" };

const AUSTRALIAN_TIMEZONES = Intl.supportedValuesOf("timeZone").filter((zone) => zone.startsWith("Australia/"));

export default async function AccountPage() {
  const user = await requireUser();
  const [profile, sharing, ownedCount] = await Promise.all([findProfile(user.id), getSharingOverview(user.id), countOwnedProperties(user.id)]);
  const people = sharing.collaborators.length;
  const timezones = AUSTRALIAN_TIMEZONES.includes(profile.timezone)
    ? AUSTRALIAN_TIMEZONES
    : [profile.timezone, ...AUSTRALIAN_TIMEZONES];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-deep">Account</h1>

      <section aria-labelledby="profile-heading" className="rounded-lg border border-line bg-surface p-6">
        <h2 id="profile-heading" className="text-xl font-bold">
          Your details
        </h2>
        <div className="mt-4">
          <ProfileForm profile={profile} timezones={timezones} />
        </div>
      </section>

      <section aria-labelledby="export-heading" className="rounded-lg border border-line bg-surface p-6">
        <h2 id="export-heading" className="text-xl font-bold">
          Export your data
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Download a ZIP file with your account details, properties, compliance records, reminders, history and
          uploaded documents.
        </p>
        <a href="/api/account/export" className="mt-4 inline-block font-medium text-brand hover:underline">
          Export my data
        </a>
      </section>

      <section aria-labelledby="delete-heading" className="rounded-lg border border-danger/40 bg-surface p-6">
        <h2 id="delete-heading" className="text-lg font-semibold text-danger">
          Delete account
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          This permanently deletes your account, properties, compliance records and uploaded documents. It
          cannot be undone.
        </p>
        {people > 0 && ownedCount > 0 && (
          <div className="mt-4">
            <Alert tone="error">
              {people === 1 ? "1 person you share with" : `${people} people you share with`} will lose access to your{" "}
              {ownedCount === 1 ? "property" : `${ownedCount} properties`} and its records. We&apos;ll email them once your
              account is deleted. To keep a property for them, transfer it from the property page first.
            </Alert>
          </div>
        )}
        <div className="mt-4">
          <DeleteAccountForm />
        </div>
      </section>
    </div>
  );
}
