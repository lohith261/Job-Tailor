export interface ParseResult {
  text: string;
  pageCount: number;
  wordCount: number;
}

export async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  // Dynamic import to avoid SSR issues with pdf-parse
  const pdfParseModule = await import("pdf-parse");
  const pdfParse = (
    "default" in pdfParseModule ? pdfParseModule.default : pdfParseModule
  ) as unknown as (input: Buffer) => Promise<{ text: string; numpages: number }>;
  const data = await pdfParse(buffer);

  const text = data.text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const wordCount = text
    .split(/\s+/)
    .filter((w) => w.length > 0).length;

  return {
    text,
    pageCount: data.numpages,
    wordCount,
  };
}
