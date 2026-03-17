import os
import uuid
from qdrant_client import QdrantClient
from qdrant_client.http import models
from brain import LLM
from config import MODEL_NAME, dim_size

def upsert_to_qdrant(payload: dict):
    """
    Takes the deal analysis payload, generates embeddings, 
    and stores it in Qdrant.
    """
    # 1. Initialize Gemini Embeddings
    llm_factory = LLM(provider=MODEL_NAME)
    embeddings_model = llm_factory.get_embedding_model()
    
    # 2. Initialize Qdrant Client
    client = QdrantClient(
        url=os.getenv("QDRANT_URL"), 
        api_key=os.getenv("QDRANT_API_KEY")
    )
    
    collection_name = "deal_summaries"

    # 3. Generate the Vector first to get the dimension
    text_to_vectorize = payload["content"]
    vector = embeddings_model.embed_query(text_to_vectorize)
    dim = len(vector)

    # 4. Create or recreate collection if dimension mismatch
    if client.collection_exists(collection_name):
        collection_info = client.get_collection(collection_name)
        current_dim = collection_info.config.params.vectors.size
        if current_dim != dim:
            print(f"Dimension mismatch: collection has {current_dim}, vector has {dim}. Recreating collection.")
            client.delete_collection(collection_name)
            client.create_collection(
                collection_name=collection_name,
                vectors_config=models.VectorParams(size=dim, distance=models.Distance.COSINE),
            )
    else:
        client.create_collection(
            collection_name=collection_name,
            vectors_config=models.VectorParams(size=dim, distance=models.Distance.COSINE),
        )

    # 5. Upsert into Qdrant
    client.upsert(
        collection_name=collection_name,
        points=[
            models.PointStruct(
                id=str(uuid.uuid4()), # Unique ID for this entry
                vector=vector,
                payload=payload["metadata"] # Store our Pydantic fields here
            )
        ]
    )
    print(f"Successfully upserted Deal {payload['metadata']['deal_id']} to Qdrant.")

# --- Integration Example ---
if __name__ == "__main__":
    # This is the result from our previous 'summary_generation' function
    sample_payload = {
        "content": "MedCorp Moscow and BioPharma Mumbai are stuck on INR-RUB rates.",
        "metadata": {
            "deal_id": "IND-RUS-2026-0042",
            "sector": "Pharmaceuticals",
            "fingerprints": ["CurrencyRisk", "SberbankHedging"],
            "risk_level": "High",
            "recommended_action": "Propose FX-Option-B"
        }
    }
    
    upsert_to_qdrant(sample_payload)