# backend/api/rca.py
                                   
from fastapi import APIRouter, HTTPException
from backend.models import RCARequest, RCAResponse, SourceReference
from backend.retrieval.mmr_retriever import smart_retrieve
from backend.graph.graph_retriever import graph_context
from backend.memory.conversation import format_history, update_history, get_window_size
from backend.utils.citations import format_docs_for_context, format_sources_block, build_full_response
from backend.prompts.rca_assistant import RCA_ASSISTANT_PROMPT        
from backend.llm.gemini_client import invoke_with_rotation
from backend.storage.s3_operations import get_pdf_url
from backend.config import MMR_K            
                
router = APIRouter(prefix="/rca", tags=["Root Cause Analysis"])


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

                     
@router.post("", response_model=RCAResponse)
async def root_cause_analysis(request: RCARequest):
    """          
    Root Cause Analysis mode.
    Given a symptom or incident description, returns:
    - Failure Summary
    - Possible Root Causes (ranked by likelihood)
    - Supporting Evidence
    - Suggested Inspections
    - Corrective Actions
    - Regulatory / Compliance Notes     
    it uses the RCA specific prompts with same pipeline
    """
    try:
        # ── Retrieval
        docs = smart_retrieve(
            query=request.symptom,
            k_final=MMR_K,
            verbose=request.verbose,
        )
        # Graph context is valuable for RCA —
        # traces relationships between components and failure modes
        kg_ctx = graph_context(request.symptom)

      
        vector_ctx    = format_docs_for_context(docs)
        sources_block = format_sources_block(docs)
        history_text  = format_history(request.chat_history)

        #  Generate 
        analysis = invoke_with_rotation(
            prompt_template=RCA_ASSISTANT_PROMPT,
            chain_input={        
                "context"  : vector_ctx,
                "graph_context": kg_ctx or "No relevant graph relationships found.",
                "chat_history" : history_text,
                "question"     : request.symptom,
            },
        )
                     
        # ── Build response ─
        full_analysis   = build_full_response(analysis, sources_block)
        updated_history = update_history(
            request.chat_history,
            request.symptom,
            analysis,
        )
        sources = _extract_sources(docs)
               
        return RCAResponse(
            analysis=full_analysis,
            chat_history=updated_history,
            context_window=get_window_size(updated_history),
            sources=sources,
        )
                  
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"RCA request failed: {str(e)}"
        )   