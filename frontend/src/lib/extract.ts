// Client-side extraction of text from PDFs and images.
// Libraries are dynamically imported so they don't bloat the initial bundle.

export const MAX_FILES = 3;
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_MIME =
  "application/pdf,image/png,image/jpeg,image/jpg,image/webp";
export const ACCEPTED_EXT = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

export type ExtractKind = "pdf" | "image";

export interface ExtractResult {
  text: string;
  kind: ExtractKind;
  truncated: boolean;
  originalChars: number;
}

export type ValidationError = "size" | "type";

export function validateFile(file: File): ValidationError | null {
  const name = file.name.toLowerCase();
  const okExt = ACCEPTED_EXT.some((e) => name.endsWith(e));
  if (!okExt) return "type";
  if (file.size > MAX_FILE_BYTES) return "size";
  return null;
}

function wrap(text: string, kind: ExtractKind): ExtractResult {
  return { text, kind, truncated: false, originalChars: text.length };
}

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;
async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs = await import("pdfjs-dist");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

let tesseractWorkerPromise: Promise<import("tesseract.js").Worker> | null = null;
async function getTesseractWorker(onProgress?: (p: number) => void) {
  if (!tesseractWorkerPromise) {
    tesseractWorkerPromise = (async () => {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m) => {
          if (m.status === "recognizing text" && onProgress) onProgress(m.progress);
        },
      });
      return worker;
    })();
  }
  return tesseractWorkerPromise;
}

async function extractPdf(
  file: File,
  onProgress?: (p: number) => void,
): Promise<ExtractResult> {
  const pdfjs = await getPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const maxPages = doc.numPages;
  const parts: string[] = [];
  for (let p = 1; p <= maxPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ");
    if (pageText.trim()) parts.push(`[Page ${p}]\n${pageText}`);
    onProgress?.(p / maxPages);
  }
  const joined = parts.join("\n\n").trim();
  // If we got almost no text, treat as scanned PDF → OCR page 1..min(5,pages)
  if (joined.length < 40) {
    const ocrPages: string[] = [];
    const ocrLimit = Math.min(doc.numPages, 5);
    const worker = await getTesseractWorker();
    for (let p = 1; p <= ocrLimit; p++) {
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const { data } = await worker.recognize(canvas);
      if (data.text.trim()) ocrPages.push(`[Page ${p} (OCR)]\n${data.text}`);
      onProgress?.(p / ocrLimit);
    }
    const ocrJoined = ocrPages.join("\n\n").trim();
    return wrap(ocrJoined, "pdf");
  }
  return wrap(joined, "pdf");
}

async function extractImage(
  file: File,
  onProgress?: (p: number) => void,
): Promise<ExtractResult> {
  const worker = await getTesseractWorker(onProgress);
  const url = URL.createObjectURL(file);
  try {
    const { data } = await worker.recognize(url);
    return wrap(data.text.trim(), "image");
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function extractFile(
  file: File,
  onProgress?: (p: number) => void,
): Promise<ExtractResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractPdf(file, onProgress);
  return extractImage(file, onProgress);
}
