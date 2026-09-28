// Answers from PLAN.md section 33. Keep them plain: RentCert tracks dates and stores documents only.
const FAQ = [
  ["Is RentCert a property management system?", "No. RentCert only tracks compliance dates and stores your certificates. It does not manage tenants, rent or maintenance."],
  ["Does RentCert perform inspections?", "No. RentCert does not perform smoke alarm, electrical, gas or any other checks."],
  ["Does RentCert issue certificates?", "No. Certificates come from the licensed professionals who do the checks. RentCert stores copies you upload."],
  ["Can RentCert guarantee legal compliance?", "No. RentCert reminds you about the dates you enter. Confirm the rules that apply to your property with a licensed provider or the official guidance for your state or territory."],
  ["Who performs safety checks?", "Appropriately qualified or licensed professionals, as required by the rules in your state or territory."],
  ["Can I store certificates?", "Yes. Upload PDF, JPG or PNG files up to 10 MB. They are stored privately. Only you, and anyone you choose to share your properties with, can download them."],
  ["Which states does RentCert support?", "You can add properties anywhere in Australia. RentCert's reminder intervals are based on Victorian guidance; other states use a general schedule, clearly labelled, until their rules are added."],
] as const;

export function Faq() {
  return (
    <section aria-labelledby="faq-heading" className="space-y-4">
      <h2 id="faq-heading" className="text-3xl font-bold text-deep">
        Frequently asked questions
      </h2>
      <div className="divide-y divide-line rounded-lg border border-line bg-surface">
        {FAQ.map(([question, answer]) => (
          <details key={question} className="group px-5 py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold [&::-webkit-details-marker]:hidden">
              {question}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0 text-brand transition-transform group-open:rotate-180">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </summary>
            <p className="pb-4 text-ink-muted">{answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
