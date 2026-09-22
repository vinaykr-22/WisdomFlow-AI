from pathlib import Path

def _get_client():
    import chromadb
    from chromadb.config import Settings
    return chromadb.PersistentClient(path=str(_chroma_path), settings=Settings(anonymized_telemetry=False))


def _get_or_create_collection(name: str):
    import chromadb
    client = _get_client()
    try:
        return client.get_collection(name)
    except chromadb.errors.NotFoundError:
        return client.create_collection(name)


def index_document(doc_id: str, chunks: list[str], embeddings: list[list[float]]):
    coll = _get_or_create_collection("documents")
    ids = [f"{doc_id}_{i}" for i in range(len(chunks))]
    # remove old chunks for this doc if re-indexing
    existing = coll.get(where={"doc_id": doc_id})
    if existing["ids"]:
        coll.delete(ids=existing["ids"])
    coll.add(ids=ids, embeddings=embeddings, metadatas=[{"doc_id": doc_id}] * len(chunks), documents=chunks)


def search(query_emb: list[float], doc_id: str | None = None, top_k: int = 5) -> list[str]:
    coll = _get_or_create_collection("documents")
    where = {"doc_id": doc_id} if doc_id else None
    results = coll.query(query_embeddings=[query_emb], n_results=top_k, where=where)
    return results["documents"][0] if results["documents"] else []


def delete_document(doc_id: str):
    coll = _get_or_create_collection("documents")
    existing = coll.get(where={"doc_id": doc_id})
    if existing["ids"]:
        coll.delete(ids=existing["ids"])
