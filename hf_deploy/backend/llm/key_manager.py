# backend/llm/key_manager.py  

import os
import time 
from backend.config import KEY_ROTATION_WAIT_SECONDS

 
# Reads all keys from environment variables.

_KEY_ENV_VARS = [
    "GEMINI_KEY_1",  
    "GEMINI_KEY_2",
    "GEMINI_KEY_3",
    "GEMINI_KEY_4",
    "GEMINI_KEY_5",
    "GEMINI_KEY_6",
]

API_KEYS: list[str] = [
    os.environ[k] for k in _KEY_ENV_VARS if os.environ.get(k)  
]

if not API_KEYS:
    raise RuntimeError(
        "No Gemini API keys found. "
    )  

# ── Current key index 
_current_index: int = 0


def get_current_key() -> str:
    # Returns the currently active API key.
    return API_KEYS[_current_index]


def switch_api_key() -> str:
    """
    Rotates to the next API key in the pool.
    Returns the new active key.
    """
    global _current_index

    next_index = (_current_index + 1) % len(API_KEYS)
                     
    # if next_index == 0:
    #     # Full rotation completed — all keys hit quota
    #     print( 
    #         f"  All {len(API_KEYS)} API keys exhausted. "
    #         f"Waiting {KEY_ROTATION_WAIT_SECONDS}s before retrying..."
    #     )                 
    #     time.sleep(KEY_ROTATION_WAIT_SECONDS)

    _current_index = next_index    
    print(f"🔄 Switched to API key #{_current_index + 1} of {len(API_KEYS)}")
    return get_current_key()  


def key_count() -> int:
    """Returns total number of loaded API keys."""
    return len(API_KEYS)