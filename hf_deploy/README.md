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



# Project Structure

```text
industrial-knowledge-intelligence/
│
├── backend/
│   │
│   ├── main.py                    
│   ├── config.py                   
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── query.py               
│   │   ├── copilot.py            
│   │   ├── rca.py                 
│   │   └── graph.py                
│   │
│   ├── retrieval/
│   │   ├── __init__.py
│   │   ├── vector_store.py         # load ChromaDB from local cache, MMR search
│   │   ├── mmr_retriever.py        # smart_retrieve() — MMR + folder routing + dedup
│   │   └── query_expander.py       
│   │
│   ├── graph/
│   │   ├── __init__.py
│   │   ├── graph_loader.py         # load .gpickle from local cache
│   │   └── graph_retriever.py      # graph_context() 
│   │
│   ├── memory/
│   │   ├── __init__.py
│   │   └── conversation.py         # format_history(), sliding window (last 3 turns)
│   │
│   ├── llm/
│   │   ├── __init__.py
│   │   ├── key_manager.py          
│   │   └── gemini_client.py        # invoke_with_rotation(), get_chat_model()
│   │
│   ├── prompts/
│   │   ├── __init__.py
│   │   ├── knowledge_assistant.py  # conversational prompt
│   │   ├── industrial_copilot.py   #  guidance prompt
│   │   └── rca_assistant.py        #  root cause analysis prompt
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   └── rag_chain.py            # ask() — main pipeline  
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── citations.py            # format_docs_with_citations(), format_sources_block()
│   │   └── folder_detector.py      
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
│     ├── qa_test_set.jsonl         
│     ├── run_eval.py                (main evaluator)
│     ├── metrics.py                 
│     ├── results.json
│     ├── report.md 
│     └── plots.py                 
│
├── .env
├── .gitignore
├── requirements.txt
├── Dockerfile 
└── README.md 
```
