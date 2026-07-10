import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { BACKEND_URL } from "@/lib/api";
import { useModeChat } from "@/lib/chat-store";
import analyticsIcon from "@/assets/analytics-icon.png";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "System Analytics — Industrial AI Support" },
      {
        name: "description",
        content:
          "Benchmark evaluation results across 120 industrial knowledge questions.",
      },
    ],
  }),
  component: AnalyticsPage,
});

interface QuestionScore {
  id: number;
  difficulty: string;
  category: string;
  question: string;
  overall_score: number;
  keyword_score: number;
  source_score: number;
}

interface EvalResults {
  summary: {
    total: number;
    avg_overall: number;
    avg_keyword: number;
    avg_source: number;
    avg_folder: number;
  };
  score_distribution: Record<string, number>;
  by_difficulty: Record<string, number>;
  by_category: Record<string, number>;
  radar: Record<string, number>;
  question_scores: QuestionScore[];
}

async function fetchEval(): Promise<EvalResults> {
  const res = await fetch(`${BACKEND_URL}/eval/results`);
  if (res.status === 404) {
    const err = new Error("NOT_FOUND");
    (err as Error & { code?: number }).code = 404;
    throw err;
  }
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json();
}

// Dashboard-inspired palette: teal, coral, orange, amber, plus supporting hues
const PALETTE = ["#2ba9b8", "#ff6b5b", "#f5a623", "#ffcf6b", "#7bc4c9", "#e85a4f"];
const TEAL = "#2ba9b8";
const CORAL = "#ff6b5b";
const ORANGE = "#f5a623";
const AMBER_GLOW = "rgba(245,166,35,0.35)";

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}

function MetricCard({ label, value, color }: { label: string; value: number; color: string }) {
  const v = useCountUp(value);
  return (
    <div
      className="rounded-lg border border-border bg-panel p-4 md:p-5 shadow-[0_4px_20px_rgba(0,0,0,0.4)] transition-colors"
      style={{ borderColor: `${color}55` }}
    >
      <div
        className="text-3xl md:text-4xl font-geist font-semibold tabular-nums"
        style={{ color, textShadow: `0 0 12px ${AMBER_GLOW}` }}
      >
        {(v * 100).toFixed(1)}%
      </div>
      <div className="mt-1 text-[11px] uppercase tracking-widest text-muted-foreground font-geist">
        {label}
      </div>
    </div>
  );
}

const chartTooltipStyle = {
  backgroundColor: "hsl(var(--panel, 220 15% 10%))",
  border: "1px solid rgba(43,169,184,0.5)",
  borderRadius: 8,
  fontSize: 12,
  fontFamily: "var(--font-geist, ui-sans-serif)",
};

function DifficultyBadge({ d }: { d: string }) {
  const map: Record<string, string> = {
    easy: "bg-emerald/15 text-emerald border-emerald/40",
    medium: "bg-[#f5a623]/15 text-[#f5a623] border-[#f5a623]/40",
    hard: "bg-[#ff6b5b]/15 text-[#ff6b5b] border-[#ff6b5b]/40",
  };
  const cls = map[d.toLowerCase()] || "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-geist uppercase tracking-wider border ${cls}`}>
      {d}
    </span>
  );
}

function scoreColor(s: number) {
  if (s >= 0.8) return "text-emerald";
  if (s >= 0.6) return "text-[#f5a623]";
  return "text-[#ff6b5b]";
}

type SortKey = keyof QuestionScore;
type SortDir = "asc" | "desc";

function QuestionsTable({ rows }: { rows: QuestionScore[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("id");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [page, setPage] = useState(1);
  const perPage = 20;

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      return sortDir === "asc"
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / perPage));
  const cur = Math.min(page, pageCount);
  const pageRows = sorted.slice((cur - 1) * perPage, cur * perPage);

  function toggle(key: SortKey) {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  }

  const headers: { key: SortKey; label: string; className?: string }[] = [
    { key: "id", label: "ID", className: "w-14" },
    { key: "difficulty", label: "Difficulty", className: "w-24" },
    { key: "category", label: "Category", className: "w-28" },
    { key: "question", label: "Question" },
    { key: "overall_score", label: "Overall", className: "w-20 text-right" },
    { key: "keyword_score", label: "Keyword", className: "w-20 text-right" },
    { key: "source_score", label: "Source", className: "w-20 text-right" },
  ];

  return (
    <div className="rounded-lg border border-border bg-panel overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs font-geist">
          <thead>
            <tr className="border-b border-border bg-[var(--surface-high)]">
              {headers.map((h) => (
                <th
                  key={h.key}
                  onClick={() => toggle(h.key)}
                  className={`px-3 py-2 text-left font-semibold text-muted-foreground uppercase tracking-wider text-[10px] cursor-pointer hover:text-[#2ba9b8] select-none ${h.className || ""}`}
                >
                  <span className="inline-flex items-center gap-1">
                    {h.label}
                    {sortKey === h.key &&
                      (sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} className="border-b border-border/50 hover:bg-[var(--surface-high)]/50">
                <td className="px-3 py-2 text-muted-foreground tabular-nums">{r.id}</td>
                <td className="px-3 py-2"><DifficultyBadge d={r.difficulty} /></td>
                <td className="px-3 py-2 text-foreground">{r.category}</td>
                <td className="px-3 py-2 text-foreground/90 max-w-md truncate" title={r.question}>{r.question}</td>
                <td className={`px-3 py-2 text-right tabular-nums font-semibold ${scoreColor(r.overall_score)}`}>{(r.overall_score * 100).toFixed(0)}%</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{(r.keyword_score * 100).toFixed(0)}%</td>
                <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">{(r.source_score * 100).toFixed(0)}%</td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={headers.length} className="px-3 py-6 text-center text-muted-foreground">No questions match the current filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t border-border text-xs font-geist text-muted-foreground">
        <span>
          Showing {sorted.length === 0 ? 0 : (cur - 1) * perPage + 1}–{Math.min(cur * perPage, sorted.length)} of {sorted.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={cur === 1}
            className="p-1 rounded border border-border hover:border-[#2ba9b8] disabled:opacity-40 disabled:hover:border-border"
            aria-label="Previous page"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="px-2 tabular-nums">{cur} / {pageCount}</span>
          <button
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={cur === pageCount}
            className="p-1 rounded border border-border hover:border-[#2ba9b8] disabled:opacity-40 disabled:hover:border-border"
            aria-label="Next page"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4">
      <h3 className="text-xs font-geist font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        {title}
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

const BUCKETS: { key: string; min: number; max: number }[] = [
  { key: "0.0-0.2", min: 0, max: 0.2 },
  { key: "0.2-0.4", min: 0.2, max: 0.4 },
  { key: "0.4-0.6", min: 0.4, max: 0.6 },
  { key: "0.6-0.8", min: 0.6, max: 0.8 },
  { key: "0.8-1.0", min: 0.8, max: 1.0001 },
];

function computeFromRows(rows: QuestionScore[], baseline: EvalResults) {
  const n = rows.length || 1;
  const avg = (k: keyof QuestionScore) =>
    rows.reduce((s, r) => s + (r[k] as number), 0) / n;

  const score_distribution: Record<string, number> = {};
  BUCKETS.forEach((b) => (score_distribution[b.key] = 0));
  rows.forEach((r) => {
    const b = BUCKETS.find((x) => r.overall_score >= x.min && r.overall_score < x.max);
    if (b) score_distribution[b.key]++;
  });

  const groupAvg = (key: "difficulty" | "category") => {
    const g: Record<string, { s: number; c: number }> = {};
    rows.forEach((r) => {
      const k = r[key];
      if (!g[k]) g[k] = { s: 0, c: 0 };
      g[k].s += r.overall_score;
      g[k].c++;
    });
    const out: Record<string, number> = {};
    Object.entries(g).forEach(([k, v]) => (out[k] = v.s / v.c));
    return out;
  };

  const filteredAvgOverall = rows.length ? avg("overall_score") : 0;
  const ratio =
    baseline.summary.avg_overall > 0 && rows.length
      ? filteredAvgOverall / baseline.summary.avg_overall
      : rows.length
        ? 1
        : 0;

  const radar: Record<string, number> = {};
  Object.entries(baseline.radar).forEach(([k, v]) => {
    radar[k] = Math.max(0, Math.min(1, v * ratio));
  });

  return {
    summary: {
      total: rows.length,
      avg_overall: rows.length ? avg("overall_score") : 0,
      avg_keyword: rows.length ? avg("keyword_score") : 0,
      avg_source: rows.length ? avg("source_score") : 0,
      avg_folder: baseline.summary.avg_folder * ratio,
    },
    score_distribution,
    by_difficulty: groupAvg("difficulty"),
    by_category: groupAvg("category"),
    radar,
  };
}

function AnalyticsPage() {
  const knowledge = useModeChat("knowledge");
  const { data, isLoading, error } = useQuery({
    queryKey: ["eval-results"],
    queryFn: fetchEval,
    retry: false,
  });

  const notFound = (error as Error & { code?: number })?.code === 404;

  // Filters
  const [idQuery, setIdQuery] = useState("");
  const [difficulty, setDifficulty] = useState("all");
  const [category, setCategory] = useState("all");

  const difficulties = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.question_scores.map((q) => q.difficulty)));
  }, [data]);
  const categories = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.question_scores.map((q) => q.category)));
  }, [data]);

  const filteredRows = useMemo(() => {
    if (!data) return [];
    return data.question_scores.filter((r) => {
      if (difficulty !== "all" && r.difficulty !== difficulty) return false;
      if (category !== "all" && r.category !== category) return false;
      if (idQuery.trim() && !String(r.id).includes(idQuery.trim())) return false;
      return true;
    });
  }, [data, difficulty, category, idQuery]);

  const derived = useMemo(
    () => (data ? computeFromRows(filteredRows, data) : null),
    [data, filteredRows],
  );

  const filtersActive =
    idQuery.trim() !== "" || difficulty !== "all" || category !== "all";

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar memoryTurns={knowledge.messages.filter((m) => m.role === "user").length} onClear={knowledge.clear} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
          <header className="border-b border-border pb-4">
            <h1 className="font-geist text-2xl md:text-3xl font-semibold tracking-tight flex items-center gap-3">
              <img
                src={analyticsIcon}
                alt="Analytics"
                className="w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_0_10px_rgba(43,169,184,0.5)]"
              />
              <span>System Analytics</span>
            </h1>
            <p className="text-sm text-muted-foreground font-geist mt-1">
              Benchmark evaluation across 120 industrial knowledge questions
            </p>
          </header>

          {isLoading && <LoadingSkeleton />}

          {error && notFound && (
            <div className="rounded-lg border border-[#f5a623]/40 bg-[#f5a623]/5 p-6 text-center">
              <div className="text-2xl mb-2">📉</div>
              <p className="font-geist text-[#f5a623] font-semibold">Evaluation data not available yet.</p>
              <p className="text-muted-foreground text-sm mt-1">Likely evaluation pipeline was not runned.</p>
            </div>
          )}

          {error && !notFound && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 text-center text-destructive font-geist">
              Failed to load evaluation results.
            </div>
          )}

          {data && derived && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <MetricCard label="Overall Score" value={derived.summary.avg_overall} color={TEAL} />
                <MetricCard label="Keyword Coverage" value={derived.summary.avg_keyword} color={ORANGE} />
                <MetricCard label="Source Retrieval" value={derived.summary.avg_source} color={CORAL} />
                <MetricCard label="Folder Routing" value={derived.summary.avg_folder} color="#ffcf6b" />
              </div>

              {/* Distribution + difficulty */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartPanel title="Score Distribution">
                  <BarChart data={Object.entries(derived.score_distribution).map(([bucket, count]) => ({ bucket, count }))}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={chartTooltipStyle} cursor={{ fill: "rgba(43,169,184,0.08)" }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {Object.keys(derived.score_distribution).map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartPanel>
                <ChartPanel title="By Difficulty">
                  <BarChart data={Object.entries(derived.by_difficulty).map(([difficulty, score]) => ({ difficulty, score }))}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="difficulty" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                    <YAxis domain={[0, 1]} tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} cursor={{ fill: "rgba(245,166,35,0.08)" }} />
                    <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                      {Object.keys(derived.by_difficulty).map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartPanel>
              </div>

              {/* Category + radar */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartPanel title="By Category">
                  <BarChart
                    layout="vertical"
                    data={Object.entries(derived.by_category).map(([category, score]) => ({ category, score }))}
                    margin={{ left: 10 }}
                  >
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" horizontal={false} />
                    <XAxis type="number" domain={[0, 1]} tick={{ fill: "#9ca3af", fontSize: 11 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                    <YAxis type="category" dataKey="category" tick={{ fill: "#9ca3af", fontSize: 11 }} width={90} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} cursor={{ fill: "rgba(255,107,91,0.08)" }} />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                      {Object.keys(derived.by_category).map((_, i) => (
                        <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartPanel>
                <ChartPanel title="Capability Radar">
                  <RadarChart data={Object.entries(derived.radar).map(([metric, score]) => ({ metric, score }))}>
                    <PolarGrid stroke="rgba(255,255,255,0.15)" />
                    <PolarAngleAxis dataKey="metric" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 1]} tick={{ fill: "#6b7280", fontSize: 9 }} tickFormatter={(v) => `${Math.round(v * 100)}%`} />
                    <Radar name="Score" dataKey="score" stroke={TEAL} fill={TEAL} fillOpacity={0.35} />
                    <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => `${(v * 100).toFixed(1)}%`} />
                  </RadarChart>
                </ChartPanel>
              </div>

              {/* Per-question filters + table */}
              <section>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h2 className="text-xs font-geist font-semibold uppercase tracking-widest text-muted-foreground">
                    Per-Question Scores
                  </h2>
                  {filtersActive && (
                    <span className="text-[10px] font-geist uppercase tracking-widest text-[#2ba9b8]">
                      Filters active · charts updated
                    </span>
                  )}
                </div>

                <div className="rounded-lg border border-border bg-panel p-3 mb-3 flex flex-wrap items-end gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-geist">ID</label>
                    <input
                      type="text"
                      value={idQuery}
                      onChange={(e) => setIdQuery(e.target.value)}
                      placeholder="e.g. 42"
                      className="bg-background border border-border rounded px-2 py-1.5 text-xs font-geist w-28 focus:border-[#2ba9b8] focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-geist">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="bg-background border border-border rounded px-2 py-1.5 text-xs font-geist min-w-32 focus:border-[#2ba9b8] focus:outline-none"
                    >
                      <option value="all">All</option>
                      {difficulties.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-geist">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="bg-background border border-border rounded px-2 py-1.5 text-xs font-geist min-w-40 focus:border-[#2ba9b8] focus:outline-none"
                    >
                      <option value="all">All</option>
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  {filtersActive && (
                    <button
                      onClick={() => { setIdQuery(""); setDifficulty("all"); setCategory("all"); }}
                      className="ml-auto text-xs font-geist px-3 py-1.5 rounded border border-border hover:border-[#ff6b5b] hover:text-[#ff6b5b] transition-colors"
                    >
                      Clear filters
                    </button>
                  )}
                </div>

                <QuestionsTable rows={filteredRows} />
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-lg border border-border bg-panel" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-72 rounded-lg border border-border bg-panel" />
        <div className="h-72 rounded-lg border border-border bg-panel" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-72 rounded-lg border border-border bg-panel" />
        <div className="h-72 rounded-lg border border-border bg-panel" />
      </div>
      <div className="h-96 rounded-lg border border-border bg-panel" />
    </div>
  );
}
