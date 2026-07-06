
# backend/llm/gemini_client.py

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.output_parsers import StrOutputParser 
  
from backend.config import *
from backend.llm.key_manager import (
    get_current_key,
    switch_api_key,
    key_count, 
)  
  

def get_chat_model() -> ChatGoogleGenerativeAI:
    """
    Returns a Gemini chat model for answer generation.
    """
    return ChatGoogleGenerativeAI(
        model=GEMINI_MODEL,
        temperature=GEMINI_TEMPERATURE,
        google_api_key=get_current_key(),
    )

# this model is for smart retrieval / query expansion, not for chat 
def get_expansion_model() -> ChatGoogleGenerativeAI:  
    """
    Returns a Gemini model for query expansion.
    Separate from chat model so temperature can differ.
    """
    return ChatGoogleGenerativeAI(  
        model=EXPANSION_MODEL,
        temperature=EXPANSION_TEMPERATURE,
        google_api_key=get_current_key(),
    )


def invoke_with_rotation(prompt_template, chain_input: dict) -> str:
    """
    Invokes a LangChain prompt | model | StrOutputParser chain.
    Automatically rotates API key on 429 / quota errors.
    Returns:  
        str : the model's text response
    """
    max_retries = key_count() * 2 
    attempts = 0

    while attempts < max_retries:
        try:
            model = get_chat_model()  
            chain = prompt_template | model | StrOutputParser()
            return chain.invoke(chain_input)
                                            
        except Exception as e:  
            err = str(e).lower()   
            if "429" in err or "quota" in err or '503' in err or "exhausted" in err:
                switch_api_key() 
                attempts += 1
                continue
            # Non-quota error — don't retry, surface immediately
            raise e

    raise RuntimeError(
        f"All {max_retries} retry attempts failed "
        f"across {key_count()} API keys."
    )
           

def invoke_expansion_with_rotation(prompt_template, chain_input: dict) -> str:
    """
    Same retry logic as invoke_with_rotation but uses
    Used by query_expander.py.
    """
    max_retries = key_count() * 2
    attempts = 0

    while attempts < max_retries:
        try:
            model = get_expansion_model()
            chain = prompt_template | model | StrOutputParser()
            return chain.invoke(chain_input)

        except Exception as e:
            err = str(e).lower()
            if "429" in err or "quota" in err or "exhausted" in err:
                switch_api_key()
                attempts += 1
                continue   
            raise e

    raise RuntimeError(
        f"Expansion failed after {max_retries} attempts "
        f"across {key_count()} API keys."
    )