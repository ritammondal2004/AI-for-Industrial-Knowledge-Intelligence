
# backend/api/graph.py

from fastapi import APIRouter, HTTPException, Query
from backend.models import GraphStatsResponse, GraphSubgraphResponse
from backend.graph.graph_loader import get_graph, graph_stats
        
router = APIRouter(prefix="/graph", tags=["Knowledge Graph"])
              
             
@router.get("/stats", response_model=GraphStatsResponse)
async def get_graph_stats():
    """
    Returns basic knowledge graph statistics.
    Used by frontend to display graph summary.
    """
    try:
        stats = graph_stats()
        return GraphStatsResponse(**stats)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subgraph", response_model=GraphSubgraphResponse)
async def get_subgraph(
    center_node: str = Query(
        default=None,
        description="Entity name to center the subgraph on. "
                    "Defaults to most connected node."
    ),
    max_nodes: int = Query(
        default=30,  
        ge=5,
        le=100,  
        description="Maximum nodes to include in subgraph"
    ),
):
    """        
    Returns a small subgraph for frontend visualization.
    Nodes and edges are returned as plain dicts —
    frontend renders them using its own viz library (PyVis/D3).
    """
    try:
        G = get_graph()

        # Default center — most connected node
        if not center_node:
            center_node = max(G.degree, key=lambda x: x[1])[0]

        if center_node not in G:
            raise HTTPException(
                status_code=404,
                detail=f"Node '{center_node}' not found in knowledge graph."
            )

        # Build subgraph
        nodes_to_include = {center_node}
        frontier = {center_node}

        for _ in range(2):  # 2-hop expansion
            next_frontier = set()
            for node in frontier:
                next_frontier.update(G.predecessors(node))
                next_frontier.update(G.successors(node))
            nodes_to_include.update(next_frontier)
            frontier = next_frontier
            if len(nodes_to_include) >= max_nodes:
                break

        nodes_to_include = list(nodes_to_include)[:max_nodes]
        subG = G.subgraph(nodes_to_include)

        # Serialize nodes 
        nodes = [
            {
                "id"   : node,
                "label"  : node,
                "type" : subG.nodes[node].get("type", "Unknown"),
                "description": subG.nodes[node].get("description", "")[:100],
            }
            for node in subG.nodes()
        ]

        # Serialize edges 
        edges = [
            {                
                "source" : src,
                "target" : tgt,
                "relation": data.get("relations", ["related_to"])[0],
            }
            for src, tgt, data in subG.edges(data=True)
        ]

        return GraphSubgraphResponse(nodes=nodes, edges=edges)
                     
    except HTTPException:  
        raise   
    except Exception as e:   
        raise HTTPException(status_code=500, detail=str(e))