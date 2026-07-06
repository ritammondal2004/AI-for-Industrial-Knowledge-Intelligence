# backend/graph/graph_loader.py

import pickle
import networkx as nx
from backend.config import GRAPH_PATH
         

# Loaded once at startup via init_graph()
# Reused for every query — never reloaded per request
_graph: nx.DiGraph | None = None

                        
def init_graph() -> None:
    """
    Loads the NetworkX knowledge graph from local cache.
    Called once during FastAPI lifespan startup —
    """
    global _graph

    print("Loading knowledge graph...")
    try:          
        with open(GRAPH_PATH, "rb") as f:
            _graph = pickle.load(f)
        print(           
            f"✓ Knowledge graph ready — "
            f"{_graph.number_of_nodes()} nodes, "
            f"{_graph.number_of_edges()} edges"
        )                   
    except FileNotFoundError:
        raise RuntimeError(
            f"Knowledge graph not found at {GRAPH_PATH}. "
            "Ensure ensure_data_ready() ran successfully at startup."
        )   
    except Exception as e:
        raise RuntimeError(f"Failed to load knowledge graph: {e}")


def get_graph() -> nx.DiGraph:
    """
    Returns the loaded NetworkX graph instance.
    Raises if called before init_graph(). 
    """
    if _graph is None:
        raise RuntimeError(
            "Knowledge graph not initialised. "
            "Call init_graph() during app startup."
        )
    return _graph     
                      
                                             
def graph_stats() -> dict:               
    """
    Returns basic graph statistics.
    Used by GET /graph endpoint for frontend viz info.
    """   
    G = get_graph()                   
    return {                        
        "nodes": G.number_of_nodes(),
        "edges": G.number_of_edges(),
        "top_entities": [ # top 10 entities
            {"name": node, "connections": deg}
            for node, deg in sorted(G.degree, key=lambda x: x[1], reverse=True)[:10]
        ],
    }