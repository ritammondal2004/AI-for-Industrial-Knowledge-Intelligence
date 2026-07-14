import { useEffect, useRef, useState } from "react";
import { Zap } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ChatMessage, ThinkingBubble } from "./ChatMessage";
import { AccordionMessage, type AccordionSectionSpec } from "./AccordionMessage";
import { AttachButton, AttachmentChips, useDropzone } from "./AttachmentComposer";
import { useAttachments } from "@/hooks/useAttachments";
import { sendRca } from "@/lib/api";
import { useModeChat } from "@/lib/chat-store";


const SECTIONS: AccordionSectionSpec[] = [
  { key: "Failure Summary", label: "Failure Summary", icon: "🔎", defaultOpen: true },
  {
    key: "Possible Root Causes",
    label: "Possible Root Causes",
    icon: "⚠️",
    defaultOpen: true,
    likelihoodPills: true,
  },
  { key: "Supporting Evidence", label: "Supporting Evidence", icon: "📄", defaultOpen: true },
  { key: "Suggested Inspections", label: "Suggested Inspections", icon: "🔬", defaultOpen: false },
  { key: "Corrective Actions", label: "Corrective Actions", icon: "🔧", defaultOpen: false },
  {
    key: "Regulatory / Compliance Notes",
    label: "Regulatory Notes",
    icon: "📋",
    defaultOpen: false,
  },
];

const RCA_SAMPLES = [
  "The discharge pressure of a centrifugal pump suddenly dropped during normal operation. Analyze the possible causes.",
  "A centrifugal pump is producing excessive vibration immediately after startup. Perform a root cause analysis.",
];

export function RcaView() {
  const chat = useModeChat("rca");
  const attachments = useAttachments();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dropzone = useDropzone(attachments.addFiles, loading);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.messages, loading]);

  async function submit(symptom: string) {
    const s = symptom.trim();
    const hasAttachments = attachments.validCount > 0;
    if ((!s && !hasAttachments) || loading || attachments.isBusy) return;
    setInput("");
    const composed = attachments.buildComposedQuery(s);
    const attachmentsMeta = attachments.takeAttachmentsMeta();
    chat.append({ role: "user", content: s, attachments: attachmentsMeta });
    attachments.clear();
    setLoading(true);
    try {
      const res = await sendRca(composed, chat.backend);
      chat.append({ role: "assistant", content: res.analysis, sources: res.sources });
      chat.setBackend(res.chat_history ?? [...chat.backend, [composed, res.analysis]]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Request failed";
      chat.append({
        role: "assistant",
        content: `⚠ ${msg}. Check backend connection.`,
        error: true,
      });
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }


  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <Sidebar memoryTurns={Math.min(chat.backend.length, 3)} onClear={chat.clear} />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="px-4 md:px-8 py-4 md:py-5 border-b border-border">
          <h1 className="text-lg md:text-xl font-semibold tracking-tight">
            🔍 Root Cause Analysis AI
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-geist mt-0.5">
            Describe a symptom or incident. Get a structured failure analysis grounded in your industrial knowledge base.
          </p>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {chat.messages.length === 0 && !loading && (
              <>
                <div className="text-sm text-muted-foreground font-geist glass-card p-4">
                  Describe a symptom, incident, or unexpected behaviour. The assistant returns a structured failure analysis with likelihood-rated root causes.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {RCA_SAMPLES.map((s) => (
                    <button
                      key={s}
                      onClick={() => submit(s)}
                      className="text-left p-4 glass-card hover:border-emerald transition-colors text-sm"
                    >
                      <div className="text-emerald font-geist text-[10px] uppercase tracking-widest mb-1.5">
                        Example
                      </div>
                      {s}
                    </button>
                  ))}
                </div>
              </>
            )}
            {chat.messages.map((m, i) =>
              m.role === "user" ? (
                <ChatMessage key={i} message={m} />
              ) : (
                <AccordionMessage
                  key={i}
                  role="assistant"
                  content={m.content}
                  sections={SECTIONS}
                  sources={m.sources}
                  error={m.error}
                />
              ),
            )}
            {loading && <ThinkingBubble label="Performing root cause analysis..." />}
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          onDragOver={dropzone.onDragOver}
          onDrop={dropzone.onDrop}
          className="border-t border-border px-4 md:px-8 py-4"
        >
          <AttachmentChips items={attachments.items} onRemove={attachments.remove} />
          <div className="max-w-3xl mx-auto">  
            <label className="block text-[11px] font-geist uppercase tracking-widest text-muted-foreground mb-1.5">
              Describe the symptom or incident
            </label>
            <div className="flex gap-2 items-end">
              <AttachButton
                onAdd={attachments.addFiles}
                disabled={loading}
                count={attachments.items.length}
              />
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onPaste={(e) => {
                  const files = Array.from(e.clipboardData?.files ?? []);
                  if (files.length > 0) {
                    e.preventDefault();
                    attachments.addFiles(files);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit(input);
                  }
                }}
                rows={3}
                placeholder="e.g. Centrifugal pump losing discharge pressure after 2 hours of operation. Vibration increasing."
                className="flex-1 min-w-0 bg-[var(--surface-high)] border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/30 transition-colors font-sans resize-none"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={
                  loading ||
                  attachments.isBusy ||
                  (!input.trim() && attachments.validCount === 0)
                }
                className="btn-3d inline-flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-lg bg-gradient-to-br from-emerald to-emerald-glow text-primary-foreground text-sm font-semibold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
              >
                <Zap size={14} />{" "}
                <span className="hidden sm:inline">
                  {attachments.isBusy ? "Extracting…" : "Analyse"}
                </span>
              </button>
            </div>
          </div>
        </form>

      </main>
    </div>
  );
}
