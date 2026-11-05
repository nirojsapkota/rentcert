import { detectFileType } from "@/server/vault/file-type";

export type PhotoType = { contentType: "image/jpeg" | "image/png" | "image/webp"; extension: "jpg" | "png" | "webp" };

const ascii = (bytes: Uint8Array, start: number, text: string) => [...text].every((char, index) => bytes[start + index] === char.charCodeAt(0));

// Type comes from the first bytes only. PDFs are valid vault files but not photos.
export function detectPhotoType(bytes: Uint8Array): PhotoType | null {
  if (ascii(bytes, 0, "RIFF") && ascii(bytes, 8, "WEBP")) return { contentType: "image/webp", extension: "webp" };
  const type = detectFileType(bytes);
  return type && type.contentType !== "application/pdf" ? (type as PhotoType) : null;
}
