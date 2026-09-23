import { describe, expect, it } from "vitest";
import { attachmentDisposition, detectFileType, sanitizeFilename } from "@/server/vault/file-type";
import { jpegBytes, pdfBytes, pngBytes, textBytes } from "../support/files";

describe("detectFileType", () => {
  it("recognises PDF, PNG and JPEG from their first bytes", () => {
    expect(detectFileType(pdfBytes())).toEqual({ contentType: "application/pdf", extension: "pdf" });
    expect(detectFileType(pngBytes())).toEqual({ contentType: "image/png", extension: "png" });
    expect(detectFileType(jpegBytes())).toEqual({ contentType: "image/jpeg", extension: "jpg" });
  });

  it.each([
    ["Windows executable", new Uint8Array([0x4d, 0x5a, 0x90, 0x00])],
    ["ZIP (also docx)", new Uint8Array([0x50, 0x4b, 0x03, 0x04])],
    ["HTML", textBytes("<!doctype html><script>alert(1)</script>")],
    ["SVG", textBytes('<svg xmlns="http://www.w3.org/2000/svg"><script/></svg>')],
    ["PDF signature not at the start", textBytes(" %PDF-1.4")],
    ["empty", new Uint8Array()],
  ])("rejects %s", (_name, bytes) => {
    expect(detectFileType(bytes)).toBeNull();
  });
});

describe("sanitizeFilename", () => {
  it.each([
    ["Gas certificate 2026.pdf", "pdf", "Gas certificate 2026.pdf"],
    ["../../etc/passwd", "pdf", "passwd.pdf"],
    ["C:\\Users\\me\\scan.PDF", "pdf", "scan.pdf"],
    ["invoice.exe", "pdf", "invoice.pdf"],
    ["photo.pdf", "png", "photo.png"],
    ["a\u0000b\u001fc<>:\"|?*.pdf", "pdf", "abc.pdf"],
    ["   ", "jpg", "certificate.jpg"],
    [".hidden", "pdf", "certificate.pdf"],
    ["Sécurité   gaz.pdf", "pdf", "Sécurité gaz.pdf"],
  ])("%j becomes %j", (input, extension, expected) => {
    expect(sanitizeFilename(input, extension)).toBe(expected);
  });

  it("limits names to 100 characters including the extension", () => {
    const result = sanitizeFilename(`${"a".repeat(300)}.pdf`, "pdf");
    expect(result).toHaveLength(100);
    expect(result.endsWith(".pdf")).toBe(true);
  });
});

describe("attachmentDisposition", () => {
  it("always forces a download and encodes non-ASCII names", () => {
    expect(attachmentDisposition('Sécurité "gaz".pdf')).toBe(
      "attachment; filename=\"S_curit_ _gaz_.pdf\"; filename*=UTF-8''S%C3%A9curit%C3%A9%20%22gaz%22.pdf",
    );
  });
});
