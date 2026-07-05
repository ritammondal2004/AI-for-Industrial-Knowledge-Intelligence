# backend/storage/s3_operations.py

import boto3
import os
from backend.config import (
    CACHE_DIR,
    CHROMA_DB_PATH,
    GRAPH_PATH,
    S3_BUCKET,
    S3_CHROMA_PREFIX,
    S3_GRAPH_KEY,
    S3_PDF_PREFIX,
    AWS_REGION,
) 
             

def _get_s3_client():
    # Returns a configured boto3 S3 client. Called internally.
    return boto3.client(
        "s3",
        region_name=os.environ.get("AWS_REGION", AWS_REGION),
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def download_from_s3(s3_prefix: str, local_dir: str) -> None:
    """
    Downloads all objects under s3_prefix into local_dir.
    Preserves the relative folder structure.
    """
    s3 = _get_s3_client()
    bucket = os.environ.get("S3_BUCKET", S3_BUCKET)

    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=s3_prefix):
        for obj in page.get("Contents", []):
            key = obj["Key"]
            relative = key[len(s3_prefix):]
            if not relative:       
                continue                                            
            local_file = os.path.join(local_dir, relative)  
            os.makedirs(os.path.dirname(local_file), exist_ok=True)
            s3.download_file(bucket, key, local_file)


def ensure_data_ready() -> None:
    """
    Called once at server startup via FastAPI lifespan.
    Downloads ChromaDB + knowledge graph from S3
    """
    os.makedirs(CACHE_DIR, exist_ok=True)
    s3 = _get_s3_client()
    bucket = os.environ.get("S3_BUCKET", S3_BUCKET)

    # ChromaDB ─
    if not os.path.exists(CHROMA_DB_PATH) or not os.listdir(CHROMA_DB_PATH):
        print("Downloading ChromaDB from S3...")
        download_from_s3(S3_CHROMA_PREFIX, CHROMA_DB_PATH)
        print("✓ ChromaDB ready")
    else:
        print("✓ ChromaDB already cached locally")

    # Knowledge Graph 
    if not os.path.exists(GRAPH_PATH):
        print("Downloading knowledge graph from S3...")
        s3.download_file(bucket, S3_GRAPH_KEY, GRAPH_PATH)
        print("✓ Knowledge graph ready")
    else:
        print("✓ Knowledge graph already cached locally")


def get_pdf_url(source_filename: str, folder: str) -> str:
    """
    Returns a public S3 URL for a source PDF.           
    Used in citations to produce clickable links        .   
    """        
    bucket = os.environ.get("S3_BUCKET", S3_BUCKET)
    region = os.environ.get("AWS_REGION", AWS_REGION)
    return (
        f"https://{bucket}.s3.{region}.amazonaws.com"
        f"/{S3_PDF_PREFIX}/{folder}/{source_filename}"
    )