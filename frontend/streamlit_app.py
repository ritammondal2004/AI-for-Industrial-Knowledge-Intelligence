# frontend/streamlit_app.py
# Industrial Knowledge Copilot — Streamlit Frontend

import streamlit as st
import requests
import os   
          
# ── Config 
st.set_page_config(
    page_title="Industrial Knowledge Copilot",
    page_icon="⚙️",
    layout="wide",
)

BACKEND_URL = os.environ.get("BACKEND_URL", "http://localhost:8000")
                                        
#  styling ─
st.markdown("""            
<style>                  
    /* hide default streamlit chrome */
    #MainMenu, footer { visibility: hidden; }

    /* chat message styling */
    .user-msg {
        background: #1e2530;
        border-left: 3px solid #4a9eff;
        border-radius: 8px;
        padding: 12px 16px;
        margin: 8px 0;
        color: #e6edf3;
    }
    .bot-msg {
        background: #161b22;
        border-left: 3px solid #e6a817;
        border-radius: 8px;
        padding: 14px 18px; 
        margin: 8px 0;             
        color: #e6edf3;               
    }                   
    .source-tag {        
        display: inline-block;
        background: #0d1117;
        border: 1px solid #30363d;
        border-radius: 4px;
        padding: 2px 8px;
        font-size: 12px;
        color: #2dd4bf;
        margin: 2px;
        font-family: monospace;
    }
</style>
""", unsafe_allow_html=True)


# Session state ─
if "messages" not in st.session_state:
    st.session_state.messages = []          # display messages
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []      # backend history format


# ── Backend helpers ──
@st.cache_data(ttl=30)
def get_health():
    try:
        r = requests.get(f"{BACKEND_URL}/health", timeout=5)
        return r.json() if r.status_code == 200 else None
    except Exception:
        return None


def query_backend(question, history):
    try:
        r = requests.post(
            f"{BACKEND_URL}/query",
            json={"question": question, "chat_history": history},
            timeout=60,
        )
        return r.json() if r.status_code == 200 else None
    except Exception as e:
        return None


#  Sidebar 
with st.sidebar:
    st.markdown("### ⚙️ Industrial Copilot")
    st.markdown("*Hybrid GraphRAG System*")
    st.divider()

    # Backend status
    health = get_health()
    if health:
        st.success("Backend online")
        st.metric("Chunks indexed", f"{health.get('chroma_chunks', 0):,}")
        st.metric("Graph nodes",    health.get('graph_nodes', 0))
        st.metric("Graph edges",    health.get('graph_edges', 0))
        st.metric("API keys",       health.get('api_keys_loaded', 0))
    else:
        st.error("Backend unreachable")
        st.caption(f"`{BACKEND_URL}`")

    st.divider()

    # Memory window
    turns = min(len(st.session_state.chat_history), 3)
    st.caption(f"🧠 Memory: **{turns}/3** turns active")
                     
    # Clear button
    if st.button("🗑️ Clear chat", use_container_width=True):
        st.session_state.messages = []
        st.session_state.chat_history = []
        st.rerun()

    st.divider()
    st.caption("**Modes**")
    st.markdown("✅ Knowledge Assistant")
    st.markdown("🔜 Industrial Copilot")
    st.markdown("🔜 Root Cause Analysis")


# ── Main area ─────────────────────────────────────────────────────
st.title("🤖  Industrial Knowledge Copilot")
st.caption(
    "Ask about equipment manuals, SOPs, regulations, or incident reports. "
    "Every answer is grounded in your document corpus."
)
st.divider()


# ── Suggestion chips (shown only when chat is empty) ──────────────
SUGGESTIONS = [
    "What are the safety precautions before starting a centrifugal pump?",
    "Explain cavitation and how to prevent it",
    "What does OSHA say about permit-to-work procedures?",
    "What should be done after a pump seal failure?",
]

if not st.session_state.messages:
    st.markdown("**Try asking:**")
    cols = st.columns(2)
    for i, suggestion in enumerate(SUGGESTIONS):
        with cols[i % 2]:
            if st.button(suggestion, key=f"sug_{i}", use_container_width=True):
                st.session_state["prefill"] = suggestion
                st.rerun()


# ── Render conversation ───────────────────────────────────────────
for msg in st.session_state.messages:
    if msg["role"] == "user":
        st.markdown(
            f'<div class="user-msg">🧑‍💼 &nbsp; {msg["content"]}</div>',
            unsafe_allow_html=True,
        )   
    else:
        # Split answer text from sources block
        # (sources rendered separately as chips below)
        answer_text = msg["content"].split("\n\n📚")[0].strip()
        sources     = msg.get("sources", [])

        # Build source chips HTML
        source_chips = ""
        for s in sources:
            pages  = ", ".join(s.get("pages", []))
            fname  = s.get("filename", "")
            folder = s.get("folder", "")
            url    = s.get("pdf_url", "#")
            source_chips += (
                f'<a href="{url}" target="_blank" class="source-tag">'
                f'📄 {fname} · p.{pages} [{folder}]</a>'
            )

        sources_section = (
            f"<div style='margin-top:12px;border-top:1px solid #30363d;"
            f"padding-top:10px;font-size:12px;color:#8b949e;'>"
            f"📚 Sources: {source_chips}</div>"
            if source_chips else ""
        )

        st.markdown(
            f'<div class="bot-msg">⚙️ &nbsp;{answer_text}{sources_section}</div>',
            unsafe_allow_html=True,
        )


# ── Input form 

if "prefill" in st.session_state:
    prefill_val = st.session_state["prefill"]
    del st.session_state["prefill"]
else:
    prefill_val = ""

with st.form("chat_form", clear_on_submit=True):
    col1, col2 = st.columns([5, 1])
    with col1:
        user_input = st.text_input(
            "question",
            value=prefill_val,
            placeholder="Ask about equipment, procedures, safety regulations...",
            label_visibility="collapsed",
        )
    with col2:
        submitted = st.form_submit_button("Send ⚡", use_container_width=True)


# ── Handle query ──────────────────────────────────────────────────
if submitted and user_input and user_input.strip():
    query = user_input.strip()

    # Add user message to display
    st.session_state.messages.append({"role": "user", "content": query})

    # Call backend with spinner
    with st.spinner("⚙️  Retrieving context and generating answer..."):
        result = query_backend(query, st.session_state.chat_history)

    if result:
        answer      = result.get("answer", "No answer returned.")
        sources     = result.get("sources", [])
        new_history = result.get("chat_history", [])

        st.session_state.chat_history = new_history
        st.session_state.messages.append({
            "role"   : "assistant",
            "content": answer,
            "sources": sources,
        })
    else:
        st.session_state.messages.append({
            "role"   : "assistant",
            "content": "⚠️ Failed to get a response. Is the backend running?",
            "sources": [],
        })

    st.rerun()