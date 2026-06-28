## Project Structure

```text
industrial-knowledge-intelligence/
├── data/
│   ├── raw/
│   │   ├── Incident_reports/
|   |   ├── Maintenance_logs/
│   │   ├── Manuals/
│   │   ├── Procedures/ 
|   |   └── Regulations/
|   |
│   ├── processed/
│   │   ├── chunks.jsonl
│   │   ├── entities.jsonl
│   │   └── chroma_db/              # ChromaDB vector store
│   └── uploads/                    # temp storage for query-time file uploads (gitignored)
│
├── backend/
│   ├── main.py                     # FastAPI app entrypoint
│   ├── config.py                   # model names, chunk size, paths — one place to tune
│   ├── routes/                               
│   │   ├── __init__.py                 
│   │   ├── query.py                 # POST /query — text + optional file upload
│   │   ├── ingest.py                # POST /ingest — batch document ingestion
│   │   └── graph.py                 # GET /graph — entity relationships for viz
│   │                                              
│   ├── services/                         
│   │   ├── __init__.py
│   │   ├── document_parser.py       # process_document() — the universal function above
│   │   ├── image_captioner.py       # extract images from PDFs, caption via Gemini multimodal
│   │   ├── chunking.py              # chunking strategy,  can be tuned without touching parsing logic
│   │   ├── embeddings.py            # embed + ChromaDB add/query wrappers
│   │   ├── rag_chain.py             # orchestrates retrieval + generation for /query
│   │   └── graph_builder.py         # entity/relationship extraction + NetworkX build
│   │
│   └── models.py                    # Pydantic schemas (QueryRequest now includes optional file, etc.)
│
├── frontend/
│   └── app.py                       # Streamlit — chat UI, file uploader, citations, graph viz panel
│
├── eval/
│   ├── qa_test_set.jsonl             # hand-written Q&A pairs for measuring retrieval accuracy
│   └── run_eval.py                   # script to run the test set 
│
├── notebooks/
│   └── exploration.ipynb             # test chunking, inspect extraction quality, debug retrieval
│
├── .env                              # API keys (gitignored)
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
