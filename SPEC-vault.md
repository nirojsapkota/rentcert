# Spec: vault (Phase 4)

Status: IMPLEMENTED (2026-09-23). Module id: `vault`. Depends on: `compliance`.
Source: PLAN.md sections 7, 8, 9, 11, 22, 26, 34, 41 (scenario 4), 49, 52.

Stack, commands, code style and boundaries from `SPEC-foundation.md` apply unchanged.

---

## Objective

A landlord uploads certificates and reports (PDF, JPG, PNG, up to 10 MB) to a compliance
record, sees them in the record history and on a Documents page, downloads them, and deletes
them. Files are private. No other user can reach them, even by guessing ids.

User stories:

- When I mark a check completed, I can attach the certificate in the same form.
- I can add a document to an existing record later.
- I see which records have documents, and I download or delete them.
- The Documents page lists all my certificates across properties.

## Data model

```prisma
model ComplianceDocument {
  id                 String     @id @default(uuid(7)) @db.Uuid
  complianceRecordId String     @map("compliance_record_id") @db.Uuid  // FK, ON DELETE CASCADE
  filename           String                                           // sanitised display name
  contentType        String     @map("content_type")                  // detected from file bytes
  byteSize           Int        @map("byte_size")
  sha256             String                                           // integrity check
  storageKey         String     @unique @map("storage_key")
  scanStatus         ScanStatus @default(NOT_SCANNED) @map("scan_status")
  uploadedAt         DateTime   @default(now()) @map("uploaded_at")

  @@index([complianceRecordId])
  @@map("compliance_documents")
}

enum ScanStatus { NOT_SCANNED CLEAN INFECTED }
```

- Check constraints: `byte_size BETWEEN 1 AND 10485760`, and `content_type IN ('application/pdf',
  'image/jpeg', 'image/png')`.
- Storage key: `documents/<userId>/<uuid>`. The key never contains the filename, so names can't
  leak through storage paths. The user prefix lets account deletion remove every file.

## Storage

A small adapter interface in `src/server/vault/storage/`:

```ts
interface DocumentStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  download(key: string, filename: string, contentType: string): Promise<Response>; // controlled response
  delete(key: string): Promise<void>;
  deletePrefix(prefix: string): Promise<void>;
}
```

| Driver | When | Behaviour |
|---|---|---|
| `local` | Development and tests (`STORAGE_DRIVER=local`) | Files under `storage/` (gitignored). Downloads stream through the app. |
| `s3` | Production (`STORAGE_DRIVER=s3`) | Private bucket, server-side encryption (SSE-S3). Download = 302 to a presigned GET URL that expires in 60 seconds and forces `attachment`. |

- Uploads go through the app server, not straight from the browser to S3. At 10 MB this is simple,
  and the server validates the bytes before storing them.
- New dependencies (named in PLAN.md): `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`.
- Environment: `STORAGE_DRIVER`, `STORAGE_LOCAL_PATH`, `AWS_REGION`, `AWS_S3_BUCKET`. AWS
  credentials come from the standard AWS chain (instance role in production), never from code.
- Bucket settings (Block Public Access, TLS-only policy, lifecycle for old versions) are part of
  Phase 8 infrastructure. The app never builds a public URL.

## Upload validation (server side, in this order)

1. Signed-in, verified user. The record belongs to one of the user's properties.
2. The record's property is not archived.
3. Size: 1 byte to 10 MB. Bigger requests are rejected before the file is read into memory where possible.
4. Type from the file's first bytes, never from the browser's MIME type or the extension:
   PDF `%PDF-`, PNG `89 50 4E 47 0D 0A 1A 0A`, JPEG `FF D8 FF`. Anything else is rejected.
5. Filename: path parts removed, control characters and `<>:"/\|?*` removed, whitespace
   collapsed, at most 100 characters. The extension is replaced with the one for the detected
   type. An empty result becomes `certificate.<ext>`.
6. At most 10 documents per record.
7. Malware scan hook: `scanDocument(bytes)` returns `NOT_SCANNED` in the MVP. Phase 8 can switch
   on a real scanner (for example S3 GuardDuty malware protection). Downloads of `INFECTED`
   files are refused.

Error messages are plain, for example: "Upload a PDF, JPG or PNG file.", "The file must be 10 MB or smaller."

## Download and delete

- Route: `GET /api/documents/[id]/download`. It checks the session, then loads the document only
  through `record → property → userId`. A document that is missing or someone else's returns
  404 with no body detail.
- Response headers: `Content-Disposition: attachment; filename*=UTF-8''<name>`, the detected
  `Content-Type`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`. Files
  are never shown inline in the MVP, so an uploaded PDF or image cannot run in the app's origin.
- Delete is a server action with a confirm step. It deletes the database row first, then the stored
  object. If deleting the object fails, the error is logged and the orphan is left for a cleanup
  job (Phase 5).
- Signed URLs, storage keys and file contents are never logged.

## Account deletion

`deleteUser.afterDelete` removes every object under `documents/<userId>/`. Database rows are
already gone through `user → property → record → document` cascades.

## Audit events

`document.uploaded` and `document.deleted`. Metadata holds the record id, content type and byte
size only. No filename, because filenames can contain personal details.

## Pages and UI

- **Mark completed form**: optional "Certificate or report" file input (`accept=".pdf,.jpg,.jpeg,.png"`).
  The form becomes `multipart/form-data`.
- **Property page, history table**: a "Documents" column with each document's download link and
  an "Add document" link to `/properties/[id]/records/[recordId]/documents`.
- **Record documents page** (`/properties/[id]/records/[recordId]/documents`): list, upload form, delete.
- **Documents page** (`/documents`): all documents across the user's properties, newest first,
  20 per page. Columns: document name, property, compliance type, upload date, and a Download
  action. Empty state: "No certificates uploaded yet. Upload your first compliance certificate."

## Project structure additions

```text
src/server/vault/file-type.ts     Magic-byte detection and filename sanitising (pure)
src/server/vault/storage/*.ts     Storage interface, local and S3 drivers, driver selection
src/server/vault/scan.ts          Malware scan hook
src/server/vault/commands.ts      uploadDocument, deleteDocument (owner-scoped, audited)
src/server/vault/queries.ts       Documents for a record, documents page, owned lookup for download
src/app/api/documents/[id]/download/route.ts
```

Only `src/server/vault/` may call `db.complianceDocument`. The architecture test extends to it.

## Testing Strategy

- Unit: type detection (real PDF/PNG/JPEG headers; a renamed `.exe`, HTML, SVG and ZIP are
  rejected), filename sanitising (paths, unicode, control characters, empty, long names), size limits.
- Integration (local driver, temporary folder):
  - Upload stores the file and the row and writes an audit event. Downloaded bytes equal uploaded bytes.
  - A spoofed MIME type is ignored. An 11 MB file and an 11th document are rejected.
  - IDOR: user B's download, upload-to-record and delete of user A's document all return
    not found, and the file stays. This also covers a document id paired with user B's own property.
  - Deleting a document removes the object. Account deletion removes every object under the user prefix.
  - Download responses carry the headers above.
  - S3 driver: unit tests with a fake S3 client check the SSE header, the presigned URL
    expiry, `attachment` disposition, and prefix deletion.
- End to end (PLAN.md scenario 4): mark gas completed with a PDF attached. The document shows in
  history and on the Documents page. The download matches the file. Another user's download URL returns 404.

## Success Criteria

- Scenario 4 passes: the PDF is stored privately and appears on the compliance record.
- Only PDF, JPG and PNG up to 10 MB are accepted, decided from file bytes.
- No path returns a document to anyone but its owner, and no public URL exists.
- Files are removed on document delete and on account deletion.
- lint, typecheck, Vitest, Playwright, build and audit pass.

## Out of scope

Inline preview, virus scanning in production (hook only), direct-to-S3 uploads, merging PDFs
(Phase 6), admin access to documents (Phase 8), and S3 bucket provisioning (Phase 8).

## Open Questions

1. Downloads are always `attachment` (no in-browser preview) for the MVP. OK? (Proposed: yes; safer.)
2. Limit of 10 documents per record. OK? (Proposed: yes.)
3. Malware scanning: hook only now, real scanner in Phase 8. OK? (Proposed: yes.)
