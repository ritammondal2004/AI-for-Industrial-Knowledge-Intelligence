
# backend/utils/folder_detector.py

from backend.config import FOLDER_KEYWORDS


def detect_relevant_folders(query: str) -> list[str] | None:
    """
    Detects which document folders are most relevant to the query
    based on keyword matching.
    Returns a list of folder names to filter ChromaDB search, 
    """
    query_lower = query.lower()
    folder_scores: dict[str, int] = {}

    for folder, keywords in FOLDER_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in query_lower)
        if score > 0:
            folder_scores[folder] = score

    if not folder_scores:
        return None  # no signal — caller should search all folders   

    # Keep folders that scored at least half the top score 
    max_score = max(folder_scores.values())
    relevant = [folder for folder, score in folder_scores.items() if score >= max_score * 0.5]

    return relevant if relevant else None              
                                 

def build_chroma_filter(folders: list[str]) -> dict | None:
    """
    Converts a list of folder names into a ChromaDB
    metadata filter dict.
    """             
    if not folders:
        return None

    if len(folders) == 1:
        return {"folder": folders[0]}

    return {"folder": {"$in": folders}}  