import { LODGEMENT_METHODS, lodgeNotice } from "@/lib/council";

type Council = {
  name: string;
  lodgementMethod: (typeof LODGEMENT_METHODS)[number]["code"];
  contactEmail: string | null;
  contactPhone: string | null;
  portalUrl: string | null;
  notes: string | null;
  verifiedAt: Date | null;
};

export function LodgePanel({ council }: { council: Council | null }) {
  return (
    <section aria-labelledby="lodge-heading" className="space-y-2 rounded-lg border border-line bg-surface p-5">
      <h2 id="lodge-heading" className="text-xl font-bold">
        How to lodge
      </h2>
      {!council ? (
        <p className="text-ink-muted">No council is set for this pool. Choose one when you edit the pool.</p>
      ) : (
        <>
          <p className="font-medium">{council.name}</p>
          <p className="text-sm text-ink-muted">{lodgeNotice(council.verifiedAt)}</p>
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-ink-muted">Method</dt>
              <dd>{LODGEMENT_METHODS.find((m) => m.code === council.lodgementMethod)?.name}</dd>
            </div>
            {council.portalUrl && (
              <div>
                <dt className="text-ink-muted">Portal</dt>
                <dd className="break-all">
                  <a href={council.portalUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                    {council.portalUrl}
                  </a>
                </dd>
              </div>
            )}
            {council.contactEmail && (
              <div>
                <dt className="text-ink-muted">Email</dt>
                <dd className="break-all">{council.contactEmail}</dd>
              </div>
            )}
            {council.contactPhone && (
              <div>
                <dt className="text-ink-muted">Phone</dt>
                <dd>{council.contactPhone}</dd>
              </div>
            )}
          </dl>
          {council.notes && <p className="whitespace-pre-wrap text-sm">{council.notes}</p>}
        </>
      )}
    </section>
  );
}
