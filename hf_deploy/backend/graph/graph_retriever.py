
# backend/graph/graph_retriever.py
# Graoh RAG
import networkx as nx
from backend.graph.graph_loader import get_graph
from backend.config import GRAPH_TOP_K, GRAPH_MAX_NEIGHBORS

# Stopwords 
_STOPWORDS = {
    "what", "how", "why", "when", "where", "which", "who",
    "is", "are", "was", "were", "the", "a", "an", "in",
    "of", "to", "for", "on", "and", "or", "tell", "me",
    "about", "explain", "describe", "does", "do", "can",
    "should", "would", "give", "list", "show", "some",
}
          

def graph_context(query: str, top_k: int = GRAPH_TOP_K, max_neighbors: int = GRAPH_MAX_NEIGHBORS) -> str:
    """
    Retrieves supporting context from the knowledge graph.

    Pipeline:
    1. Extract meaningful keywords from query
    2. Find matching nodes (case-insensitive partial match)
    3. Expand to immediate neighbors
    4. Return concise textual summary as graph context
    """
    G = get_graph()

    if G.number_of_nodes() == 0:
        return ""

    #  keyword extraction 
    keywords = [
        w.strip("?.,:;")
        for w in query.lower().split()  
        if len(w) > 3 and w.lower() not in _STOPWORDS
    ] 

    if not keywords:
        return ""

    # find matching seed nodes
    matched_nodes = [
        node for node in G.nodes()
        if any(kw in node.lower() for kw in keywords)
    ][:top_k]

    if not matched_nodes:
        return ""

    # build summary              
    context_lines = []

    for node in matched_nodes:
        attrs   = G.nodes[node]
        node_type  = attrs.get("type", "Unknown")
        description = attrs.get("description", "")
        sources     = attrs.get("sources", [])
        source_str  = (
            sources[0].get("source_pdf", "?")
            if sources else "?"
        )

        context_lines.append(
            f"Entity: {node} | Type: {node_type} | Source: {source_str}"
        )
        if description:
            context_lines.append(f"  Description: {description[:120]}")

        # Outgoing relationships  
        for tgt in list(G.successors(node))[:max_neighbors]:
            rels = G[node][tgt].get("relations", ["related_to"])
            context_lines.append(f"  → [{rels[0]}] → {tgt}")

        # Incoming relationships         
        for src in list(G.predecessors(node))[:max_neighbors]:
            rels = G[src][node].get("relations", ["related_to"])
            context_lines.append(f"  ← {src} [{rels[0]}]")

        context_lines.append("")  # blank line between nodes
                               
    return "\n".join(context_lines).strip()