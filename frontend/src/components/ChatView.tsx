import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { ChatMessage, ThinkingBubble } from "./ChatMessage";
import { sendQuery } from "@/lib/api";
import { useModeChat } from "@/lib/chat-store";

const SUGGESTIONS = [
  "What are the safety precautions before starting a centrifugal pump?",
  "Explain cavitation and how to prevent it",
  "What does OSHA say about permit-to-work procedures?",
  "What should be done after a pump seal failure?",
];

export function ChatView() {
  const chat = useModeChat("knowledge");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat.messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function submit(question: string) {
    const q = question.trim();
    if (!q || loading) return;
    setInput("");
    chat.append({ role: "user", content: q });
    setLoading(true);
    try {
      const res = await sendQuery(q, chat.backend);
      chat.append({ role: "assistant", content: res.answer, sources: res.sources });
      chat.setBackend(res.chat_history ?? [...chat.backend, [q, res.answer]]);
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
            🤖 Industrial Knowledge AI assistant
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground font-geist mt-0.5">
            Query manuals, standards, and procedures with graph-augmented retrieval.
          </p>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 md:px-8 py-6">
          {chat.messages.length === 0 && !loading ? (
            <div className="max-w-3xl mx-auto">
              <div className="mb-6 text-sm text-muted-foreground font-geist">
                Start with a question or pick a suggestion:
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => submit(s)}
                    className="text-left p-4 glass-card hover:border-violet transition-colors text-sm"
                  >
                    <div className="text-violet font-geist text-[10px] uppercase tracking-widest mb-1.5">
                      Example
                    </div>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {chat.messages.map((m, i) => (
                <ChatMessage key={i} message={m} />
              ))}
              {loading && <ThinkingBubble />}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit(input);
          }}
          className="border-t border-border px-4 md:px-8 py-4"
        >
          <div className="max-w-3xl mx-auto flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about equipment, procedures, standards…"
              className="flex-1 min-w-0 bg-[var(--surface-high)] border border-border rounded-lg px-4 py-2.5 text-sm outline-none focus:border-violet focus:ring-2 focus:ring-violet/30 transition-colors font-sans"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="btn-3d inline-flex items-center gap-2 px-4 md:px-5 py-2.5 rounded-lg bg-gradient-to-br from-emerald to-emerald-glow text-primary-foreground text-sm font-semibold tracking-wide disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <Send size={14} /> <span className="hidden sm:inline">Send</span>
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
