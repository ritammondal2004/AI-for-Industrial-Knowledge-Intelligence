
# backend/storage/s3_operations.py

import boto3, os
                   
LOCAL_CACHE = "data/cache"
           
def download_from_s3(bucket, s3_prefix, local_dir):
    # Download a folder or file from S3 to local disk.
    s3 = boto3.client('s3',
        region_name=os.environ["AWS_REGION"],           
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"]
    )   
    paginator = s3.get_paginator('list_objects_v2')
    for page in paginator.paginate(Bucket=bucket, Prefix=s3_prefix):
        for obj in page.get('Contents', []):
            key = obj['Key']
            relative = key[len(s3_prefix):]
            if not relative:
                continue
            local_file = os.path.join(local_dir, relative)
            os.makedirs(os.path.dirname(local_file), exist_ok=True)
            s3.download_file(bucket, key, local_file)

def ensure_data_ready():
    """
    Called once at server startup via FastAPI lifespan.
    Downloads ChromaDB + graph from S3 if not already cached locally.
    """
    chroma_local = os.path.join(LOCAL_CACHE, "chroma_db")
    graph_local  = os.path.join(LOCAL_CACHE, "knowledge_graph.gpickle")
    bucket       = os.environ["S3_BUCKET"]
                                          
    if not os.path.exists(chroma_local) or not os.listdir(chroma_local):
        print("Downloading ChromaDB from S3...")
        download_from_s3(bucket, "data/chroma_db/", chroma_local)
        print("✓ ChromaDB ready")         
    else:                                 
        print("✓ ChromaDB already cached locally")
                               
    if not os.path.exists(graph_local): 
                              
        print("Downloading knowledge graph from S3...")
        os.makedirs(LOCAL_CACHE, exist_ok=True) 

        boto3.client('s3',
            region_name=os.environ["AWS_REGION"], 
            aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
            aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"]
        ).download_file(bucket, "data/knowledge_graph.gpickle", graph_local)
        print("✓ Knowledge graph ready")
    else:
        print("✓ Knowledge graph already cached locally")

def get_pdf_url(source_filename, folder):
    """
    Returns a public S3 URL for a source PDF.
    Used in citations to give clickable links.
    """
    bucket = os.environ["S3_BUCKET"]     
    region = os.environ.get("AWS_REGION", "eu-north-1")
    return f"https://{bucket}.s3.{region}.amazonaws.com/data/raw_pdfs/{folder}/{source_filename}"