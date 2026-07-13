import {
  Cog,
  Trash2,
  Sun,
  Moon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  Network,
  FileQuestion,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouterState } from "@tanstack/react-router";
import { fetchHealth } from "@/lib/api";
import { useIsMobile } from "@/hooks/use-mobile";

interface SidebarProps {
  memoryTurns: number;
  onClear: () => void;
}

function useTheme() {
  const [isLight, setIsLight] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    return document.documentElement.classList.contains("light");
  });
  useEffect(() => {
    const root = document.documentElement;
    if (isLight) root.classList.add("light");
    else root.classList.remove("light");
    try {
      localStorage.setItem("theme", isLight ? "light" : "dark");
    } catch {
      /* ignore */
    }
  }, [isLight]);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      if (stored === "light") setIsLight(true);
    } catch {
      /* ignore */
    }
  }, []);
  return { isLight, toggle: () => setIsLight((v) => !v) };
}

function ThemeToggle() {
  const { isLight, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="relative flex h-8 w-16 items-center rounded-full border border-[var(--outline-variant)] bg-[var(--surface-high)] px-1 transition-colors"
    >
      <span
        className="absolute top-1/2 h-6 w-6 -translate-y-1/2 rounded-full bg-gradient-to-br from-violet to-violet-glow shadow-[0_0_10px_rgba(167,139,250,0.55)] transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ transform: `translate(${isLight ? 34 : 2}px, -50%)` }}
      />
      <Sun size={12} className={`z-10 ml-1 ${isLight ? "text-primary-foreground" : "text-muted-foreground"}`} />
      <Moon size={12} className={`z-10 ml-auto mr-1 ${!isLight ? "text-primary-foreground" : "text-muted-foreground"}`} />
    </button>
  );
}

function ModeItem({
  mode,
  active,
  collapsed,
  nested = false,
}: {
  mode: ModeDef;
  active: boolean;
  collapsed: boolean;
  nested?: boolean;
}) {
  return (
    <li key={mode.to}>
      <Link
        to={mode.to}
        title={mode.label}
        className={`flex items-center gap-2 py-2 px-2 rounded-md transition-colors ${
          active
            ? "border-l-2 border-l-[#e6a817] text-[#e6a817] bg-[#1c2128]"
            : "text-muted-foreground hover:text-foreground hover:bg-[var(--surface-high)]"
        } ${collapsed ? "justify-center" : ""} ${nested ? "ml-4" : ""}`}
        style={active ? { textShadow: "0 0 10px rgba(230,168,23,0.6)" } : undefined}
      >
        <span className="flex items-center justify-center w-4 h-4 shrink-0">{mode.icon}</span>
        {!collapsed && <span className="truncate">{mode.label}</span>}
        {active && !collapsed && (
          <span
            className="ml-auto h-2 w-2 rounded-full bg-emerald animate-pulse-glow"
            style={{ boxShadow: "0 0 10px 3px rgba(0,255,204,0.9)" }}
          />
        )}
      </Link>
    </li>
  );
}

function ExploreGroup({ pathname, collapsed }: { pathname: string; collapsed: boolean }) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("sidebar-explore-open") === "1";
    } catch {
      return false;
    }
  });
  const isChildActive = EXPLORE_MODES.some((m) => pathname === m.to);

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-explore-open", open ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [open]);

  return (
    <li>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`w-full flex items-center gap-2 py-2 px-2 rounded-md transition-colors ${
          isChildActive
            ? "border-l-2 border-l-[#e6a817] text-[#e6a817] bg-[#1c2128]"
            : "text-muted-foreground hover:text-foreground hover:bg-[var(--surface-high)]"
        } ${collapsed ? "justify-center" : ""}`}
        style={isChildActive ? { textShadow: "0 0 10px rgba(230,168,23,0.6)" } : undefined}
        title="Explore Model"
      >
        <span className="flex items-center justify-center w-4 h-4 shrink-0">
          <Sparkles size={16} className="text-current" />
        </span>
        {!collapsed && (
          <>
            <span className="truncate flex-1 text-left">Explore Model</span>
            <ChevronDown
              size={14}
              className={`shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </>
        )}
      </button>
      {open && (
        <ul className="mt-1 space-y-1">
          {EXPLORE_MODES.map((m) => (
            <ModeItem key={m.to} mode={m} active={pathname === m.to} collapsed={collapsed} nested />
          ))}
        </ul>
      )}
    </li>
  );
}

interface ModeDef {
  to: "/" | "/copilot" | "/rca" | "/graph" | "/analytics";
  icon: ReactNode;
  label: string;
}

const TOP_MODES: ModeDef[] = [
  { to: "/", icon: <span className="text-base leading-none">⚡</span>, label: "Knowledge Assistant" },
  { to: "/copilot", icon: <span className="text-base leading-none">🔧</span>, label: "Expert copilot" },
  { to: "/rca", icon: <span className="text-base leading-none">🔍</span>, label: "Root Cause Analysis" },
];

const EXPLORE_MODES: ModeDef[] = [
  { to: "/graph", icon: <Network size={16} className="text-current" />, label: "Knowledge Graph" },
  { to: "/analytics", icon: <span className="text-base leading-none">📊</span>, label: "Model Performance" },
];

const MIN_W = 200;
const MAX_W = 460;
const DEFAULT_W = 260;

export function Sidebar({ memoryTurns, onClear }: SidebarProps) {
  const { data, isError } = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
  });
  const online = !!data && !isError;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isMobile = useIsMobile();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem("sidebar-collapsed") === "1";
    } catch {
      return false;
    }
  });
  const [width, setWidth] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_W;
    try {
      const raw = localStorage.getItem("sidebar-width");
      const n = raw ? parseInt(raw, 10) : DEFAULT_W;
      return Number.isFinite(n) ? Math.min(MAX_W, Math.max(MIN_W, n)) : DEFAULT_W;
    } catch {
      return DEFAULT_W;
    }
  });
  const draggingRef = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-collapsed", collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);

  useEffect(() => {
    try {
      localStorage.setItem("sidebar-width", String(width));
    } catch {
      /* ignore */
    }
  }, [width]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  function onResizeStart(e: React.MouseEvent) {
    e.preventDefault();
    draggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => {
      if (!draggingRef.current) return;
      const next = Math.min(MAX_W, Math.max(MIN_W, ev.clientX));
      setWidth(next);
    };
    const onUp = () => {
      draggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  const desktopWidth = collapsed ? 64 : width;
  const asideStyle: React.CSSProperties = isMobile
    ? {}
    : { width: `${desktopWidth}px` };

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-2 px-3 py-2 border-b border-border bg-panel/95 backdrop-blur">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="p-2 rounded-md border border-border hover:border-violet"
        >
          <Menu size={16} />
        </button>
        <Cog className="animate-spin-slow text-violet" size={18} />
        <span className="font-geist text-sm font-semibold">Industrial AI Support</span>
      </div>
      <div className="md:hidden h-[48px] shrink-0" />

      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/60"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        style={asideStyle}
        className={`shrink-0 border-r border-border bg-panel flex flex-col h-screen transition-[width] duration-150
          fixed md:sticky top-0 left-0 z-50 w-[260px]
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center gap-2">
          <Cog className="animate-spin-slow text-violet shrink-0" size={22} />
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <h1 className="font-geist text-[15px] font-semibold tracking-tight truncate">
                Industrial AI Support
              </h1>
              <p className="text-[11px] text-muted-foreground mt-0.5 font-geist truncate">
                Hybrid GraphRAG System
              </p>
            </div>
          )}
          <button
            onClick={() => setCollapsed((v) => !v)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="hidden md:inline-flex p-1 rounded-md border border-border hover:border-violet hover:text-violet transition-colors"
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <div className="p-3 border-b border-border">
          {!collapsed && (
            <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-geist mb-2 px-2">
              Modes
            </h2>
          )}
          <ul className="space-y-1 text-xs font-geist">
            {TOP_MODES.map((m) => (
              <ModeItem key={m.to} mode={m} active={pathname === m.to} collapsed={collapsed} />
            ))}

            {/* Explore Model collapsible group */}
            <ExploreGroup pathname={pathname} collapsed={collapsed} />
          </ul>
        </div>

        {!collapsed && (
          <>
            <div className="p-4 border-b border-border">
              <h2 className="text-[10px] uppercase tracking-widest text-muted-foreground font-geist mb-3">
                System Status
              </h2>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`h-2 w-2 rounded-full ${online ? "bg-emerald" : "bg-destructive"} ${online ? "shadow-[0_0_8px_var(--emerald-glow)]" : ""}`}
                />
                <span className="text-xs font-geist">
                  {online ? "Backend online" : "Backend unreachable"}
                </span>
              </div>
              <ul className="space-y-1.5 text-xs font-geist text-muted-foreground">
                <StatRow label="chunks" value={data?.chroma_chunks} />
                <StatRow label="nodes" value={data?.graph_nodes} />
                <StatRow label="edges" value={data?.graph_edges} />
                <StatRow
                  label="api_keys"
                  value={
                    typeof data?.api_keys_loaded === "boolean"
                      ? data?.api_keys_loaded
                        ? "yes"
                        : "no"
                      : data?.api_keys_loaded
                  }
                />
              </ul>
            </div>

            <div className="p-4 border-b border-border">
              <div className="text-xs font-geist flex items-center gap-2">
                <span>🧠</span>
                <span className="text-muted-foreground">Memory:</span>
                <span className="text-violet">{memoryTurns}/3</span>
                <span className="text-muted-foreground">turns</span>
              </div>
            </div>

            <div className="p-4 border-b border-border">
              <button
                onClick={onClear}
                className="w-full flex items-center justify-center gap-2 text-xs font-geist px-3 py-2 rounded-md border border-border hover:border-violet hover:text-violet transition-colors"
              >
                <Trash2 size={14} /> Clear chat
              </button>
            </div>
          </>
        )}

        <div className="flex-1" />

        {!collapsed && (
          <div className="px-3 pb-2">
            <a
              href="/sample-queries.pdf"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-2 text-xs font-geist px-3 py-2 rounded-md border border-border hover:border-emerald hover:text-emerald transition-colors"
              title="Open sample queries PDF in a new tab"
            >
              <FileQuestion size={14} />
              <span className="truncate">Try some sample queries</span>
            </a>
          </div>
        )}

        <div
          className={`p-3 border-t border-border flex items-center ${collapsed ? "justify-center" : "justify-between"}`}
        >
          {!collapsed && (
            <span
              className="text-[11px] font-geist font-semibold tracking-wider text-emerald"
              style={{ textShadow: "0 0 8px rgba(0,255,204,0.7)" }}
            >
              RAGsystem v1.0.0
            </span>
          )}
          <ThemeToggle />
        </div>

        {/* Desktop resize handle */}
        {!collapsed && !isMobile && (
          <div
            onMouseDown={onResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize sidebar"
            title="Drag to resize"
            className="hidden md:block absolute top-0 right-0 h-full w-1.5 -mr-0.5 cursor-col-resize group z-10"
          >
            <div className="h-full w-px mx-auto bg-transparent group-hover:bg-emerald/60 transition-colors" />
          </div>
        )}
      </aside>
    </>
  );
}

function StatRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <li className="flex justify-between">
      <span>{label}</span>
      <span className="text-foreground">{value ?? "—"}</span>
    </li>
  );
}
