
# backend/retrieval/query_expander.py

import json
import re
from langchain_core.prompts import ChatPromptTemplate
from backend.llm.gemini_client import invoke_expansion_with_rotation
              

# Prompt to expand
EXPANSION_PROMPT = ChatPromptTemplate.from_template("""
You are a query expansion assistant for an industrial knowledge base.
Given a user question, generate 3 alternative phrasings that mean the same thing
but use different vocabulary. Industrial/technical documents often use formal
terminology, so include both casual and technical phrasings.

Return ONLY a JSON list of 3 strings, nothing else.
Example: ["What is cavitation?", "Define cavitation in pumps", "Cavitation phenomenon explanation"]

Question: {question}
""")


def expand_query(query: str) -> list[str]:
    """         
    Generates 3 alternative phrasings of the user query
    to improve retrieval call  
    Returns:
        list[str] : [original_query, alt1, alt2, alt3]
                    or [original_query] on failure     
    """
    try:                                          
        raw = invoke_expansion_with_rotation(EXPANSION_PROMPT,{"question": query}).strip()
                                          
        # Strip markdown fences if Gemini wraps response
        if raw.startswith("```"):
            raw = re.sub(r"^```(?:json)?", "", raw).strip()
            raw = re.sub(r"```$", "", raw).strip()
                                                  
        alternatives = json.loads(raw.strip())
                         
        if not isinstance(alternatives, list):
            raise ValueError("Expansion response is not a list")

        # Always keeping original query first   
        return [query] + [str(a) for a in alternatives[:3]]

    except Exception as e:
        print(f"Query expansion failed: {e} — using original query only")
        return [query]  