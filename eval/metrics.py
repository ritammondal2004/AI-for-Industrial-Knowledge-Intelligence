# eval/metrics.py
# All scoring functions for the Industrial Knowledge Copilot evaluation

import re
from typing import Any


def source_match_score(
    expected_docs: list[str],
    retrieved_sources: list[dict]) -> float:
    """
    Checks if expected source documents appear in retrieved sources.
    Returns 1.0 if all expected docs found, partial score otherwise.
    """
    if not expected_docs:
        return 1.0  # no expectation — skip

    retrieved_filenames = {
        s.get("filename", "").lower()
        for s in retrieved_sources
    }

    matched = sum(
        1 for doc in expected_docs
        if doc.lower() in retrieved_filenames
    )

    return matched / len(expected_docs)


def folder_match_score(
    expected_folder: str,
    retrieved_sources: list[dict],
) -> float:
    """
    Checks if at least one retrieved source comes from the expected folder.
    Returns 1.0 if yes, 0.0 if no.
    """
    if not expected_folder:
        return 1.0

    retrieved_folders = {
        s.get("folder", "").lower()
        for s in retrieved_sources
    }

    return 1.0 if expected_folder.lower() in retrieved_folders else 0.0


def keyword_coverage_score(
    expected_keywords: list[str],
    answer_text: str) -> float:
    """
    Measures what fraction of expected keywords appear in the answer.
    Case-insensitive, partial word match allowed.  
    """
    if not expected_keywords:
        return 1.0

    answer_lower = answer_text.lower()
    matched = sum(
        1 for kw in expected_keywords
        if kw.lower() in answer_lower
    )

    return matched / len(expected_keywords)


def answer_length_score(answer_text: str) -> float:
    """
    Penalizes very short answers (likely retrieval failure).       
    Returns 1.0 for answers >= 100 chars, scales down below that.   
    """
    length = len(answer_text.strip())
    if length >= 100:
        return 1.0
    elif length == 0:
        return 0.0
    else:
        return length / 100.0


def not_found_penalty(answer_text: str) -> float:
    """
    Detects if the system said "not found" / "not in knowledge base"
    when it should have answered (penalizes false negatives).  
    """
    not_found_phrases = [
        "not found in knowledge base",
        "insufficient data",
        "no relevant information",
        "cannot find",
        "not available in",
        "not present in",
    ]
    answer_lower = answer_text.lower()
    for phrase in not_found_phrases:
        if phrase in answer_lower:
            return 0.0
    return 1.0


def graph_usage_score(graph_context: str) -> float:
    """
    For requires_graph=True questions, checks if graph
    context was actually retrieved (non-empty).   
    """
    if not graph_context or graph_context.strip() in [
        "", "No relevant graph entities found."
    ]:
        return 0.0
    return 1.0


def multi_doc_score(
    retrieved_sources: list[dict],
    required: bool,
) -> float:
    """
    For multi_document=True questions, checks if sources
    span more than one document.
                            
    Returns:
        float: 1.0 if multi-doc retrieved (or not required), 0.0 if failed 
    """
    if not required:
        return 1.0

    unique_docs = {s.get("filename", "") for s in retrieved_sources}
    return 1.0 if len(unique_docs) > 1 else 0.0


def compute_overall_score(
    source_score: float,
    folder_score: float,
    keyword_score: float,
    length_score: float,
    not_found_score: float,
    multi_doc_score_val: float,
) -> float:
    """
    Weighted aggregate score for a single question.
    Weights:
        keyword coverage  40% — most important: is the answer correct?
        source match      25% — did it find the right documents?
        folder match      15% — did it search the right category?
        not found penalty 10% — did it incorrectly say "not found"?
        length score       5% — is the answer substantive?
        multi doc          5% — did it use multiple sources when needed?

    Returns:
        float: 0.0 to 1.0
    """
    return (
        keyword_score      * 0.40 +
        source_score       * 0.25 +
        folder_score       * 0.15 +
        not_found_score    * 0.10 +
        length_score       * 0.05 +
        multi_doc_score_val * 0.05
    )