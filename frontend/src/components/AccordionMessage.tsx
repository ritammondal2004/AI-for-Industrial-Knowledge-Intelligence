import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChevronDown } from "lucide-react";
import type { Source } from "@/lib/api";
import { SourceChip } from "./ChatMessage";

export interface AccordionSectionSpec {
  /** header text as written by backend, e.g. "Answer" */
  key: string;
  /** display label */
  label: string;
  /** emoji or symbol prefix */
  icon: string;
  /** default open state */
  defaultOpen?: boolean;
  /** enable likelihood pill rendering inside this section body */
  likelihoodPills?: boolean;
}

interface Props {
  role: "user" | "assistant";
  content: string;
  sections: AccordionSectionSpec[];
  sources?: Source[];
  sourceAccent?: "teal" | "orange";
  error?: boolean;
}

// Track which assistant answers have already been animated so historical
// messages don't re-animate when the user toggles modes.
const streamedContent = new Set<string>();

// Strip the trailing "Sources Referenced" block before parsing.
function stripSourcesBlock(text: string): string {
  const idx = text.search(/\n\s*(?:📚\s*)?\*\*Sources Referenced:?\*\*/i);
  return idx === -1 ? text : text.slice(0, idx).trimEnd();
}

// Robust parser: split ONLY on the known section headers (whole-line **Header**).
function parseSections(text: string, specs: AccordionSectionSpec[]) {
  const cleaned = stripSourcesBlock(text);
  const map: Record<string, string> = {};

  // Find each header's byte index. A header is `**<Name>**` — we accept it
  // either at the very start of the string or after a newline (optionally
  // preceded by whitespace). This prevents bold words inside body content
  // from being treated as section headers.
  const positions: { spec: AccordionSectionSpec; start: number; headerLen: number }[] = [];
  for (const spec of specs) {
    const marker = `**${spec.key}**`;
    // find the first occurrence that is preceded by newline-or-start
    let searchFrom = 0;
    while (searchFrom <= cleaned.length) {
      const idx = cleaned.indexOf(marker, searchFrom);
      if (idx === -1) break;
      const isLineStart = idx === 0 || /\n\s*$/.test(cleaned.slice(0, idx));
      if (isLineStart) {
        positions.push({ spec, start: idx, headerLen: marker.length });
        break;
      }
      searchFrom = idx + marker.length;
    }
  }

  positions.sort((a, b) => a.start - b.start);

  for (let i = 0; i < positions.length; i++) {
    const cur = positions[i];
    const next = positions[i + 1];
    const contentStart = cur.start + cur.headerLen;
    const contentEnd = next ? next.start : cleaned.length;
    map[cur.spec.key] = cleaned.slice(contentStart, contentEnd).trim();
  }

  const found = specs
    .map((s) => ({ spec: s, body: map[s.key] }))
    .filter((x) => x.body && x.body.length > 0);

  const preamble =
    positions.length > 0 ? cleaned.slice(0, positions[0].start).trim() : cleaned.trim();
  return { preamble, found };
}

function renderLikelihood(body: string) {
  return body.replace(/Likelihood:\s*(High|Medium|Low)/gi, (_m, level) => {
    return `\`__LIKELIHOOD_${level.toUpperCase()}__\``;
  });
}

function LikelihoodPill({ level }: { level: "HIGH" | "MEDIUM" | "LOW" }) {
  const styles: Record<string, string> = {
    HIGH: "bg-[#f85149] text-white",
    MEDIUM: "bg-[#e6a817] text-black",
    LOW: "bg-[#30363d] text-[#8b949e]",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase ${styles[level]}`}
    >
      {level}
    </span>
  );
}

function Markdown({ children }: { children: string }) {
  return (
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
          h1: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1.5">{children}</h3>,
          h2: ({ children }) => (
            <h3 className="text-sm font-semibold mt-3 mb-1.5 text-amber">{children}</h3>
          ),
          h3: ({ children }) => <h4 className="text-sm font-semibold mt-2 mb-1">{children}</h4>,
          p: ({ children }) => <p className="my-2">{children}</p>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
          code: ({ children }) => {
            const text = String(children ?? "");
            const pill = text.match(/^__LIKELIHOOD_(HIGH|MEDIUM|LOW)__$/);
            if (pill) return <LikelihoodPill level={pill[1] as "HIGH" | "MEDIUM" | "LOW"} />;
            return (
              <code className="font-mono text-[12px] bg-background px-1 py-0.5 rounded border border-border">
                {children}
              </code>
            );
          },
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}

function Panel({ spec, body }: { spec: AccordionSectionSpec; body: string }) {
  const [open, setOpen] = useState(spec.defaultOpen ?? true);
  const rendered = spec.likelihoodPills ? renderLikelihood(body) : body;
  return (
    <div className="rounded-lg overflow-hidden border border-[#2a2d3a] bg-[#161b22]">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2 px-3 py-3 md:py-2 min-h-[48px] md:min-h-0 bg-[#1c2128] border-l-2 border-l-[#e6a817] text-left"
      >
        <span className="text-base">{spec.icon}</span>
        <span className="text-[13px] md:text-sm font-semibold tracking-tight text-foreground">
          {spec.label}
        </span>
        <ChevronDown
          size={14}
          className={`ml-auto text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 md:px-4 py-3">
          <Markdown>{rendered}</Markdown>
        </div>
      )}
    </div>
  );
}

export function AccordionMessage({
  role,
  content,
  sections,
  sources,
  sourceAccent = "teal",
  error,
}: Props) {
  const isUser = role === "user";
  const key = `${role}:${content}`;
  const alreadyStreamed = isUser || streamedContent.has(key);

  // Word-by-word reveal only on first appearance of a fresh assistant response.
  const [revealed, setRevealed] = useState(alreadyStreamed ? content : "");
  const initialAlreadyStreamed = useRef(alreadyStreamed);

  useEffect(() => {
    if (initialAlreadyStreamed.current) {
      setRevealed(content);
      return;
    }
    const tokens = content.split(/(\s+)/);
    let i = 0;
    setRevealed("");
    const id = setInterval(() => {
      i += 1;
      setRevealed(tokens.slice(0, i).join(""));
      if (i >= tokens.length) {
        clearInterval(id);
        streamedContent.add(key);
      }
    }, 25);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const parsed = useMemo(() => parseSections(revealed, sections), [revealed, sections]);

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`w-full md:max-w-[90%] px-3 md:px-4 py-3 ${
          isUser
            ? "glass-hi rounded-xl border-l-2 border-l-violet"
            : "glass-card border-l-2 border-l-emerald"
        } ${error ? "border-l-destructive" : ""}`}
      >
        <div className="text-[11px] font-geist uppercase tracking-widest text-muted-foreground mb-1.5">
          {isUser ? "You" : "Assistant"}
        </div>

        {isUser ? (
          <div className="text-sm leading-relaxed whitespace-pre-wrap">{revealed}</div>
        ) : (
          <div className="space-y-2">
            {parsed.preamble && parsed.found.length === 0 && <Markdown>{revealed}</Markdown>}
            {parsed.preamble && parsed.found.length > 0 && <Markdown>{parsed.preamble}</Markdown>}
            {parsed.found.map(({ spec, body }) => (
              <Panel key={spec.key} spec={spec} body={body!} />
            ))}
          </div>
        )}

        {sources && sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Sources
            </div>
            <div className="flex flex-wrap gap-2">
              {sources.map((s, i) => (
                <SourceChip
                  key={i}
                  source={s}
                  accent={
                    sourceAccent === "orange" || s.folder === "Incident_Reports"
                      ? "orange"
                      : "teal"
                  }
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
