import asyncio
import uuid
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Document, RoadmapNode, Roadmap
from app.ai.embeddings import embed
from app.ai.vectorstore import search as vector_search

router = APIRouter(prefix="/api/v1/search", tags=["search"])


@router.get("")
async def search_all(
    q: str = Query(..., min_length=1, description="Search query string"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    query_term = f"%{q.strip()}%"

    # 1. Search Documents
    doc_result = await db.execute(
        select(Document)
        .where(
            Document.user_id == user.id,
            or_(
                Document.title.ilike(query_term),
                Document.original_filename.ilike(query_term),
            ),
        )
        .limit(10)
    )
    docs = doc_result.scalars().all()

    # 2. Search Roadmaps & Roadmap Nodes
    roadmap_result = await db.execute(
        select(Roadmap)
        .where(
            Roadmap.user_id == user.id,
            or_(
                Roadmap.title.ilike(query_term),
                Roadmap.description.ilike(query_term),
            ),
        )
        .limit(10)
    )
    roadmaps = roadmap_result.scalars().all()

    node_result = await db.execute(
        select(RoadmapNode, Roadmap.title.label("roadmap_title"))
        .join(Roadmap, Roadmap.id == RoadmapNode.roadmap_id)
        .where(
            Roadmap.user_id == user.id,
            or_(
                RoadmapNode.title.ilike(query_term),
                RoadmapNode.description.ilike(query_term),
            ),
        )
        .limit(10)
    )
    nodes = node_result.all()

    # 3. Vector Search for matching document chunks
    vector_matches = []
    try:
        query_emb = await asyncio.to_thread(embed, q)
        chunks = await asyncio.to_thread(vector_search, query_emb, n_results=5)
        for chunk in chunks:
            vector_matches.append({"content_snippet": chunk[:300]})
    except Exception:
        pass

    return {
        "query": q,
        "results": {
            "documents": [
                {
                    "id": str(d.id),
                    "title": d.title,
                    "filename": d.original_filename,
                    "file_type": d.file_type,
                    "created_at": d.created_at.isoformat(),
                }
                for d in docs
            ],
            "roadmaps": [
                {
                    "id": str(r.id),
                    "title": r.title,
                    "description": r.description,
                    "created_at": r.created_at.isoformat(),
                }
                for r in roadmaps
            ],
            "nodes": [
                {
                    "id": str(n[0].id),
                    "roadmap_id": str(n[0].roadmap_id),
                    "roadmap_title": n[1],
                    "title": n[0].title,
                    "description": n[0].description,
                    "status": n[0].status,
                }
                for n in nodes
            ],
            "vector_snippets": vector_matches,
        },
    }
