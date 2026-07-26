import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Document, FlashcardSet, Flashcard
from app.processors.extractor import extract_text
from app.ai.llm import generate_flashcards

router = APIRouter(prefix="/api/v1/flashcards", tags=["flashcards"])


class GenerateRequest(BaseModel):
    document_id: str
    count: int = 10


class UpdateCardRequest(BaseModel):
    is_bookmarked: bool | None = None


@router.post("/generate")
async def generate(
    body: GenerateRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == uuid.UUID(body.document_id), Document.user_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    text = extract_text(doc.file_path)
    if not text.strip():
        raise HTTPException(status_code=400, detail="No text in document")

    cards_data = generate_flashcards(text, body.count)

    card_set = FlashcardSet(
        user_id=user.id,
        document_id=doc.id,
        title=f"{doc.title} — flashcards",
        card_count=len(cards_data),
    )
    db.add(card_set)
    await db.commit()
    await db.refresh(card_set)

    for c in cards_data:
        db.add(Flashcard(set_id=card_set.id, front=c["front"], back=c["back"], hint=c.get("hint")))
    await db.commit()

    return {"id": str(card_set.id), "card_count": len(cards_data)}


@router.get("/sets")
async def list_sets(
    page: int = 1,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(FlashcardSet)
        .where(FlashcardSet.user_id == user.id)
        .order_by(FlashcardSet.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    sets = result.scalars().all()
    return {
        "sets": [
            {"id": str(s.id), "title": s.title, "card_count": s.card_count, "created_at": s.created_at.isoformat()}
            for s in sets
        ],
        "total": len(sets),
        "page": page,
    }


@router.get("/sets/{set_id}")
async def get_set(
    set_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(FlashcardSet).where(FlashcardSet.id == set_id, FlashcardSet.user_id == user.id))
    card_set = result.scalar_one_or_none()
    if not card_set:
        raise HTTPException(status_code=404, detail="Set not found")

    result = await db.execute(
        select(Flashcard).where(Flashcard.set_id == set_id)
    )
    cards = result.scalars().all()
    return {
        "id": str(card_set.id),
        "title": card_set.title,
        "cards": [
            {"id": str(c.id), "front": c.front, "back": c.back, "hint": c.hint, "is_bookmarked": c.is_bookmarked}
            for c in cards
        ],
    }


@router.patch("/{card_id}")
async def update_card(
    card_id: uuid.UUID,
    body: UpdateCardRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Flashcard).where(Flashcard.id == card_id)
    )
    card = result.scalar_one_or_none()
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")

    if body.is_bookmarked is not None:
        card.is_bookmarked = body.is_bookmarked
    await db.commit()
    return {"id": str(card.id), "is_bookmarked": card.is_bookmarked}
