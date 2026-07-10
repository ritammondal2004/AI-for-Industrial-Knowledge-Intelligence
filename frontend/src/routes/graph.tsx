import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Cog, Search, ZoomIn, ZoomOut, RotateCcw, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Network } from "vis-network/standalone";
import { DataSet } from "vis-data/standalone";
import {
  fetchGraphStats,
  fetchSubgraph,
  type SubgraphNode,
  type SubgraphEdge,
} from "@/lib/api";

export const Route = createFileRoute("/graph")({
  head: () => ({
    meta: [
      { title: "Knowledge Graph — Industrial Copilot" },
      {
        name: "description",
        content: "Explore the industrial knowledge graph: entities, relations, and sources.",
      },
    ],
  }),
  component: GraphPage,
});

const TYPE_COLORS: Record<string, string> = {
  Equipment: "#e74c3c",
  Component: "#3498db",
  Hazard: "#e67e22",
  Regulation: "#2ecc71",
  Procedure: "#9b59b6",
  Parameter: "#1abc9c",
  Incident: "#f39c12",
  Unknown: "#95a5a6",
};

function colorFor(type?: string): string {
  if (!type) return TYPE_COLORS.Unknown;
  const key = Object.keys(TYPE_COLORS).find(
    (k) => k.toLowerCase() === type.toLowerCase(),
  );
  return key ? TYPE_COLORS[key] : TYPE_COLORS.Unknown;
}

function GraphPage() {
  const statsQuery = useQuery({
    queryKey: ["graph-stats"],
    queryFn: fetchGraphStats,
    staleTime: 60_000,
    retry: 1,
  });

  const [center, setCenter] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SubgraphNode | null>(null);
  const [explorerCollapsed, setExplorerCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try { return localStorage.getItem("graph-explorer-collapsed") === "1"; } catch { return false; }
  });
  const [explorerWidth, setExplorerWidth] = useState<number>(() => {
    if (typeof window === "undefined") return 320;
    try {
      const raw = localStorage.getItem("graph-explorer-width");
      const n = raw ? parseInt(raw, 10) : 320;
      return Number.isFinite(n) ? Math.min(560, Math.max(220, n)) : 320;
    } catch { return 320; }
  });
  useEffect(() => { try { localStorage.setItem("graph-explorer-collapsed", explorerCollapsed ? "1" : "0"); } catch { /* ignore */ } }, [explorerCollapsed]);
  useEffect(() => { try { localStorage.setItem("graph-explorer-width", String(explorerWidth)); } catch { /* ignore */ } }, [explorerWidth]);

  function onExplorerResize(e: React.MouseEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = explorerWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMove = (ev: MouseEvent) => {
      const next = Math.min(560, Math.max(220, startW + (ev.clientX - startX)));
      setExplorerWidth(next);
    };
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  useEffect(() => {
    if (!center && statsQuery.data?.top_entities?.length) {
      setCenter(statsQuery.data.top_entities[0].name);
    }
  }, [statsQuery.data, center]);

  const subgraphQuery = useQuery({
    queryKey: ["subgraph", center],
    queryFn: () => fetchSubgraph(center!, 30),
    enabled: !!center,
    retry: 1,
  });

  const topEntities = statsQuery.data?.top_entities ?? [];
  const filteredTop = useMemo(
    () =>
      topEntities
        .filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))
        .slice(0, 10),
    [topEntities, search],
  );

  const nodes = subgraphQuery.data?.nodes ?? [];
  const edges = subgraphQuery.data?.edges ?? [];

  const relations = useMemo(() => {
    if (!selected) return { out: [], inc: [] as SubgraphEdge[] };
    return {
      out: edges.filter((e) => e.source === selected.id || e.source === selected.label),
      inc: edges.filter((e) => e.target === selected.id || e.target === selected.label),
    };
  }, [selected, edges]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top nav */}
      <div className="border-b border-border bg-panel px-6 py-3 flex items-center gap-4">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-muted-foreground hover:text-amber transition-colors"
        >
          <ArrowLeft size={14} /> Back to Chat
        </Link>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Cog className="animate-spin-slow text-amber" size={18} />
          <span className="font-mono text-sm font-semibold">Knowledge Graph</span>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-6 border-b border-border">
        <StatCard
          label="Total Entities"
          value={statsQuery.data?.nodes ?? "—"}
          accent="text-amber"
          delay={0}
        />
        <StatCard
          label="Total Relations"
          value={statsQuery.data?.edges ?? "—"}
          accent="text-teal"
          delay={100}
        />
        <StatCard
          label="Most Connected"
          value={
            topEntities[0]
              ? `${topEntities[0].name}`
              : "—"
          }
          sub={topEntities[0] ? `${topEntities[0].connections} connections` : undefined}
          delay={200}
        />
        <StatCard
          label="Knowledge Sources"
          value={statsQuery.data?.sources ?? "—"}
          delay={300}
        />
      </div>

      {statsQuery.isError && (
        <div className="mx-6 mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm font-mono">
          Could not load graph stats.{" "}
          <button
            onClick={() => statsQuery.refetch()}
            className="underline text-amber ml-2"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex min-h-[600px]">
        {/* Left panel */}
        <aside
          style={{ width: explorerCollapsed ? 44 : explorerWidth }}
          className="shrink-0 border-r border-border bg-panel flex flex-col relative transition-[width] duration-150"
        >
          {explorerCollapsed ? (
            <button
              onClick={() => setExplorerCollapsed(false)}
              aria-label="Expand explorer"
              title="Expand explorer"
              className="flex items-center justify-center h-12 border-b border-border text-muted-foreground hover:text-amber transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          ) : (
            <>
              <div className="p-5 border-b border-border flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <h2 className="font-mono text-sm font-semibold truncate">
                    Knowledge Graph Explorer
                  </h2>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click any entity to explore its connections
                  </p>
                </div>
                <button
                  onClick={() => setExplorerCollapsed(true)}
                  aria-label="Collapse explorer"
                  title="Collapse explorer"
                  className="p-1 rounded-md border border-border hover:border-amber hover:text-amber transition-colors shrink-0"
                >
                  <ChevronLeft size={14} />
                </button>
              </div>

              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search entities..."
                    className="w-full bg-background border border-border rounded-md pl-9 pr-3 py-2 text-xs font-mono focus:outline-none focus:border-amber"
                  />
                </div>
              </div>

              <div className="p-4 border-b border-border overflow-y-auto max-h-[320px]">
                <h3 className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-2">
                  Top Connected Entities
                </h3>
                <ul className="space-y-1">
                  {filteredTop.map((e) => {
                    const isSel = center === e.name;
                    return (
                      <li key={e.name}>
                        <button
                          onClick={() => {
                            setCenter(e.name);
                            setSelected(null);
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-xs font-mono hover:bg-background transition-colors border ${
                            isSel ? "border-amber" : "border-transparent"
                          }`}
                        >
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ background: TYPE_COLORS.Unknown }}
                          />
                          <span className="truncate flex-1">{e.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-background border border-border text-muted-foreground">
                            {e.connections}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                  {filteredTop.length === 0 && (
                    <li className="text-xs text-muted-foreground font-mono py-4 text-center">
                      No entities.
                    </li>
                  )}
                </ul>
              </div>

              {selected && (
                <div className="p-4 overflow-y-auto animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h3 className="font-mono text-base text-amber font-semibold break-words">
                    {selected.label}
                  </h3>
                  <span
                    className="inline-block mt-2 text-[10px] font-mono px-2 py-0.5 rounded"
                    style={{
                      background: `${colorFor(selected.type)}20`,
                      color: colorFor(selected.type),
                      border: `1px solid ${colorFor(selected.type)}55`,
                    }}
                  >
                    {selected.type || "Unknown"}
                  </span>
                  {selected.description && (
                    <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
                      {selected.description}
                    </p>
                  )}

                  {relations.out.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-2">
                        Outgoing
                      </h4>
                      <ul className="space-y-1 text-xs font-mono">
                        {relations.out.slice(0, 20).map((e, i) => (
                          <li key={i} className="text-muted-foreground">
                            <span className="text-teal">→</span> {e.relation}{" "}
                            <span className="text-teal">→</span>{" "}
                            <span className="text-foreground">{e.target}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {relations.inc.length > 0 && (
                    <div className="mt-4">
                      <h4 className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono mb-2">
                        Incoming
                      </h4>
                      <ul className="space-y-1 text-xs font-mono">
                        {relations.inc.slice(0, 20).map((e, i) => (
                          <li key={i} className="text-muted-foreground">
                            <span className="text-amber">←</span>{" "}
                            <span className="text-foreground">{e.source}</span>{" "}
                            <span className="text-amber">←</span> {e.relation}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selected.pdf_url && (
                    <a
                      href={selected.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-flex items-center gap-2 text-xs font-mono px-2 py-1.5 rounded border border-teal/40 text-teal hover:bg-teal/10 transition-colors"
                    >
                      <FileText size={12} />
                      {selected.source || "Source PDF"}
                    </a>
                  )}
                </div>
              )}

              {/* Resize handle */}
              <div
                onMouseDown={onExplorerResize}
                role="separator"
                aria-orientation="vertical"
                aria-label="Resize explorer"
                title="Drag to resize"
                className="absolute top-0 right-0 h-full w-1.5 -mr-0.5 cursor-col-resize group z-10"
              >
                <div className="h-full w-px mx-auto bg-transparent group-hover:bg-amber/60 transition-colors" />
              </div>
            </>
          )}
        </aside>

        {/* Graph canvas */}
        <div className="flex-1 relative bg-background">
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            center={center}
            loading={subgraphQuery.isLoading || subgraphQuery.isFetching}
            error={subgraphQuery.isError}
            onSelect={(n) => setSelected(n)}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  delay = 0,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  accent?: string;
  delay?: number;
}) {
  return (
    <div
      className="rounded-lg border border-border bg-[#1c2128] p-4 animate-in fade-in slide-in-from-bottom-2 fill-mode-both"
      style={{ animationDelay: `${delay}ms`, animationDuration: "400ms" }}
    >
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
        {label}
      </div>
      <div
        className={`mt-2 text-2xl font-mono font-semibold truncate ${accent ?? "text-foreground"}`}
        title={typeof value === "string" ? value : undefined}
      >
        {value}
      </div>
      {sub && (
        <div className="text-xs text-muted-foreground font-mono mt-1">{sub}</div>
      )}
    </div>
  );
}

function GraphCanvas({
  nodes,
  edges,
  center,
  loading,
  error,
  onSelect,
}: {
  nodes: SubgraphNode[];
  edges: SubgraphEdge[];
  center: string | null;
  loading: boolean;
  error: boolean;
  onSelect: (n: SubgraphNode) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const networkRef = useRef<Network | null>(null);
  const nodesDsRef = useRef<DataSet<any> | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const visNodes = nodes.map((n) => {
      const isCenter =
        n.id === center || n.label === center;
      const conns = edges.filter(
        (e) => e.source === n.id || e.target === n.id || e.source === n.label || e.target === n.label,
      ).length;
      const size = 12 + Math.min(30, conns * 2);
      const c = colorFor(n.type);
      return {
        id: n.id,
        label: n.label,
        title: `${n.label}\nType: ${n.type || "Unknown"}\nConnections: ${conns}`,
        value: size,
        color: {
          background: c,
          border: isCenter ? "#e6a817" : "#30363d",
          highlight: { background: c, border: "#e6a817" },
        },
        borderWidth: isCenter ? 3 : 1,
        shadow: isCenter
          ? { enabled: true, color: "#e6a817", size: 20, x: 0, y: 0 }
          : false,
        font: { color: "#e6edf3", face: "Inter", size: 13 },
        _raw: n,
      };
    });

    const visEdges = edges.map((e, i) => ({
      id: `e${i}`,
      from: e.source,
      to: e.target,
      label: e.relation,
      arrows: "to",
      color: { color: "#7f8c8d", highlight: "#e6a817" },
      font: {
        color: "#8b949e",
        size: 10,
        face: "JetBrains Mono",
        strokeWidth: 0,
        background: "#0d1117",
      },
      smooth: { enabled: true, type: "dynamic", roundness: 0.5 },
    }));

    const nodesDs = new DataSet(visNodes);
    const edgesDs = new DataSet(visEdges);
    nodesDsRef.current = nodesDs;

    const network = new Network(
      containerRef.current,
      { nodes: nodesDs, edges: edgesDs },
      {
        nodes: { shape: "dot", scaling: { min: 12, max: 42 } },
        edges: { font: { align: "middle" } },
        physics: {
          enabled: true,
          barnesHut: { gravitationalConstant: -8000, springLength: 150 },
          stabilization: { iterations: 200 },
        },
        interaction: { hover: true, tooltipDelay: 120, zoomView: true, dragView: true },
      },
    );
    networkRef.current = network;

    network.on("click", (params) => {
      if (params.nodes.length > 0) {
        const id = params.nodes[0];
        const raw = visNodes.find((n) => n.id === id);
        if (raw?._raw) {
          onSelect(raw._raw as SubgraphNode);
          network.focus(id, { scale: 1.2, animation: { duration: 500, easingFunction: "easeInOutQuad" } });
        }
      }
    });

    return () => {
      network.destroy();
      networkRef.current = null;
    };
  }, [nodes, edges, center, onSelect]);

  const zoomIn = () => {
    const n = networkRef.current;
    if (n) n.moveTo({ scale: n.getScale() * 1.25 });
  };
  const zoomOut = () => {
    const n = networkRef.current;
    if (n) n.moveTo({ scale: n.getScale() / 1.25 });
  };
  const reset = () => networkRef.current?.fit({ animation: true });

  return (
    <>
      <div ref={containerRef} className="absolute inset-0" />

      {/* Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <div className="flex gap-1 bg-panel border border-border rounded-md p-1">
          <IconBtn onClick={zoomIn} title="Zoom in"><ZoomIn size={14} /></IconBtn>
          <IconBtn onClick={zoomOut} title="Zoom out"><ZoomOut size={14} /></IconBtn>
          <IconBtn onClick={reset} title="Reset view"><RotateCcw size={14} /></IconBtn>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground bg-panel border border-border rounded px-2 py-1 text-center">
          {nodes.length} entities
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-3">
            <Cog className="animate-spin-slow text-amber" size={40} />
            <span className="text-xs font-mono text-muted-foreground">
              Loading graph...
            </span>
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm font-mono">
            Could not load graph for this entity.
          </div>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-sm font-mono text-foreground">
              No graph data available
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-1">
              Pick an entity from the left panel to visualize its subgraph.
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap gap-3 bg-panel/90 border border-border rounded-md px-4 py-2 backdrop-blur-sm z-10 max-w-[90%]">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-[10px] font-mono">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ background: color }}
            />
            <span className="text-muted-foreground">{type}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function IconBtn({
  children,
  onClick,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="p-1.5 rounded hover:bg-background text-muted-foreground hover:text-amber transition-colors"
    >
      {children}
    </button>
  );
}
