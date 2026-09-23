import { readFileSync } from "node:fs";
import path from "node:path";

const FIXTURES = path.resolve(__dirname, "../fixtures");

export const pdfBytes = () => new Uint8Array(readFileSync(path.join(FIXTURES, "certificate.pdf")));
export const pngBytes = () => new Uint8Array(readFileSync(path.join(FIXTURES, "photo.png")));
export const jpegBytes = () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00]);
export const textBytes = (text: string) => new TextEncoder().encode(text);
