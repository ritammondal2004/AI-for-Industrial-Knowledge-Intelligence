# backend/main.py

# backend/main.py
from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.storage.s3_operations import ensure_data_ready
from backend.retrieval.vector_store import init_vector_store
from backend.graph.graph_loader import init_graph
from backend.llm.key_manager import key_count
from backend.retrieval.vector_store import chunk_count
from backend.graph.graph_loader import graph_stats
from backend.api.query import router as query_router
from backend.api.graph import router as graph_router
from backend.models import HealthResponse


# Startup / shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs once at server startup — in this exact order:
    1. Download ChromaDB + graph from S3 (skip if cached)
    2. Load ChromaDB + BGE embedder into RAM
    3. Load knowledge graph into RAM 
    """
    print("\n=== Industrial Knowledge Copilot — Starting Up ===")

    ensure_data_ready()     
    init_vector_store()     #  (ChromaDB + BGE)
    init_graph()            #  (NetworkX graph)  

    print("=== All systems ready ===\n")
    yield   
    print("=== Server shutting down ===")


# App 
app = FastAPI(
    title="AI Industrial Knowledge Intelligence Copilot",
    description="Hybrid GraphRAG system for industrial knowledge retrieval",
    version="1.0.0",
    lifespan=lifespan,
)
               
# CORS — allows frontend to call this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_methods=["*"],
    allow_headers=["*"],
)  

# Routers 
app.include_router(query_router)
app.include_router(graph_router)


# Health check 
@app.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check():
    """
    Quick check that all systems loaded correctly.
    Call this first after startup to verify everything is ready.
    """
    stats = graph_stats()
    return HealthResponse(
        status="ok",
        chroma_chunks=chunk_count(),
        graph_nodes=stats["nodes"],
        graph_edges=stats["edges"],
        api_keys_loaded=key_count(),
    )