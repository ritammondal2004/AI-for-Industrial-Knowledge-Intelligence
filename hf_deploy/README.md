---
title: ET Hackathon Backend
emoji: 🚀
colorFrom: blue
colorTo: green
sdk: docker
pinned: false
---

# Industrial Knowledge Intelligence Backend

FastAPI backend for the Hybrid GraphRAG Industrial Knowledge Intelligence system.



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
│   ├──raw/ 
│   │   ├── Incident_reports/
│   │   ├── Manusals/
│   │   ├── Procesdures
│   │   └── Regulations
│   │   
│   ├──processed/
│   │   ├── graph_json/
│   │   ├── extracted_pages
│   │   ├── ingestion_progress.json
│   │   ├── caption_cache.json
│   │   └── kg_progress.json
|   │   
│   └── cache/                      # local disk cache — S3 downloads land here
│       ├── chroma_db/              # downloaded once at startup, reused
│       └── knowledge_graph.gpickle # downloaded once at startup, reused
│
├── notebooks/                      # notebooks for experimental work
│   ├── GraphRAG_building_from_json_files.ipynb 
│   ├── chroma_db_data_ingestion_experimental.ipynb
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
