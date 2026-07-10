# AI for Industrial Knowledge Intelligence (ET hackathon)
### Hybrid GraphRAG-powered Industrial Knowledge Assistant for Oil & Gas, Refinery and Process Industries

**Developed for:** Economic Times (ET) Hackathon 2026  
   
--- 

## Authors

| Name | Role | LinkedIn | Github | Website |
|------|------|----------|--------|---------|
| **Ritam Mondal** | Team Leader | [Linkedin](https://www.linkedin.com/in/ritam-mondal-86a369287/) | [Github](https://github.com/ritammondal2004) | [Website](https://ritammondal.vercel.app/) |
| **Ushasee Roy** | Team Member |  [Linkedin](https://www.linkedin.com/in/ushasee-roy-5a9a82273/) | [Github](https://github.com/) | |
| **Mayukh Mondal** | Team Member |  [Linkedin](https://www.linkedin.com/in/mayukh-mondal-23ce300/) | [Github](https://github.com/) | |

---

# Live Demo

### Frontend [Application](https://industrial-ai-support.vercel.app/)

### Backend [API (Hugging Face)](https://ritammondal2004-et-hackathon-backend.hf.space/docs)


---

# Project Overview

Industrial plants generate massive amounts of technical knowledge in the form of equipment manuals, Standard Operating Procedures (SOPs), maintenance documents, incident investigation reports, and industrial regulations. Although this information is valuable for operators and engineers, it is usually scattered across hundreds of lengthy PDF documents, making information retrieval slow and inefficient during real-world operations.

This project presents a **Hybrid GraphRAG-based Industrial Knowledge Intelligence System** that transforms unstructured industrial documents into a searchable knowledge base. By combining semantic retrieval using ChromaDB with relationship-aware retrieval using a Knowledge Graph, the system provides accurate, explainable, and context-rich responses while maintaining document-level traceability through source citations.

The system is designed to function as an intelligent engineering assistant capable of understanding natural language queries, retrieving relevant technical information, and generating grounded answers with direct references to the original documents.

---

# Problem Statement

Industrial organizations face several challenges while accessing technical knowledge:

- Engineers spend significant time manually searching through lengthy manuals and SOPs.
- Traditional keyword search often fails to capture semantic meaning or relationships between industrial entities.
- Important information is distributed across multiple document categories including manuals, regulations, procedures, and incident reports.
- Existing retrieval systems usually ignore relationships between equipment, components, hazards, and operational procedures.
- AI-generated answers without source grounding reduce user trust and may introduce hallucinations in safety-critical environments.

Our objective is to build an intelligent knowledge assistant capable of retrieving trustworthy information from heterogeneous industrial documents while providing transparent citations and relationship-aware reasoning.

---


# Tech Stack

| Category | Technologies |
|----------|--------------|
| Programming Language | ![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white) |
| Backend | ![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white) |
| Frontend | ![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white) ![TanStack Router](https://img.shields.io/badge/TanStack_Router-FF4154?style=for-the-badge&logo=reactquery&logoColor=white) ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white) |
| LLM | ![Gemini](https://img.shields.io/badge/Google_Gemini-4285F4?style=for-the-badge&logo=google&logoColor=white) |
| Embeddings | BAAI BGE-Large-v1.5 |
| Vector Database | ![ChromaDB](https://img.shields.io/badge/ChromaDB-6E44FF?style=for-the-badge) |
| Knowledge Graph | ![NetworkX](https://img.shields.io/badge/NetworkX-333333?style=for-the-badge) |
| Cloud Storage | ![AWS S3](https://img.shields.io/badge/AWS_S3-FF9900?style=for-the-badge&logo=amazonaws&logoColor=white) |
| Deployment | ![HuggingFace](https://img.shields.io/badge/HuggingFace-FCC624?style=for-the-badge&logo=huggingface&logoColor=black) ![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white) |
| Version Control | ![Git](https://img.shields.io/badge/Git-F05032?style=for-the-badge&logo=git&logoColor=white) ![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white) |

---

# Project Structure

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
│   │   ├── query.py                # POST /query  (Knowledge Assistant)
│   │   ├── copilot.py              # POST /copilot (Industrial Copilot )
│   │   ├── rca.py                  # POST /rca    (RCA Assistant —r)
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
│   └── made with React.js, typescript , tanstack router    
│ 
├── hf_deploy/  
│   └── whole backend only              
│
├── data/
│   ├── raw/
│   ├── processed/
│   └── cache/
│
├── notebooks/                      # notebooks for experimental work
│   ├── GraphRAG_building_from_json_files.ipynb 
│   ├── chroma_db_data_ingestion_experimental.ipynb
│   └── Retrieval_Context_and_response_experiment.ipynb
│
├── eval/
│     ├── qa_test_set.jsonl          (100 benchmark questions)
│     ├── run_eval.py                (main evaluator)
│     ├── metrics.py                 (all scoring functions)
│     ├── results.csv
│     ├── report.md
│     └── plots.py                   (optional graphs)
│
├── .env
├── .gitignore
├── requirements.txt
├── Dockerfile 
└── README.md 
```

---


# Installation

## Clone Repository

Clone the repository

```bash
git clone https://github.com/ritammondal2004/AI-for-Industrial-Knowledge-Intelligence.git

cd AI-for-Industrial-Knowledge-Intelligence
```


---

## Create Virtual Environment

Windows

```bash
python -m venv .venv

.venv\Scripts\activate
```

Linux / Mac

```bash
python3 -m venv .venv

source .venv/bin/activate
```

---

## Install Dependencies

```bash
pip install -r requirements.txt
```

---

# Environment Variables

Create a `.env` file in the project root.

```env
AWS_ACCESS_KEY_ID=YOUR_ACCESS_KEY

AWS_SECRET_ACCESS_KEY=YOUR_SECRET_KEY

AWS_REGION=eu-north-1

S3_BUCKET=industrial-ai-knowledge-base

HF_TOKEN=YOUR_HUGGINGFACE_TOKEN

GEMINI_KEY_1=

GEMINI_KEY_2=

GEMINI_KEY_3=

GEMINI_KEY_4=

GEMINI_KEY_5=

GEMINI_KEY_6=
```


# Download Required Data

The repository does **not** contain the ChromaDB database and Knowledge Graph because of their large size.

Download them manually from Google Drive.

### ChromaDB [drive link](https://drive.google.com/drive/folders/18pxV2LFBVwhBZ9FeCWwt0CntFkCbCJb-?usp=sharing)


            
Download the folder

```text
chroma_db/
```

Copy it to

```text
data/cache/chroma_db/
```

---

### Knowledge Graph [drive link](https://drive.google.com/file/d/1L_L02GHCP4yMME9qHldaAbMxBbn-LQUA/view?usp=sharing)



Download

```text
knowledge_graph.gpickle
```

Place it inside

```text
data/cache/
```

Final directory should look like

```text
data/
└── cache/
      ├── chroma_db/
      └── knowledge_graph.gpickle
```

---

# Running the Project

## Start Backend 

```bash
uvicorn backend.main:app --reload
```

Backend will be available at

```
http://localhost:8000
```

Swagger API Documentation

```
http://localhost:8000/docs
```

---

## Start Frontend

`soon...`

---

# Notes

- The backend automatically downloads cached resources from AWS S3 when deployed on HuggingFace.
- During local development, manually place the downloaded ChromaDB and Knowledge Graph inside `data/cache`.
- API keys are automatically rotated when Gemini rate limits are reached.
- All generated answers include document citations with page numbers and direct PDF links.


----


# Architecture Overview

The complete architecture diagrams are available inside the **DESIGN.md** document.


1. Data Ingestion Pipeline
2. Knowledge Graph Construction Pipeline
3. Hybrid GraphRAG Retrieval Pipeline
4. Backend System Architecture

These diagrams explain the complete workflow from raw industrial PDFs to the final AI-generated answer.

---


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
