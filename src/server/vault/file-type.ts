import "server-only";

// Pure helpers for uploaded files. The type always comes from the file's first bytes,
// never from the browser-supplied MIME type or the filename.

export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENTS_PER_RECORD = 10;

export type DetectedType = { contentType: "application/pdf" | "image/jpeg" | "image/png"; extension: "pdf" | "jpg" | "png" };

const SIGNATURES: { bytes: number[]; type: DetectedType }[] = [
  { bytes: [0x25, 0x50, 0x44, 0x46, 0x2d], type: { contentType: "application/pdf", extension: "pdf" } }, // %PDF-
  { bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], type: { contentType: "image/png", extension: "png" } },
  { bytes: [0xff, 0xd8, 0xff], type: { contentType: "image/jpeg", extension: "jpg" } },
];

export function detectFileType(bytes: Uint8Array): DetectedType | null {
  const match = SIGNATURES.find(({ bytes: signature }) => signature.every((byte, index) => bytes[index] === byte));
  return match?.type ?? null;
}

// Display name only; it never becomes a storage path.
export function sanitizeFilename(original: string, extension: string): string {
  const base = original.split(/[\\/]/).pop() ?? "";
  const cleaned = base
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.[^.]*$/, "") // drop the supplied extension; the detected one is added below
    .replace(/^\.+/, "")
    .slice(0, 100 - extension.length - 1)
    .trim();
  return `${cleaned || "certificate"}.${extension}`;
}

// RFC 6266 attachment header with an ASCII fallback and a UTF-8 filename*.
export function attachmentDisposition(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

export function downloadHeaders(filename: string, contentType: string): Record<string, string> {
  return {
    "Content-Type": contentType,
    "Content-Disposition": attachmentDisposition(filename),
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  };
}
