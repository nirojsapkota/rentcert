import type { Metadata } from "next";
import { DraftNotice } from "@/components/marketing/draft-notice";

export const metadata: Metadata = { title: "Privacy Policy" };

// DRAFT: needs legal review and the business details before launch.
export default function PrivacyPage() {
  return (
    <article className="prose-sm max-w-3xl space-y-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>
      <DraftNotice />
      <p>
        This policy explains how [Legal entity name] (ABN [ABN]) (&quot;RentCert&quot;, &quot;we&quot;) handles personal
        information when you use RentCert. We handle personal information with the Australian Privacy Principles in mind.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>Account details: your name, email address, password (stored only as a secure hash) and timezone.</li>
        <li>Property details you enter: addresses, nicknames, lease start dates and notes.</li>
        <li>Compliance information you enter: check dates, provider names, licence numbers and notes.</li>
        <li>Documents you upload, such as certificates and reports.</li>
        <li>Billing details handled by Stripe. We receive your plan and payment status, not your card number.</li>
        <li>Basic usage events (for example, that a property was added) and a daily count of landing page visits, without cookies or identifiers.</li>
      </ul>
      <h2>How we use it</h2>
      <p>To provide the service: calculating reminder dates, sending reminder and account emails, storing your documents, producing Compliance Packs, and billing. We do not sell personal information.</p>
      <h2>Where it is stored</h2>
      <p>On Amazon Web Services in the Sydney region (ap-southeast-2). Documents are stored privately and encrypted at rest.</p>
      <h2>Who we share it with</h2>
      <ul>
        <li>Amazon Web Services (hosting, storage and email delivery).</li>
        <li>Stripe (payments).</li>
        <li>[Error-monitoring provider, if used].</li>
      </ul>
      <h2>How long we keep it</h2>
      <p>While your account is open. When you delete your account, we delete your account, properties, records and documents. We keep a timestamp-only record that an account was deleted. Stripe keeps billing records as required by law.</p>
      <h2>Your choices</h2>
      <ul>
        <li>Export your data at any time from Account settings.</li>
        <li>Delete your account at any time from Account settings.</li>
        <li>Turn reminder emails off in Account settings.</li>
        <li>Ask to access or correct your information by emailing [contact email].</li>
      </ul>
      <h2>Complaints</h2>
      <p>Contact us at [contact email]. If you are not satisfied with our response, you can contact the Office of the Australian Information Commissioner (OAIC).</p>
      <p className="text-sm text-ink-muted">Last updated: [date].</p>
    </article>
  );
}
