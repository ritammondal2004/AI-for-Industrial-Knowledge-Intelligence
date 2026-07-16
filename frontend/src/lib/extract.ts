// Client-side extraction of text from PDFs and images.
// Images (and text-less PDF pages) are captioned via the /api/caption
// server route, which calls Gemini 2.5 Flash with a refinery-engineer
// system prompt. PDF pages with an embedded text layer are read directly
// via pdfjs (fast, free, no network).

export const MAX_FILES = 3;
export const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10MB
export const ACCEPTED_MIME =
  "application/pdf,image/png,image/jpeg,image/jpg,image/webp";
export const ACCEPTED_EXT = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

// Cap on how many text-less PDF pages we send to Gemini per file, to keep
// latency and cost bounded. Pages beyond this are skipped with a note.
const MAX_VISION_PDF_PAGES = 8;

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

function wrap(text: string, kind: ExtractKind, truncated = false): ExtractResult {
  return { text, kind, truncated, originalChars: text.length };
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

function fileToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("read failed"));
    reader.readAsDataURL(blob);
  });
}

async function captionImageBlob(
  blob: Blob,
  mime: string,
  hint?: string,
): Promise<string> {
  const imageBase64 = await fileToBase64(blob);
  const res = await fetch("/api/caption", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imageBase64, mime, hint }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`Vision failed (${res.status}): ${t.slice(0, 200)}`);
  }
  const json = (await res.json()) as { caption?: string };
  return (json.caption ?? "").trim();
}

async function extractPdf(
  file: File,
  onProgress?: (p: number) => void,
): Promise<ExtractResult> {
  const pdfjs = await getPdfjs();
  const buf = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buf }).promise;
  const totalPages = doc.numPages;

  // Phase 1: extract embedded text for every page.
  const pageTexts: string[] = new Array(totalPages).fill("");
  const emptyPages: number[] = [];
  for (let p = 1; p <= totalPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((it) => ("str" in it ? (it as { str: string }).str : ""))
      .join(" ")
      .trim();
    pageTexts[p - 1] = pageText;
    if (pageText.length < 20) emptyPages.push(p);
    onProgress?.((p / totalPages) * 0.5);
  }

  // Phase 2: for pages with no meaningful text, rasterize and caption via Gemini.
  const visionTargets = emptyPages.slice(0, MAX_VISION_PDF_PAGES);
  const skipped = emptyPages.length - visionTargets.length;

  for (let i = 0; i < visionTargets.length; i++) {
    const p = visionTargets[i];
    try {
      const page = await doc.getPage(p);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement("canvas");
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      await page.render({ canvasContext: ctx, viewport, canvas }).promise;
      const blob: Blob = await new Promise((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("toBlob failed"))),
          "image/jpeg",
          0.85,
        ),
      );
      const caption = await captionImageBlob(
        blob,
        "image/jpeg",
        `PDF page ${p} of ${totalPages} from "${file.name}"`,
      );
      if (caption) pageTexts[p - 1] = `[VISION]\n${caption}`;
    } catch (e) {
      console.warn(`Vision failed for page ${p}:`, e);
    }
    onProgress?.(0.5 + ((i + 1) / Math.max(visionTargets.length, 1)) * 0.5);
  }

  const parts: string[] = [];
  for (let i = 0; i < totalPages; i++) {
    const t = pageTexts[i];
    if (t) parts.push(`[Page ${i + 1}]\n${t}`);
  }
  if (skipped > 0) {
    parts.push(
      `[Note] ${skipped} additional image-only page(s) were skipped to keep processing fast.`,
    );
  }
  return wrap(parts.join("\n\n").trim(), "pdf", skipped > 0);
}

async function extractImage(
  file: File,
  onProgress?: (p: number) => void,
): Promise<ExtractResult> {
  onProgress?.(0.1);
  const mime = file.type || "image/jpeg";
  const caption = await captionImageBlob(file, mime, `Uploaded image: ${file.name}`);
  onProgress?.(1);
  return wrap(caption, "image");
}

export async function extractFile(
  file: File,
  onProgress?: (p: number) => void,
): Promise<ExtractResult> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pdf")) return extractPdf(file, onProgress);
  return extractImage(file, onProgress);
}
