
# backend/memory/conversation.py

from backend.config import MEMORY_WINDOW


def format_history(chat_history: list[tuple[str, str]]) -> str:
    """
    Formats the sliding window of conversation history
    into a readable string for the prompt.  
    """
    if not chat_history:
        return "No previous conversation."

    # Sliding window — keep only last MEMORY_WINDOW turns
    recent = chat_history[-MEMORY_WINDOW:]

    return "\n\n".join(
        f"Human: {question}\nAssistant: {answer}"
        for question, answer in recent
    )


def update_history(chat_history: list[tuple[str, str]], question: str,answer: str) -> list[tuple[str, str]]:
    """
    Appends a new (question, answer) turn to history.
    Returns the updated history list.
    """
    return chat_history + [(question, answer)]


def get_window_size(chat_history: list[tuple[str, str]]) -> int:
                             
    return min(len(chat_history), MEMORY_WINDOW)