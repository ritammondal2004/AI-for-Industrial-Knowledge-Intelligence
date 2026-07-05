# backend/config.py  

import os
from pathlib import Path

# Base paths 
BASE_DIR = Path(__file__).resolve().parent.parent  # project root
CACHE_DIR  = BASE_DIR / "data" / "cache"
               
S3_CACHE_DIR = "data/cache/"

#  Local cache paths (S3 downloads land here at startup)
CHROMA_DB_PATH  = str(CACHE_DIR / "chroma_db")
GRAPH_PATH      = str(CACHE_DIR / "knowledge_graph.gpickle")

# AWS S3                             
S3_BUCKET        = os.environ.get("S3_BUCKET", "industrial-ai-knowledge-base")
S3_CHROMA_PREFIX = "data/chroma_db/"
S3_GRAPH_KEY     = "data/knowledge_graph.gpickle"
S3_PDF_PREFIX = "data/raw/"
             
AWS_REGION       = os.environ.get("AWS_REGION", "eu-north-1") 

# Embeddings 
EMBEDDING_MODEL  = "BAAI/bge-large-en-v1.5"
HF_CACHE_DIR     = str(CACHE_DIR / "hf_cache")

CHROMA_COLLECTION_NAME = "industrial_kb"
      
#  Retrieval 
MMR_K           = 5      
MMR_FETCH_K     = 15     
GRAPH_TOP_K     = 5      
GRAPH_MAX_NEIGHBORS = 4  

# Conversation memory 
MEMORY_WINDOW   = 3      # last N turns kept in context

# LLM
GEMINI_MODEL         = "gemini-2.5-flash"
GEMINI_TEMPERATURE   = 0.6
EXPANSION_MODEL      = "gemini-2.5-flash-lite"
EXPANSION_TEMPERATURE = 0.2     


KEY_ROTATION_WAIT_SECONDS = 30   # wait time when all keys exhausted

# Folder categories 
FOLDER_CATEGORIES = [
    "Manuals",
    "Procedures",
    "Regulations",
    "Incident_Reports",
]

# Folder keyword routing ─
FOLDER_KEYWORDS = {
    "Regulations": [
        "osha", "regulation", "standard", "compliance", "legal",
        "oisd", "factory act", "peso", "statutory", "dgms", "mandatory"
    ],
    "Incident_Reports": [
        "incident", "accident", "failure", "fire", "explosion",
        "injury", "fatality", "near miss", "root cause", "investigation"
    ],
    "Manuals": [
        "install", "operation", "specification", "dimension", "part number",
        "assembly", "disassembly", "torque", "oem", "technical data"
    ],
    "Procedures": [
        "procedure", "sop", "step", "permit", "lockout", "tagout",
        "startup", "shutdown", "checklist", "how to"
    ],
}