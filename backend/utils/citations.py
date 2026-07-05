# backend/utils/citations.py
          
from langchain_core.documents import Document 
from backend.storage.s3_operations import get_pdf_url


def format_docs_for_context(docs: list[Document]) -> str:
    """
    Returns:
        str : plain concatenated chunk text
    """
    if not docs:
        return "No relevant document chunks retrieved."

    return "\n\n".join(doc.page_content for doc in docs)


def format_sources_block(docs: list[Document]) -> str:
    """
    Builds a clean deduplicated source reference block
    shown below the answer.

    Groups by filename, lists all pages referenced,
    and appends a clickable S3 PDF URL for each source.
    """
    if not docs:
        return ""

    #  Deduplicate and group by filename ──
    sources: dict[str, dict] = {}

    for doc in docs:
        fname  = doc.metadata.get("source", "unknown")
        page   = str(doc.metadata.get("page", "?"))
        folder = doc.metadata.get("folder", "unknown")

        if fname not in sources:
            sources[fname] = {
                "pages" : set(),
                "folder": folder,
            }
        sources[fname]["pages"].add(page)

    # Build display lines 
    lines = ["\n📚 **Sources Referenced:**"]

    for fname, info in sorted(sources.items()):
        pages = ", ".join(
            sorted(
                info["pages"], 
                key=lambda x: int(x) if x.isdigit() else 0,
            )
        )
        folder  = info["folder"]
        pdf_url = get_pdf_url(fname, folder)

        lines.append(
            f"  • [`{fname}`]({pdf_url}) "
            f"— Page(s): {pages} | {folder}"
        )

    return "\n".join(lines)


def build_full_response(answer: str, sources_block: str) -> str:
    """
    Combines Gemini's answer with the sources block.                 
    Keeps them separate so history stores only the raw answer.         
    """
    if not sources_block:
        return answer
    return f"{answer}\n\n{sources_block}"