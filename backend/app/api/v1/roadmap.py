import asyncio
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Document, Roadmap, RoadmapNode
from app.processors.extractor import extract_text
from app.ai.llm import generate_roadmap

router = APIRouter(prefix="/api/v1/roadmap", tags=["roadmap"])


class GenerateRequest(BaseModel):
    document_id: str | None = None
    topic_name: str | None = None


class UpdateNodeRequest(BaseModel):
    status: str  # not_started / in_progress / completed


@router.post("/generate")
async def generate(
    body: GenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not body.document_id and not body.topic_name:
        raise HTTPException(status_code=400, detail="Provide document_id or topic_name")

    text = None
    doc = None
    if body.document_id:
        result = await db.execute(
            select(Document).where(Document.id == uuid.UUID(body.document_id), Document.user_id == user.id)
        )
        doc = result.scalar_one_or_none()
        if not doc:
            raise HTTPException(status_code=404, detail="Document not found")
        text = extract_text(doc.file_path)
        if not text.strip():
            raise HTTPException(status_code=400, detail="No text in document")

    roadmap_data = await asyncio.to_thread(generate_roadmap, text=text, topic_name=body.topic_name)

    roadmap = Roadmap(
        user_id=user.id,
        document_id=doc.id if doc else None,
        topic_name=body.topic_name,
        title=roadmap_data.get("title", "Learning Roadmap"),
        description=roadmap_data.get("description", ""),
        total_nodes=len(roadmap_data.get("nodes", [])),
        completed_nodes=0,
        estimated_total_hours=roadmap_data.get("estimated_hours", 0),
    )
    db.add(roadmap)
    await db.commit()
    await db.refresh(roadmap)

    nodes = roadmap_data.get("nodes", [])
    for i, node in enumerate(nodes):
        db.add(RoadmapNode(
            roadmap_id=roadmap.id,
            node_id=node["node_id"],
            parent_node_id=node.get("parent_node_id"),
            title=node["title"],
            description=node.get("description", ""),
            node_type=node.get("type", "basic"),
            difficulty=node.get("difficulty", "medium"),
            estimated_minutes=node.get("estimated_minutes", 30),
            status="not_started",
            prerequisites=node.get("prerequisites", []),
            resources=node.get("resources", []),
            sort_order=i,
        ))
    await db.commit()

    return {
        "id": str(roadmap.id),
        "title": roadmap.title,
        "total_nodes": roadmap.total_nodes,
        "estimated_total_hours": roadmap.estimated_total_hours,
    }


@router.get("/lists")
async def list_roadmaps(
    page: int = 1,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Roadmap).where(Roadmap.user_id == user.id).order_by(Roadmap.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    roadmaps = result.scalars().all()
    return {
        "roadmaps": [
            {
                "id": str(r.id),
                "title": r.title,
                "topic_name": r.topic_name,
                "total_nodes": r.total_nodes,
                "completed_nodes": r.completed_nodes,
                "estimated_total_hours": r.estimated_total_hours,
                "created_at": r.created_at.isoformat(),
            }
            for r in roadmaps
        ],
        "total": len(roadmaps),
        "page": page,
    }


@router.get("/{roadmap_id}")
async def get_roadmap(
    roadmap_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Roadmap).where(Roadmap.id == roadmap_id, Roadmap.user_id == user.id)
    )
    roadmap = result.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    result = await db.execute(
        select(RoadmapNode).where(RoadmapNode.roadmap_id == roadmap_id).order_by(RoadmapNode.sort_order)
    )
    nodes = result.scalars().all()

    return {
        "id": str(roadmap.id),
        "title": roadmap.title,
        "description": roadmap.description,
        "topic_name": roadmap.topic_name,
        "total_nodes": roadmap.total_nodes,
        "completed_nodes": roadmap.completed_nodes,
        "estimated_total_hours": roadmap.estimated_total_hours,
        "nodes": [
            {
                "id": str(n.id),
                "node_id": n.node_id,
                "parent_node_id": n.parent_node_id,
                "title": n.title,
                "description": n.description,
                "type": n.node_type,
                "difficulty": n.difficulty,
                "estimated_minutes": n.estimated_minutes,
                "status": n.status,
                "prerequisites": n.prerequisites,
                "resources": n.resources,
            }
            for n in nodes
        ],
    }


@router.patch("/{roadmap_id}/nodes/{node_id}")
async def update_node(
    roadmap_id: uuid.UUID,
    node_id: str,
    body: UpdateNodeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.status not in ("not_started", "in_progress", "completed"):
        raise HTTPException(status_code=400, detail="Invalid status")

    result = await db.execute(
        select(Roadmap).where(Roadmap.id == roadmap_id, Roadmap.user_id == user.id)
    )
    roadmap = result.scalar_one_or_none()
    if not roadmap:
        raise HTTPException(status_code=404, detail="Roadmap not found")

    result = await db.execute(
        select(RoadmapNode).where(RoadmapNode.roadmap_id == roadmap_id, RoadmapNode.node_id == node_id)
    )
    node = result.scalar_one_or_none()
    if not node:
        raise HTTPException(status_code=404, detail="Node not found")

    was_completed = node.status == "completed"
    node.status = body.status
    
    xp_awarded = 0
    leveled_up = False
    
    if body.status == "completed" and not was_completed:
        # Award XP based on difficulty
        xp_map = {"easy": 10, "medium": 20, "hard": 40}
        xp_awarded = xp_map.get(node.difficulty, 20)
        
        user.xp += xp_awarded
        while user.xp >= user.level * 100:
            user.xp -= user.level * 100
            user.level += 1
            leveled_up = True
            
    await db.commit()

    # update completed count
    result = await db.execute(
        select(RoadmapNode).where(RoadmapNode.roadmap_id == roadmap_id, RoadmapNode.status == "completed")
    )
    roadmap.completed_nodes = len(result.scalars().all())
    await db.commit()
    await db.refresh(user)

    return {
        "node_id": node.node_id, 
        "status": node.status, 
        "completed_nodes": roadmap.completed_nodes,
        "xp_awarded": xp_awarded,
        "leveled_up": leveled_up,
        "user_xp": user.xp,
        "user_level": user.level
    }
