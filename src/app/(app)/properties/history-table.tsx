import Link from "next/link";
import { formatCalendarDate } from "@/lib/calendar-date";

type HistoryRecord = {
  id: string;
  kind: "COMPLETED" | "UNKNOWN_LAST_CHECK";
  completedOn: Date | null;
  nextDueOn: Date;
  providerName: string | null;
  requirement: { name: string };
  documents: { id: string; filename: string }[];
};

type History = { records: HistoryRecord[]; total: number; page: number; pageCount: number };

export function HistoryTable({ propertyId, history }: { propertyId: string; history: History }) {
  return (
    <section aria-labelledby="history-heading" className="space-y-3">
      <h2 id="history-heading" className="text-lg font-semibold">
        Compliance history
      </h2>
      {history.total === 0 ? (
        <p className="text-ink-muted">No compliance records yet.</p>
      ) : (
        <>
          <div className="relative overflow-x-auto rounded-lg border border-line bg-surface">
            <table className="w-full min-w-[44rem] text-left text-sm">
              <thead className="border-b border-line bg-canvas text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Requirement</th>
                  <th scope="col" className="px-4 py-2 font-medium">Completed</th>
                  <th scope="col" className="px-4 py-2 font-medium">Next due</th>
                  <th scope="col" className="px-4 py-2 font-medium">Provider</th>
                  <th scope="col" className="px-4 py-2 font-medium">Documents</th>
                  <th scope="col" className="px-4 py-2 font-medium"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {history.records.map((record) => (
                  <tr key={record.id}>
                    <td className="px-4 py-2">{record.requirement.name}</td>
                    <td className="px-4 py-2">
                      {record.completedOn ? formatCalendarDate(record.completedOn) : "Last check unknown"}
                    </td>
                    <td className="px-4 py-2">{formatCalendarDate(record.nextDueOn)}</td>
                    <td className="px-4 py-2">{record.providerName ?? "—"}</td>
                    <td className="px-4 py-2">
                      <ul className="space-y-1">
                        {record.documents.map((document) => (
                          <li key={document.id}>
                            <a href={`/api/documents/${document.id}/download`} className="text-brand hover:underline">
                              {document.filename}
                            </a>
                          </li>
                        ))}
                      </ul>
                      <Link
                        href={`/properties/${propertyId}/records/${record.id}/documents`}
                        className="text-ink-muted hover:underline"
                        aria-label={`${record.documents.length > 0 ? "Manage" : "Add"} documents for ${record.requirement.name.toLowerCase()}${record.completedOn ? ` from ${formatCalendarDate(record.completedOn)}` : ""}`}
                      >
                        {record.documents.length > 0 ? "Manage" : "Add document"}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right">
                      {record.kind === "COMPLETED" && (
                        <Link
                          href={`/properties/${propertyId}/records/${record.id}/edit`}
                          className="font-medium text-brand hover:underline"
                          aria-label={`Edit ${record.requirement.name.toLowerCase()} record${record.completedOn ? ` from ${formatCalendarDate(record.completedOn)}` : ""}`}
                        >
                          Edit
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {history.pageCount > 1 && (
            <nav aria-label="History pages" className="flex items-center justify-between text-sm">
              {history.page > 1 ? (
                <Link href={`/properties/${propertyId}?history=${history.page - 1}`} className="font-medium text-brand hover:underline">
                  ← Newer
                </Link>
              ) : (
                <span />
              )}
              <span className="text-ink-muted">
                Page {history.page} of {history.pageCount}
              </span>
              {history.page < history.pageCount ? (
                <Link href={`/properties/${propertyId}?history=${history.page + 1}`} className="font-medium text-brand hover:underline">
                  Older →
                </Link>
              ) : (
                <span />
              )}
            </nav>
          )}
        </>
      )}
    </section>
  );
}
