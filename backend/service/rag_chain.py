# backend/services/rag_chain.py

from langchain_core.documents import Document
from backend.retrieval.mmr_retriever import smart_retrieve
from backend.graph.graph_retriever import graph_context
from backend.memory.conversation import format_history, update_history, get_window_size
from backend.utils.citations import format_docs_for_context, format_sources_block, build_full_response
from backend.prompts.knowledge_assistant import KNOWLEDGE_ASSISTANT_PROMPT
from backend.llm.gemini_client import invoke_with_rotation
from backend.config import MMR_K

    
def ask(query: str, chat_history: list[tuple[str, str]], verbose: bool = False) -> tuple[str, list[tuple[str, str]]]:
    """
    Main Hybrid GraphRAG pipeline.

    Pipeline:
    1. Vector retrieval via smart_retrieve()
       (query expansion + folder routing + MMR + deduplication)
    2. Knowledge graph RAG retrieval via graph_context()
    3. Format vector context for prompt
    4. Format conversation history (sliding window)
    5. Invoke Gemini with rotation on quota errors
    6. Build full response with sources block

    Returns:
        tuple:          
            full_response  : answer + sources block (shown to user)
            updated_history: history updated with this turn
                             (stores raw answer, not full_response) <- not shown to user
    """   

    # Vector retrieval 
    docs: list[Document] = smart_retrieve(
        query=query,
        k_final=MMR_K,
        verbose=verbose,
    )

    #  Knowledge graph retrieval 
    kg_ctx = graph_context(query)

    if verbose:
        if kg_ctx: 
            print(f"  Graph: {len(kg_ctx.splitlines())} lines extracted")
        else:
            print(f"  Graph: no matching entities found")

    # Format vector context 
    vector_ctx    = format_docs_for_context(docs)
    sources_block = format_sources_block(docs)

    #  Conversation history 
    history_text = format_history(chat_history)

    # Gemini generation with key rotation 
    answer = invoke_with_rotation(
        prompt_template=KNOWLEDGE_ASSISTANT_PROMPT,
        chain_input={
            "context"      : vector_ctx,
            "graph_context": kg_ctx or "No relevant graph entities found.",
            "chat_history" : history_text,
            "question"     : query,
        },
    )                                        
         
    #  Build full response + update history
    full_response   = build_full_response(answer, sources_block)
    updated_history = update_history(chat_history, query, answer)

    return full_response, updated_history

                
def get_context_window_size(chat_history: list[tuple[str, str]]) -> int:
    """
    Returns active memory window size.
    Used by API response to inform frontend.
    """
    return get_window_size(chat_history)   