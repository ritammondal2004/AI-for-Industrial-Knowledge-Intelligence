
# backend/models.py

from pydantic import BaseModel, Field
from typing import Optional


# Request schemas 

class QueryRequest(BaseModel):
    """Request body for POST /query"""
    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="User's question to the knowledge assistant"
    )
    chat_history: list[tuple[str, str]] = Field(
        default=[],
        description="Conversation history as list of (question, answer) tuples"
    )           
    verbose: bool = Field(
        default=False,
        description="If True returns debug info — never True in production"
    )


# Response schemas 
         
class SourceReference(BaseModel):
   # Single source document reference."""
    filename: str
    pages: list[str]
    folder: str
    pdf_url: str


class QueryResponse(BaseModel):
    """Response body for POST /query"""  
    answer: str = Field(
        description="Full response including answer + sources block"
    )
    chat_history: list[tuple[str, str]] = Field(
        description="Updated conversation history after this turn"
    ) 
              
    context_window: int = Field(
        description="Number of turns currently in memory window"
    )
    sources: list[SourceReference] = Field(
        default=[],
        description="Structured source references for frontend use"
    )


class GraphStatsResponse(BaseModel):
    """Response body for GET /graph/stats"""
    nodes: int
    edges: int
    top_entities: list[dict]


class GraphSubgraphResponse(BaseModel):
    """Response body for GET /graph/subgraph"""
    nodes: list[dict]
    edges: list[dict]


class HealthResponse(BaseModel):
    """Response body for GET /health"""
    status: str
    chroma_chunks: int
    graph_nodes: int
    graph_edges: int
    api_keys_loaded: int