import asyncio
import uuid

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Document, RevisionPlan, QuizAttempt, FlashcardSet, Flashcard, Roadmap, RoadmapNode
from app.ai.llm import generate_revision_plan

router = APIRouter(prefix="/api/v1/revision", tags=["revision"])


class GenerateRequest(BaseModel):
    plan_type: str = "daily"  # daily / weekly


@router.post("/generate")
async def generate(
    body: GenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.plan_type not in ("daily", "weekly"):
        return {"error": "plan_type must be 'daily' or 'weekly'"}

    uid = user.id

    # gather doc performance
    doc_rows = await db.execute(
        select(
            Document.title,
            func.count(QuizAttempt.id),
            func.avg(QuizAttempt.score),
        )
        .select_from(Document)
        .outerjoin(QuizAttempt, QuizAttempt.user_id == uid)
        .where(Document.user_id == uid)
        .group_by(Document.title)
        .order_by(Document.title)
    )
    doc_perf = "\n".join(
        f"- {title}: {q_count} quizzes, avg {round(avg, 1)}%"
        for title, q_count, avg in doc_rows.all()
        if q_count
    ) or "No quiz data"

    # gather flashcard review status
    fset_rows = await db.execute(
        select(FlashcardSet.title, FlashcardSet.card_count).where(FlashcardSet.user_id == uid)
    )
    fcards = "\n".join(
        f"- {title}: {count} cards"
        for title, count in fset_rows.all()
    ) or "No flashcard sets"

    # gather roadmap progress
    rmap_rows = await db.execute(
        select(Roadmap.title, Roadmap.total_nodes, Roadmap.completed_nodes).where(Roadmap.user_id == uid)
    )
    rmaps = "\n".join(
        f"- {title}: {completed}/{total} nodes completed"
        for title, total, completed in rmap_rows.all()
    ) or "No roadmaps"

    # avg score across all attempts
    avg = (await db.execute(
        select(func.avg(QuizAttempt.score)).where(QuizAttempt.user_id == uid)
    )).scalar() or 0.0

    plan_data = await asyncio.to_thread(
        generate_revision_plan,
        body.plan_type,
        doc_perf,
        fcards,
        rmaps,
        avg,
    )

    # deactivate old plans
    old = (await db.execute(
        select(RevisionPlan).where(RevisionPlan.user_id == uid, RevisionPlan.is_active == True)
    )).scalars().all()
    for p in old:
        p.is_active = False

    plan = RevisionPlan(
        user_id=uid,
        plan_type=body.plan_type,
        title=plan_data.get("title", f"{body.plan_type.title()} Revision Plan"),
        structure=plan_data,
        is_active=True,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    return {
        "id": str(plan.id),
        "title": plan.title,
        "plan_type": plan.plan_type,
        "structure": plan.structure,
        "created_at": plan.created_at.isoformat(),
    }


@router.get("/plan")
async def get_active_plan(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RevisionPlan)
        .where(RevisionPlan.user_id == user.id, RevisionPlan.is_active == True)
        .order_by(RevisionPlan.created_at.desc())
        .limit(1)
    )
    plan = result.scalar_one_or_none()
    if not plan:
        return {"plan": None}
    return {
        "plan": {
            "id": str(plan.id),
            "title": plan.title,
            "plan_type": plan.plan_type,
            "structure": plan.structure,
            "created_at": plan.created_at.isoformat(),
        }
    }


@router.get("/plans")
async def list_plans(
    page: int = 1,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(RevisionPlan)
        .where(RevisionPlan.user_id == user.id)
        .order_by(RevisionPlan.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    plans = result.scalars().all()
    return {
        "plans": [
            {
                "id": str(p.id),
                "title": p.title,
                "plan_type": p.plan_type,
                "is_active": p.is_active,
                "item_count": len(p.structure.get("items", [])),
                "total_minutes": p.structure.get("total_estimated_minutes", 0),
                "created_at": p.created_at.isoformat(),
            }
            for p in plans
        ],
        "total": len(plans),
        "page": page,
    }
