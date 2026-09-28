import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { propertyTitle } from "@/components/property-address";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { formatCalendarDate } from "@/lib/calendar-date";
import { formatBytes } from "@/lib/format";
import { findRecordForUser } from "@/server/compliance/queries";
import { findPropertyForUser } from "@/server/properties/queries";
import { listDocumentsForRecord } from "@/server/vault/queries";
import { requireUser } from "@/server/session";
import { deleteDocumentAction, uploadDocumentAction } from "../../../../document-actions";
import { UploadForm } from "../../../../upload-form";

export const metadata: Metadata = { title: "Record documents" };

export default async function RecordDocumentsPage({ params, searchParams }: PageProps<"/properties/[id]/records/[recordId]/documents">) {
  const [{ id, recordId }, query] = await Promise.all([params, searchParams]);
  const user = await requireUser();
  const [property, record, documents] = await Promise.all([
    findPropertyForUser(user.id, id),
    findRecordForUser(user.id, id, recordId),
    listDocumentsForRecord(user.id, id, recordId),
  ]);
  if (!property || !record) notFound();

  return (
    <section className="max-w-2xl space-y-6">
      <p>
        <Link href={`/properties/${property.id}`} className="text-sm font-medium text-brand hover:underline">
          ← {propertyTitle(property)}
        </Link>
      </p>
      <div>
        <h1 className="text-3xl font-bold text-deep">{record.requirement.name} documents</h1>
        <p className="mt-1 text-ink-muted">
          {record.completedOn ? `Completed ${formatCalendarDate(record.completedOn)}` : "Last check unknown"}
        </p>
      </div>

      {query.uploaded === "1" && <Alert tone="success">Your document has been uploaded.</Alert>}
      {query.deleted === "1" && <Alert tone="success">The document has been deleted.</Alert>}

      {documents.length === 0 ? (
        <p className="text-ink-muted">No certificates uploaded yet. Upload your first compliance certificate.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-surface">
          {documents.map((document) => (
            <li key={document.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium">{document.filename}</p>
                <p className="text-sm text-ink-muted">
                  Uploaded {document.uploadedAt.toLocaleDateString("en-AU", { timeZone: user.timezone ?? "Australia/Melbourne" })} ·{" "}
                  {formatBytes(document.byteSize)}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <a href={`/api/documents/${document.id}/download`} className="text-sm font-medium text-brand hover:underline">
                  Download<span className="sr-only"> {document.filename}</span>
                </a>
                <details>
                  <summary className="cursor-pointer text-sm text-danger">Delete<span className="sr-only"> {document.filename}</span></summary>
                  <form action={deleteDocumentAction.bind(null, document.id, "record")} className="mt-2">
                    <Button type="submit" variant="danger">
                      Yes, delete
                    </Button>
                  </form>
                </details>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!property.archivedAt && (
        <div className="rounded-lg border border-line bg-surface p-6">
          <UploadForm action={uploadDocumentAction.bind(null, property.id, record.id)} />
        </div>
      )}
    </section>
  );
}
