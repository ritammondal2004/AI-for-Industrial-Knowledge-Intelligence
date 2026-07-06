# backend/retrieval/mmr_retriever.py

from langchain_core.documents import Document
from backend.retrieval.vector_store import mmr_search
from backend.retrieval.query_expander import expand_query
from backend.utils.folder_detector import detect_relevant_folders, build_chroma_filter
from backend.config import MMR_K

                                
def smart_retrieve(query: str, k_final: int = MMR_K,verbose: bool = False) -> list[Document]:
    """
    Full retrieval pipeline:
    1. Expand query into multiple phrasings
    2. Detect relevant folders from query keywords
    3. MMR search per query variant with folder filter
    4. Deduplicate chunks across all variants
    5. Return top k_final unique chunks
    """   

    #  query expansion 
    expanded_queries = expand_query(query)

    if verbose:
        print(f"  Expanded to {len(expanded_queries)} query variants")

    # folder detection
    relevant_folders = detect_relevant_folders(query)
    filter_dict  = build_chroma_filter(relevant_folders)
                        
    if verbose:
        if relevant_folders: 
            print(f"  Folder routing → {relevant_folders}")
        else:
            print(f"  No folder signal — searching all folders") 

    #  MMR search + deduplication 
    seen_ids: set[int] = set()
    all_docs: list[Document] = []

    for q in expanded_queries:
        try:
            docs = mmr_search(query=q, k=k_final, filter_dict=filter_dict)
                                 
            for doc in docs:  
                # Deduplicate by first 100 chars of content
                doc_id = hash(doc.page_content[:100])
                if doc_id not in seen_ids:
                    seen_ids.add(doc_id)
                    all_docs.append(doc) 
                          
        except Exception as e:  
            if verbose:
                print(f"  Retrieval failed for variant '{q[:40]}': {e}") 
            continue   

    # trim to k_final             
    result = all_docs[:k_final]           
                            
    if verbose:
        print(f"  Retrieved {len(result)} unique chunks")

    return result