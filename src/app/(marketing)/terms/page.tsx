import type { Metadata } from "next";
import { DraftNotice } from "@/components/marketing/draft-notice";

export const metadata: Metadata = { title: "Terms of Service" };

// DRAFT: needs legal review and the business details before launch.
export default function TermsPage() {
  return (
    <article className="max-w-3xl space-y-4 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-semibold">
      <h1 className="text-3xl font-bold">Terms of Service</h1>
      <DraftNotice />
      <p>These terms apply to your use of RentCert, provided by [Legal entity name] (ABN [ABN]).</p>
      <h2>What RentCert is</h2>
      <p>
        RentCert is a tool for tracking compliance dates and storing documents. It does not perform inspections, issue
        certificates, or provide legal, electrical, gas, smoke alarm or other compliance advice. Reminder dates are
        calculated from the dates you enter and the intervals configured in RentCert. You are responsible for confirming
        the requirements that apply to your property and for arranging checks by qualified professionals.
      </p>
      <h2>Your account</h2>
      <p>Keep your password secure. You are responsible for the information and documents you upload, and you must have the right to upload them.</p>
      <h2>Plans and payment</h2>
      <p>New accounts get a free trial. Paid plans are billed monthly in Australian dollars through Stripe, including GST where applicable. You can cancel at any time; access continues until the end of the paid period. After a trial ends without a plan, your account becomes read-only.</p>
      <h2>Availability</h2>
      <p>We aim to keep RentCert available but do not promise uninterrupted service. Email reminders can be delayed or not delivered, so do not rely on them as your only record of due dates.</p>
      <h2>Liability</h2>
      <p>[Limitation of liability wording, subject to the Australian Consumer Law, to be provided after legal review.]</p>
      <h2>Ending your account</h2>
      <p>You can delete your account at any time. We may suspend accounts that misuse the service.</p>
      <h2>Governing law</h2>
      <p>These terms are governed by the laws of [State or territory], Australia.</p>
      <p>Contact: [contact email]</p>
      <p className="text-sm text-ink-muted">Last updated: [date].</p>
    </article>
  );
}
