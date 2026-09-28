import type { Metadata } from "next";
import Link from "next/link";
import { propertyTitle } from "@/components/property-address";
import { Alert } from "@/components/ui/alert";
import { formatBytes } from "@/lib/format";
import { listDocumentsForUser } from "@/server/vault/queries";
import { requireUser } from "@/server/session";

export const metadata: Metadata = { title: "Documents" };

export default async function DocumentsPage({ searchParams }: PageProps<"/documents">) {
  const query = await searchParams;
  const user = await requireUser();
  const requestedPage = Number.parseInt(String(query.page ?? "1"), 10);
  const { documents, total, page, pageCount } = await listDocumentsForUser(user.id, Number.isFinite(requestedPage) ? requestedPage : 1);
  const timeZone = user.timezone ?? "Australia/Melbourne";

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold text-deep">Documents</h1>
      {query.deleted === "1" && <Alert tone="success">The document has been deleted.</Alert>}

      {total === 0 ? (
        <div className="rounded-lg border border-line bg-surface p-8 text-center">
          <h2 className="text-xl font-bold">No certificates uploaded yet.</h2>
          <p className="mt-1 text-ink-muted">Upload your first compliance certificate from a property&apos;s compliance history.</p>
          <Link href="/properties" className="mt-4 inline-block font-medium text-brand hover:underline">
            Go to your properties
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-ink-muted">
            {total} {total === 1 ? "document" : "documents"}
          </p>
          <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
            {documents.map((document) => {
              const record = document.complianceRecord;
              return (
                <li key={document.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{document.filename}</p>
                    <p className="text-sm text-ink-muted">
                      {record.requirement.name} ·{" "}
                      <Link href={`/properties/${record.property.id}`} className="text-brand hover:underline">
                        {propertyTitle(record.property)}
                      </Link>
                      {record.property.userId !== user.id && <> · Shared by {record.property.user.firstName}</>}
                    </p>
                    <p className="text-sm text-ink-muted">
                      Uploaded {document.uploadedAt.toLocaleDateString("en-AU", { timeZone })} · {formatBytes(document.byteSize)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <a href={`/api/documents/${document.id}/download`} className="text-sm font-medium text-brand hover:underline">
                      Download<span className="sr-only"> {document.filename}</span>
                    </a>
                    <Link
                      href={`/properties/${record.property.id}/records/${record.id}/documents`}
                      className="text-sm text-ink-muted hover:underline"
                    >
                      Manage<span className="sr-only"> {document.filename}</span>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
          {pageCount > 1 && (
            <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
              {page > 1 ? <Link href={`/documents?page=${page - 1}`} className="font-medium text-brand hover:underline">← Newer</Link> : <span />}
              <span className="text-ink-muted">Page {page} of {pageCount}</span>
              {page < pageCount ? <Link href={`/documents?page=${page + 1}`} className="font-medium text-brand hover:underline">Older →</Link> : <span />}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
