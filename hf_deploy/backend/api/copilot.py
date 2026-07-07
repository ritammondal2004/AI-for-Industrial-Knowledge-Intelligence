
# backend/api/copilot.py  

from fastapi import APIRouter, HTTPException
from backend.models import CopilotRequest, CopilotResponse, SourceReference
from backend.retrieval.mmr_retriever import smart_retrieve
from backend.graph.graph_retriever import graph_context
from backend.memory.conversation import format_history, update_history, get_window_size
from backend.utils.citations import format_docs_for_context, format_sources_block, build_full_response   

from backend.prompts.industrial_copilot import INDUSTRIAL_COPILOT_PROMPT
from backend.llm.gemini_client import invoke_with_rotation
from backend.storage.s3_operations import get_pdf_url
from backend.config import MMR_K

router = APIRouter(prefix="/copilot", tags=["Industrial Copilot"])


def _extract_sources(docs) -> list[SourceReference]:
    sources: dict[str, dict] = {}
    for doc in docs:
        fname  = doc.metadata.get("source", "unknown")
        page   = str(doc.metadata.get("page", "?"))
        folder = doc.metadata.get("folder", "unknown")
        if fname not in sources:
            sources[fname] = {
                "pages"  : set(),
                "folder" : folder,
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


@router.post("", response_model=CopilotResponse)
async def industrial_copilot(request: CopilotRequest):
    """                              
    Industrial Operations Copilot mode.
    response is structured as:        
    - Answer
    - Recommended Actions             
    - Safety Considerations       
    - Related SOPs / Regulations
    - Maintenance Guidance         
    """
    try:
        # Retrieval (identical to Knowledge Assistant) 
        docs   = smart_retrieve(
            query=request.question,
            k_final=MMR_K,
            verbose=request.verbose,
        )
        kg_ctx = graph_context(request.question)

        #  Format context 
        vector_ctx    = format_docs_for_context(docs)
        sources_block = format_sources_block(docs)
        history_text  = format_history(request.chat_history)

        # ── Generate with Copilot prompt 
        answer = invoke_with_rotation(
            prompt_template=INDUSTRIAL_COPILOT_PROMPT,
            chain_input={
                "context"      : vector_ctx,
                "graph_context": kg_ctx or "No relevant graph entities found.",
                "chat_history" : history_text,
                "question"     : request.question,
            },
        )

        # Build response 
        full_response = build_full_response(answer, sources_block)
        updated_history = update_history(
            request.chat_history,
            request.question,
            answer,
        )
        sources = _extract_sources(docs)

        return CopilotResponse(
            answer=full_response,
            chat_history=updated_history,
            context_window=get_window_size(updated_history),
            sources=sources,
        )

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Copilot request failed: {str(e)}"
        )