import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

// Extracts the text of each page, for asserting on generated PDFs.
export async function pdfPages(bytes: Uint8Array): Promise<string[]> {
  const pdf = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: false }).promise;
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const content = await (await pdf.getPage(n)).getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? item.str + (item.hasEOL ? "\n" : " ") : ""))
        .join("")
        .replace(/[ \t]+/g, " "),
    );
  }
  return pages;
}

// Whole text with whitespace collapsed, so wrapped lines still match.
export const flat = (pages: string[]) => pages.join(" ").replace(/\s+/g, " ");
