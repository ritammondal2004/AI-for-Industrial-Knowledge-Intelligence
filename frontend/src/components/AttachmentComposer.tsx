import { Paperclip, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { ACCEPTED_MIME, MAX_FILES } from "@/lib/extract";
import type { Attachment } from "@/hooks/useAttachments";

interface Props {
  items: Attachment[];
  onAdd: (files: FileList | File[]) => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AttachButton({
  onAdd,
  disabled,
  count,
}: {
  onAdd: (files: FileList | File[]) => void;
  disabled?: boolean;
  count: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const atCap = count >= MAX_FILES;
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME}
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) onAdd(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => {
          if (atCap) {
            toast.warning(`Max ${MAX_FILES} files allowed`);
            return;
          }
          inputRef.current?.click();
        }}
        onMouseEnter={() => {
          if (atCap) toast.warning(`Max ${MAX_FILES} files allowed`, { id: "att-cap" });
        }}
        disabled={disabled}
        title={atCap ? `Max ${MAX_FILES} files allowed` : "Attach PDF or image (max 3 · 10 MB each)"}
        className={`shrink-0 inline-flex items-center justify-center h-[42px] w-[42px] rounded-lg border bg-[var(--surface-high)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
          atCap
            ? "border-amber/60 text-amber cursor-not-allowed"
            : "border-border text-muted-foreground hover:text-foreground hover:border-violet"
        }`}
      >
        <Paperclip size={16} />
      </button>
    </>
  );
}

export function AttachmentChips({
  items,
  onRemove,
}: {
  items: Attachment[];
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div className="max-w-3xl mx-auto mb-2 flex flex-wrap gap-2">
      {items.map((a) => {
        const isPdf = a.file.name.toLowerCase().endsWith(".pdf");
        const Icon = isPdf ? FileText : ImageIcon;
        const isErr = a.status === "error";
        return (
          <div
            key={a.id}
            className={`glass-card inline-flex items-center gap-2 pl-2.5 pr-1.5 py-1.5 text-xs ${
              isErr ? "border-destructive/60" : ""
            }`}
          >
            <Icon size={12} className={isErr ? "text-destructive" : "text-violet"} />
            <span className="max-w-[180px] truncate font-mono">{a.file.name}</span>
            <span className="text-muted-foreground">{fmtSize(a.file.size)}</span>
            {a.status === "extracting" && (
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Loader2 size={11} className="animate-spin" />
                {a.progress > 0 ? `${Math.round(a.progress * 100)}%` : "…"}
              </span>
            )}
            {a.status === "done" && a.result?.truncated && (
              <span className="text-amber">truncated</span>
            )}
            {isErr && <span className="text-destructive">{a.error}</span>}
            <button
              type="button"
              onClick={() => onRemove(a.id)}
              className="ml-1 h-5 w-5 inline-flex items-center justify-center rounded hover:bg-background/60 text-muted-foreground hover:text-foreground"
              aria-label="Remove attachment"
            >
              <X size={12} />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export function useDropzone(onAdd: (files: FileList | File[]) => void, disabled?: boolean) {
  return {
    onDragOver: (e: React.DragEvent) => {
      if (disabled) return;
      if (e.dataTransfer.types.includes("Files")) e.preventDefault();
    },
    onDrop: (e: React.DragEvent) => {
      if (disabled) return;
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        e.preventDefault();
        onAdd(e.dataTransfer.files);
      }
    },
  };
}

export type { Props as AttachmentComposerProps };
