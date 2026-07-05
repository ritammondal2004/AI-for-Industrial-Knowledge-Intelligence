# backend/retrieval/vector_store.py

from langchain_chroma import Chroma
from langchain_huggingface import HuggingFaceEmbeddings 
from langchain_core.documents import Document 
from backend.config import *


# Loaded once at startup via init_vector_store()        
# Reused for every query — never reloaded per request       
_embedder:   HuggingFaceEmbeddings | None = None
_chroma_db:  Chroma | None = None


def init_vector_store() -> None:
    """
    Loads BGE-large embedder and ChromaDB collection. 
    Downloads model from HuggingFace Hub on first run,
    then uses local cache.
    """
    global _embedder, _chroma_db

    print("Loading BGE-large embedder...")
    _embedder = HuggingFaceEmbeddings(
        model_name=EMBEDDING_MODEL, 
        cache_folder=HF_CACHE_DIR,
    )
    print("✓ Embedder ready")

    print("Loading ChromaDB...")
    _chroma_db = Chroma(
        collection_name=CHROMA_COLLECTION_NAME,
        embedding_function=_embedder,
        persist_directory=CHROMA_DB_PATH,
    )
    count = _chroma_db._collection.count()
    print(f"✓ ChromaDB ready — {count} chunks indexed")


def get_chroma_db() -> Chroma:
    # Returns the loaded ChromaDB instance.
    if _chroma_db is None:
        raise RuntimeError(
            "ChromaDB not initialised. "
            "Call init_vector_store() during app startup."
        )
    return _chroma_db

# max marginal Relevance search
def mmr_search(query: str, k: int = MMR_K,
                fetch_k: int = MMR_FETCH_K,
                filter_dict: dict | None = None,
            ) -> list[Document]:
    """
    Args:
        query       : embedded query string
        k           : number of final chunks to return
        fetch_k     : candidate pool size before MMR diversification
        filter_dict : ChromaDB metadata filter (folder routing)
                      None means search all folders

    Returns:               
        list[Document] : top-k diverse relevant chunks
    """
    db = get_chroma_db()

    kwargs = dict(query=query, k=k, fetch_k=fetch_k)
    if filter_dict:
        kwargs["filter"] = filter_dict

    return db.max_marginal_relevance_search(**kwargs) 


def chunk_count() -> int:
    """Returns total chunks currently indexed in ChromaDB."""
    return get_chroma_db()._collection.count()