export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-5xl px-4 py-6 text-sm text-ink-muted">
        <p>
          RentCert is a tracking and document-storage tool. It does not provide legal, electrical, gas,
          smoke alarm or other compliance advice. Confirm the requirements that apply to your property with
          a licensed provider or official Victorian guidance.
        </p>
        <p className="mt-2">© {new Date().getFullYear()} RentCert</p>
      </div>
    </footer>
  );
}
