## Project Structure

```text
industrial-knowledge-intelligence/
│
├── backend/
│   │
│   ├── main.py                     # FastAPI app, lifespan startup, router registration
│   ├── config.py                   # all constants — S3 paths, model names, thresholds
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── query.py                # POST /query  (Knowledge Assistant — current)
│   │   ├── copilot.py              # POST /copilot (Industrial Copilot — add later)
│   │   ├── rca.py                  # POST /rca    (RCA Assistant — add later)
│   │   └── graph.py                # GET  /graph  (graph viz data for frontend)
│   │
│   ├── retrieval/
│   │   ├── __init__.py
│   │   ├── vector_store.py         # load ChromaDB from local cache, MMR search
│   │   ├── mmr_retriever.py        # smart_retrieve() — MMR + folder routing + dedup
│   │   └── query_expander.py       # expand_query() — Gemini query expansion
│   │
│   ├── graph/
│   │   ├── __init__.py
│   │   ├── graph_loader.py         # load .gpickle from local cache
│   │   └── graph_retriever.py      # graph_context() — keyword match + neighbor expansion
│   │
│   ├── memory/
│   │   ├── __init__.py
│   │   └── conversation.py         # format_history(), sliding window (last 3 turns)
│   │
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── key_manager.py          # API_KEYS, switch_api_key(), current_key state
│   │   └── gemini_client.py        # invoke_with_rotation(), get_chat_model()
│   │
│   ├── prompts/
│   │   ├── __init__.py
│   │   ├── knowledge_assistant.py  # conversational_prompt (current)
│   │   ├── industrial_copilot.py   #  (mode 2 — add later)
│   │   └── rca_assistant.py        #  (mode 3 — add later)
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   └── rag_chain.py            # ask() — main pipeline 
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── citations.py            # format_docs_with_citations(), format_sources_block()
│   │   └── folder_detector.py      # detect_relevant_folders(), FOLDER_KEYWORDS
│   │
│   ├── storage/
│   │   ├── __init__.py
│   │   └── s3_operations.py        # download_from_s3()
│   │                                                    
│   └── models.py                
│
├── frontend/
│   └── app.py                      # Streamlit
│
├── data/
│   └── cache/                      # local disk cache — S3 downloads land here
│       ├── chroma_db/              # downloaded once at startup, reused
│       └── knowledge_graph.gpickle # downloaded once at startup, reused
│
├── notebooks/                      # reference only for experimental
│   ├── GraphRAG_building_from_json_files_generated_from_pdf.ipynb 
│   └── Retrieval_Context_and_response_experiment.ipynb
│
├── eval/
│   ├── qa_test_set.jsonl
│   └── run_eval.py  
│
├── .env
├── .gitignore
├── requirements.txt
├── Dockerfile
└── README.md
```

### building flows
```
Step 1 — backend/config.py
Step 2 — backend/storage/s3_operations.py
Step 3 — backend/llm/key_manager.py
Step 4 — backend/llm/gemini_client.py
Step 5 — backend/memory/conversation.py
Step 6 — backend/utils/folder_detector.py
Step 7 — backend/utils/citations.py
Step 8 — backend/retrieval/vector_store.py
Step 9 — backend/retrieval/query_expander.py
Step 10 — backend/retrieval/mmr_retriever.py
Step 11 — backend/graph/graph_loader.py
Step 12 — backend/graph/graph_retriever.py
Step 13 — backend/prompts/knowledge_assistant.py
Step 14 — backend/services/rag_chain.py
Step 15 — backend/models.py
Step 16 — backend/api/query.py
Step 17 — backend/api/graph.py
Step 18 — backend/main.py
Step 19 — Dockerfile                 
Step 20 — requirements.txt
```

## Run Locally

### Start FastAPI Backend

```bash
uvicorn backend.main:app --reload
```

### Start Streamlit Frontend

```bash
streamlit run frontend/app.py
```
