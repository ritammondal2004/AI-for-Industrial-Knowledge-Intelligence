## Project Structure

```text
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
│       └── chroma_db/           # ChromaDB vector store
│
├── backend/
│   ├── main.py                  # FastAPI application entrypoint
│   ├── routes/
│   │   ├── __init__.py
│   │   ├── query.py             # POST /query (RAG QA endpoint)
│   │   ├── ingest.py            # POST /ingest (document ingestion)
│   │   └── graph.py             # GET /graph (knowledge graph data)
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── rag_chain.py         # LangChain RAG pipeline
│   │   ├── ingestion.py         # Parsing, chunking, embeddings
│   │   └── graph_builder.py     # Entity & relationship extraction
│   │
│   └── models.py                # Pydantic schemas
│
├── frontend/
│   └── app.py                   # Streamlit frontend
│
├── .env                         # API keys (gitignored)
├── .gitignore                    
├── requirements.txt
└── README.md
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
