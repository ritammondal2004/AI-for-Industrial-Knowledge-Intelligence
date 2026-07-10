export const BACKEND_URL =
  (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://ritammondal2004-et-hackathon-backend.hf.space";

export interface HealthResponse {
  status: string;
  chroma_chunks: number;
  graph_nodes: number;
  graph_edges: number;
  api_keys_loaded: number | boolean;
}

export interface Source {
  filename: string;
  pages: number[] | string;
  folder: string;
  pdf_url: string;
}

export interface QueryResponse {
  answer: string;
  chat_history: [string, string][];
  context_window: number;
  sources: Source[];
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${BACKEND_URL}/health`);
  if (!res.ok) throw new Error("Health check failed");
  return res.json();
}

export async function sendQuery(
  question: string,
  chatHistory: [string, string][],
): Promise<QueryResponse> {
  const res = await fetch(`${BACKEND_URL}/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, chat_history: chatHistory }),
  });
  if (!res.ok) throw new Error(`Query failed: ${res.status}`);
  return res.json();
}

export interface CopilotResponse {
  answer: string;
  chat_history: [string, string][];
  context_window: number;
  sources: Source[];
}

export async function sendCopilot(
  question: string,
  chatHistory: [string, string][],
): Promise<CopilotResponse> {
  const res = await fetch(`${BACKEND_URL}/copilot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, chat_history: chatHistory, verbose: false }),
  });
  if (!res.ok) throw new Error(`Copilot failed: ${res.status}`);
  return res.json();
}

export interface RcaResponse {
  analysis: string;
  chat_history: [string, string][];
  context_window: number;
  sources: Source[];
}

export async function sendRca(
  symptom: string,
  chatHistory: [string, string][],
): Promise<RcaResponse> {
  const res = await fetch(`${BACKEND_URL}/rca`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ symptom, chat_history: chatHistory, verbose: false }),
  });
  if (!res.ok) throw new Error(`RCA failed: ${res.status}`);
  return res.json();
}

export interface GraphStats {
  nodes: number;
  edges: number;
  top_entities: { name: string; connections: number }[];
  sources?: number;
}

export interface SubgraphNode {
  id: string;
  label: string;
  type: string;
  description?: string;
  source?: string;
  pdf_url?: string;
}

export interface SubgraphEdge {
  source: string;
  target: string;
  relation: string;
}

export interface SubgraphResponse {
  nodes: SubgraphNode[];
  edges: SubgraphEdge[];
}

export async function fetchGraphStats(): Promise<GraphStats> {
  const res = await fetch(`${BACKEND_URL}/graph/stats`);
  if (!res.ok) throw new Error(`Graph stats failed: ${res.status}`);
  return res.json();
}

export async function fetchSubgraph(
  centerNode: string,
  maxNodes = 30,
): Promise<SubgraphResponse> {
  const url = `${BACKEND_URL}/graph/subgraph?center_node=${encodeURIComponent(centerNode)}&max_nodes=${maxNodes}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Subgraph failed: ${res.status}`);
  return res.json();
}

