
industrial-knowledge-intelligence/
├── data/
│   ├── raw/
│   │   ├── manuals/
│   │   ├── maintenance_logs/
│   │   ├── procedures/
│   │   └── incident_reports/
│   └── processed/
│       ├── chunks.jsonl
│       ├── entities.jsonl
│       └── chroma_db/           ← ChromaDB writes here automatically
|
├── backend/
│   ├── main.py                  ← FastAPI app, mounts routers 
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── query.py             ← POST /query  (RAG question-answering)
│   │   ├── ingest.py            ← POST /ingest (trigger document processing)
│   │   └── graph.py             ← GET /graph   (entity relationships for viz)
│   ├── services/
│   │   ├── __init__.py
│   │   ├── rag_chain.py         ← LangChain RAG logic
│   │   ├── ingestion.py         ← PDF/CSV parsing + chunking
│   │   └── graph_builder.py     ← entity/relationship extraction + graph ops
│   └── models.py                ← Pydantic request/response schemas
│
├── frontend/
│   └── app.py                   ← Streamlit, calls backend via requests/httpx
│
|
│
├── .env                         ← API keys (GOOGLE_API_KEY etc.) — gitignored
├── .gitignore                   ← data/processed/, .env, __pycache__/, venv/
├── requirements.txt
└── README.md  

# to run `uvicorn backend.main:app --reload`