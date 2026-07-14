import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  extractFile,
  validateFile,
  MAX_FILES,
  type ExtractResult,
} from "@/lib/extract";

export interface Attachment {
  id: string;
  file: File;
  url: string; // object URL for in-chat viewing
  kind: "pdf" | "image";
  status: "extracting" | "done" | "error";
  progress: number;
  result?: ExtractResult;
  error?: string;
}

export interface AttachmentMeta {
  id: string;
  name: string;
  size: number;
  kind: "pdf" | "image";
  url: string;
}

function kindOf(file: File): "pdf" | "image" {
  return file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
}

export function useAttachments() {
  const [items, setItems] = useState<Attachment[]>([]);
  const idRef = useRef(0);
  // Track URLs to revoke when the hook unmounts. We deliberately keep URLs
  // alive after send() so chat bubbles can still open them for the session.
  const urlsRef = useRef<string[]>([]);

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    };
  }, []);

  const addFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files);
    setItems((prev) => {
      const room = MAX_FILES - prev.length;
      if (arr.length > room) {
        toast.warning(`Max ${MAX_FILES} files allowed`);
      }
      const accepted: File[] = [];
      for (const f of arr.slice(0, Math.max(0, room))) {
        const err = validateFile(f);
        if (err === "size") {
          toast.warning("Max 10 MB is allowed", { description: f.name });
          continue;
        }
        if (err === "type") {
          toast.warning("Unsupported file type", {
            description: `${f.name} — PDF, PNG, JPG, JPEG, WEBP only`,
          });
          continue;
        }
        accepted.push(f);
      }
      const newOnes: Attachment[] = accepted.map((file) => {
        idRef.current += 1;
        const id = `att-${idRef.current}`;
        const url = URL.createObjectURL(file);
        urlsRef.current.push(url);
        return {
          id,
          file,
          url,
          kind: kindOf(file),
          status: "extracting",
          progress: 0,
        };
      });
      newOnes.forEach((att) => {
        extractFile(att.file, (p) => {
          setItems((cur) =>
            cur.map((x) => (x.id === att.id ? { ...x, progress: p } : x)),
          );
        })
          .then((result) => {
            setItems((cur) =>
              cur.map((x) =>
                x.id === att.id
                  ? { ...x, status: "done", progress: 1, result }
                  : x,
              ),
            );
          })
          .catch((e) => {
            const msg = e instanceof Error ? e.message : "Extraction failed";
            toast.error("Could not read file", { description: `${att.file.name}: ${msg}` });
            setItems((cur) =>
              cur.map((x) =>
                x.id === att.id ? { ...x, status: "error", error: msg } : x,
              ),
            );
          });
      });
      return [...prev, ...newOnes];
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((cur) => cur.filter((x) => x.id !== id));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const isBusy = items.some((x) => x.status === "extracting");
  const validCount = items.filter((x) => x.status === "done").length;

  const buildComposedQuery = useCallback(
    (userText: string) => {
      const done = items.filter((x) => x.status === "done" && x.result);
      if (done.length === 0) return userText;
      const blocks = done.map(
        (a) => `---\n[Attachment: ${a.file.name}]\n${a.result!.text}`,
      );
      return `${userText}\n\n${blocks.join("\n\n")}\n---`;
    },
    [items],
  );

  const takeAttachmentsMeta = useCallback((): AttachmentMeta[] => {
    return items
      .filter((x) => x.status === "done" || x.status === "extracting")
      .map((a) => ({
        id: a.id,
        name: a.file.name,
        size: a.file.size,
        kind: a.kind,
        url: a.url,
      }));
  }, [items]);

  return {
    items,
    addFiles,
    remove,
    clear,
    isBusy,
    validCount,
    buildComposedQuery,
    takeAttachmentsMeta,
  };
}
