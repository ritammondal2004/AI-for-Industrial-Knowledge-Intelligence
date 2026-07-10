import type { Source } from "@/lib/api";
import { FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  error?: boolean;
}

// Track which assistant answers have already been animated so historical
// messages don't re-animate when the user switches modes/pages.
const streamedContent = new Set<string>();

// Strip the trailing "Sources Referenced" block from the answer body since
// we render sources as chips below.
function stripSourcesBlock(text: string): string {
  const idx = text.search(/\n\s*(?:📚\s*)?\*\*Sources Referenced:?\*\*/i);
  return idx === -1 ? text : text.slice(0, idx).trimEnd();
}

export function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";
  const fullBody = isUser ? message.content : stripSourcesBlock(message.content);
  const key = `${message.role}:${fullBody}`;
  const alreadyStreamed = isUser || streamedContent.has(key);

  const [revealed, setRevealed] = useState(alreadyStreamed ? fullBody : "");
  const initialAlreadyStreamed = useRef(alreadyStreamed);

  useEffect(() => {
    if (initialAlreadyStreamed.current) {
      setRevealed(fullBody);
      return;
    }
    const tokens = fullBody.split(/(\s+)/);
    let i = 0;
    setRevealed("");
    const id = setInterval(() => {
      i += 1;
      setRevealed(tokens.slice(0, i).join(""));
      if (i >= tokens.length) {
        clearInterval(id);
        streamedContent.add(key);
      }
    }, 35);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const body = revealed;

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-4 py-3 ${
          isUser
            ? "glass-hi rounded-xl border-l-2 border-l-violet"
            : "glass-card border-l-2 border-l-emerald"
        } ${message.error ? "border-l-destructive" : ""}`}
      >
        <div className="text-[11px] font-geist uppercase tracking-widest text-muted-foreground mb-1.5">
          {isUser ? "You" : "Assistant"}
        </div>
        {isUser ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{body}</div>
        ) : (
          <div className="markdown text-sm leading-relaxed">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-teal underline underline-offset-2 hover:text-amber break-all"
                  >
                    {children}
                  </a>
                ),
                h1: ({ children }) => (
                  <h3 className="text-base font-semibold mt-3 mb-1.5">{children}</h3>
                ),
                h2: ({ children }) => (
                  <h3 className="text-sm font-semibold mt-3 mb-1.5 text-amber">
                    {children}
                  </h3>
                ),
                h3: ({ children }) => (
                  <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>
                ),
                p: ({ children }) => <p className="my-2">{children}</p>,
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
                ),
                code: ({ children }) => (
                  <code className="font-mono text-[12px] bg-background px-1 py-0.5 rounded border border-border">
                    {children}
                  </code>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">{children}</strong>
                ),
              }}
            >
              {body}
            </ReactMarkdown>
          </div>
        )}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Sources
            </div>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((s, i) => (
                <SourceChip key={i} source={s} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function SourceChip({ source, accent = "teal" }: { source: Source; accent?: "teal" | "orange" }) {
  const pages = Array.isArray(source.pages)
    ? source.pages.join(",")
    : source.pages;
  const isOrange = accent === "orange";
  const borderCls = isOrange
    ? "border-[#e67e22]/50 hover:border-[#e67e22] hover:bg-[#e67e22]/5"
    : "border-teal/40 hover:border-teal hover:bg-teal/5";
  const iconCls = isOrange ? "text-[#e67e22]" : "text-teal";
  return (
    <a
      href={source.pdf_url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-background border ${borderCls} transition-colors font-mono text-[11px] text-foreground`}
    >
      <FileText size={12} className={iconCls} />
      <span>{source.filename}</span>
      {pages && <span className="text-muted-foreground">· p.{pages}</span>}
      {source.folder && <span className={iconCls}>[{source.folder}]</span>}
    </a>
  );
}

const THINKING_STAGES = [
  "Parsing raw industrial schematics...",
  "Refining user semantic query...",
  "Traversing Knowledge Graph relationships...",
  "Retrieving adjacent documentation fragments...",
  "Finding optimal match...",
  "Assembling structural context corpus...",
  "Evaluating regulatory compliance constraints.",
  "Refining context payload margins...",
  "Generating verified content payload...",
];

export function ThinkingBubble({ label = "AI is thinking" }: { label?: string } = {}) {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(
      () => setIdx((i) => (i + 1) % THINKING_STAGES.length),
      1600,
    );
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex justify-start">
      <div className="glass-card px-5 py-4 min-w-[320px]">
        <div className="flex items-center gap-4">
          {/* Dual counter-rotating ring bot icon */}
          <div className="relative h-12 w-12 shrink-0">
            <svg
              viewBox="0 0 48 48"
              className="absolute inset-0 animate-spin-fwd"
              aria-hidden
            >
              <defs>
                <linearGradient id="ring-a" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="100%" stopColor="#cebdff" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <circle
                cx="24"
                cy="24"
                r="20"
                fill="none"
                stroke="url(#ring-a)"
                strokeWidth="2"
                strokeDasharray="60 200"
                strokeLinecap="round"
              />
            </svg>
            <svg
              viewBox="0 0 48 48"
              className="absolute inset-0 animate-spin-rev"
              aria-hidden
            >
              <defs>
                <linearGradient id="ring-b" x1="1" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#45dfa4" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.15" />
                </linearGradient>
              </defs>
              <circle
                cx="24"
                cy="24"
                r="14"
                fill="none"
                stroke="url(#ring-b)"
                strokeWidth="2"
                strokeDasharray="40 140"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="h-2 w-2 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle, #cebdff 0%, #a78bfa 60%, transparent 100%)",
                  boxShadow: "0 0 12px 2px rgba(167,139,250,0.6)",
                }}
              />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold tracking-tight text-foreground">
                {label}
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-violet animate-pulse-glow" />
            </div>
            <div className="mt-1.5 h-4 overflow-hidden">
              <div
                key={idx}
                className="font-geist text-[11px] uppercase tracking-wider text-muted-foreground animate-ticker-in flex items-center gap-1.5"
              >
                <span className="text-violet">▹</span>
                <span className="truncate">{THINKING_STAGES[idx]}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
