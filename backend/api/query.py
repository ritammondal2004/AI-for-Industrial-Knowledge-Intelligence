
# backend/api/query.py

from fastapi import APIRouter, HTTPException
from backend.models import QueryRequest, QueryResponse, SourceReference
from backend.service.rag_chain import ask, get_context_window_size
from backend.utils.citations import format_sources_block
from backend.storage.s3_operations import get_pdf_url

router = APIRouter(prefix="/query", tags=["Knowledge Assistant"])
    
           
def _extract_sources(docs) -> list[SourceReference]:
    """
    Converts retrieved LangChain Documents into
    structured SourceReference objects for the response. 
    """
    sources: dict[str, dict] = {}

    for doc in docs:
        fname  = doc.metadata.get("source", "unknown")
        page   = str(doc.metadata.get("page", "?"))
        folder = doc.metadata.get("folder", "unknown")

        if fname not in sources:
            sources[fname] = {
                "pages" : set(),
                "folder": folder,
                "pdf_url": get_pdf_url(fname, folder),
            }
        sources[fname]["pages"].add(page)

    return [
        SourceReference(
            filename=fname,
            pages=sorted(
                info["pages"],
                key=lambda x: int(x) if x.isdigit() else 0
            ),
            folder=info["folder"],
            pdf_url=info["pdf_url"],
        )
        for fname, info in sorted(sources.items())
    ]


@router.post("", response_model=QueryResponse)
async def query_knowledge_assistant(request: QueryRequest):
    """
    POST /query
                                
    Main endpoint for the Knowledge Assistant mode.
    Runs the full Hybrid GraphRAG pipeline and returns
    a grounded answer with source citations.
    """
    try:
        full_response, updated_history = ask(
            query=request.question,
            chat_history=request.chat_history,
            verbose=request.verbose,
        )

        context_window = get_context_window_size(updated_history)

        # Re-retrieve docs for structured sources
        from backend.retrieval.mmr_retriever import smart_retrieve
        docs = smart_retrieve(request.question)
        sources = _extract_sources(docs)

        return QueryResponse(
            answer=full_response,
            chat_history=updated_history,
            context_window=context_window,
            sources=sources,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Query failed: {str(e)}"
        )