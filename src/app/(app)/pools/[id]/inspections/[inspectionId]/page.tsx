import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConfirmForm } from "@/components/confirm-form";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { formatCalendarDate } from "@/lib/calendar-date";
import { INSPECTION_KINDS, INSPECTION_OUTCOMES, MAX_PHOTOS_PER_INSPECTION } from "@/lib/inspection-validation";
import { LodgePanel } from "@/components/lodge-panel";
import { getInspection } from "@/server/barrier/inspections";
import { requireInspector } from "@/server/session";
import { deletePhotoAction, uploadPhotoAction } from "../../../inspection-actions";
import { PhotoUploadForm } from "../../../photo-upload-form";

export const metadata: Metadata = { title: "Inspection" };

export default async function InspectionPage({ params, searchParams }: PageProps<"/pools/[id]/inspections/[inspectionId]">) {
  const { id, inspectionId } = await params;
  const query = await searchParams;
  const user = await requireInspector();
  const inspection = await getInspection(user.id, inspectionId);
  if (!inspection || inspection.poolId !== id) notFound();
  const kind = INSPECTION_KINDS.find((k) => k.code === inspection.kind)?.name;
  const outcome = INSPECTION_OUTCOMES.find((o) => o.code === inspection.outcome)?.name;

  return (
    <section className="max-w-3xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href={`/pools/${id}`} className="text-sm font-medium text-brand hover:underline">
            ← {inspection.pool.addressLine1}
          </Link>
          <h1 className="mt-1 text-3xl font-bold text-deep">Inspection on {formatCalendarDate(inspection.inspectedOn)}</h1>
          <p className="text-ink-muted">
            {kind} · {outcome}
          </p>
        </div>
        <Link href={`/pools/${id}/inspections/${inspection.id}/edit`} className={buttonClasses("secondary")}>
          Edit
        </Link>
      </div>

      {query.created === "1" && <Alert tone="success">Inspection saved.</Alert>}
      {query.saved === "1" && <Alert tone="success">Changes saved.</Alert>}
      {query.uploaded === "1" && <Alert tone="success">Photo uploaded.</Alert>}

      <LodgePanel council={inspection.pool.council} />

      <dl className="grid gap-3 rounded-lg border border-line bg-surface p-5 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-ink-muted">Next recall (based on the date you entered)</dt>
          <dd className="font-medium">{inspection.nextRecallOn ? formatCalendarDate(inspection.nextRecallOn) : "None until a pass is recorded"}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-muted">Certificate number</dt>
          <dd>{inspection.certificateNumber ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-sm text-ink-muted">Lodged with council</dt>
          <dd>{inspection.lodgedOn ? formatCalendarDate(inspection.lodgedOn) : "—"}</dd>
        </div>
        {inspection.notes && (
          <div className="sm:col-span-2">
            <dt className="text-sm text-ink-muted">Notes</dt>
            <dd className="whitespace-pre-wrap">{inspection.notes}</dd>
          </div>
        )}
      </dl>

      <div className="space-y-4 rounded-lg border border-line bg-surface p-5">
        <h2 className="text-xl font-bold">Photos</h2>
        {inspection.photos.length === 0 ? (
          <p className="text-ink-muted">No photos yet.</p>
        ) : (
          <ul className="space-y-2">
            {inspection.photos.map((photo) => (
              <li key={photo.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0 break-words">
                  <a href={`/api/inspection-photos/${photo.id}/download`} className="font-medium text-brand hover:underline">
                    {photo.filename}
                  </a>
                  {photo.caption && <span className="text-ink-muted"> · {photo.caption}</span>}
                </span>
                <ConfirmForm action={deletePhotoAction.bind(null, photo.id)} question="Delete this photo?" label="Delete" />
              </li>
            ))}
          </ul>
        )}
        {inspection.photos.length < MAX_PHOTOS_PER_INSPECTION ? (
          <PhotoUploadForm action={uploadPhotoAction.bind(null, id, inspection.id)} />
        ) : (
          <Alert tone="info">This inspection has the maximum of {MAX_PHOTOS_PER_INSPECTION} photos.</Alert>
        )}
      </div>
    </section>
  );
}
