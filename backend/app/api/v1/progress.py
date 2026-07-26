import uuid
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Document, Roadmap, QuizAttempt, FlashcardSet, Flashcard, Message, Conversation, LearningStreak

router = APIRouter(prefix="/api/v1/progress", tags=["progress"])


async def record_activity(db: AsyncSession, user_id: uuid.UUID, activity_type: str):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(LearningStreak).where(LearningStreak.user_id == user_id, LearningStreak.date == today)
    )
    streak = result.scalar_one_or_none()
    if not streak:
        streak = LearningStreak(user_id=user_id, date=today, documents_studied=0, quizzes_taken=0)
        db.add(streak)
    if activity_type == "document":
        streak.documents_studied += 1
    elif activity_type == "quiz":
        streak.quizzes_taken += 1
    await db.commit()


def _compute_streak(dates: list[date]) -> tuple[int, int]:
    if not dates:
        return 0, 0
    unique = sorted(set(dates), reverse=True)
    longest = 1
    current = 1
    for i in range(1, len(unique)):
        if (unique[i - 1] - unique[i]).days == 1:
            current += 1
            longest = max(longest, current)
        else:
            current = 1
    # current streak: count from today backward
    streak_dates = set(unique)
    current_streak = 0
    check = date.today()
    while check in streak_dates:
        current_streak += 1
        check -= timedelta(days=1)
    return current_streak, longest


@router.get("/dashboard")
async def dashboard(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = user.id

    doc_count = (await db.execute(select(func.count(Document.id)).where(Document.user_id == uid))).scalar() or 0
    quiz_count = (await db.execute(select(func.count(QuizAttempt.id)).where(QuizAttempt.user_id == uid))).scalar() or 0
    avg_score = (await db.execute(select(func.avg(QuizAttempt.score)).where(QuizAttempt.user_id == uid))).scalar() or 0
    msg_count = (
        await db.execute(
            select(func.count(Message.id)).where(
                Message.conversation_id == Conversation.id,
                Conversation.user_id == uid,
                Message.role == "user",
            )
        )
    ).scalar() or 0
    flashcard_count = (
        await db.execute(
            select(func.count(Flashcard.id)).where(
                Flashcard.set_id == FlashcardSet.id,
                FlashcardSet.user_id == uid,
            )
        )
    ).scalar() or 0
    roadmap_count = (await db.execute(select(func.count(Roadmap.id)).where(Roadmap.user_id == uid))).scalar() or 0
    roadmap_total = (await db.execute(select(func.sum(Roadmap.total_nodes)).where(Roadmap.user_id == uid))).scalar() or 0
    roadmap_done = (await db.execute(select(func.sum(Roadmap.completed_nodes)).where(Roadmap.user_id == uid))).scalar() or 0

    percent = round((roadmap_done / roadmap_total * 100) if roadmap_total else 0)

    efforts = await db.execute(
        select(LearningStreak).where(LearningStreak.user_id == uid).order_by(LearningStreak.date.desc()).limit(7)
    )
    recent_activity = [
        {
            "date": e.date.isoformat(),
            "documents_studied": e.documents_studied,
            "quizzes_taken": e.quizzes_taken,
        }
        for e in efforts.scalars().all()
    ]

    return {
        "stats": {
            "total_documents": doc_count,
            "total_quizzes": quiz_count,
            "average_score": round(avg_score, 1) if avg_score else 0,
            "total_messages": msg_count,
            "total_flashcards": flashcard_count,
            "active_roadmaps": roadmap_count,
            "roadmap_progress_percent": percent,
        },
        "recent_activity": recent_activity,
    }


@router.get("/streak")
async def streak(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = user.id
    results = await db.execute(
        select(LearningStreak.date).where(LearningStreak.user_id == uid).order_by(LearningStreak.date.desc())
    )
    dates = [r[0].date() for r in results.all()]
    current, longest = _compute_streak(dates)

    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    result = await db.execute(
        select(LearningStreak).where(LearningStreak.user_id == uid, LearningStreak.date == today)
    )
    today_entry = result.scalar_one_or_none()

    return {
        "current_streak": current,
        "longest_streak": longest,
        "today": {
            "documents_studied": today_entry.documents_studied if today_entry else 0,
            "quizzes_taken": today_entry.quizzes_taken if today_entry else 0,
        },
    }


@router.get("/topics")
async def topics(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    uid = user.id
    result = await db.execute(
        select(
            Document.id,
            Document.title,
            func.count(QuizAttempt.id),
            func.avg(QuizAttempt.score),
        )
        .select_from(Document)
        .outerjoin(QuizAttempt, QuizAttempt.user_id == uid)
        .where(Document.user_id == uid)
        .group_by(Document.id, Document.title)
        .order_by(Document.title)
    )
    rows = result.all()
    return {
        "topics": [
            {
                "document_id": str(r[0]),
                "document_title": r[1],
                "quizzes_taken": r[2],
                "average_score": round(r[3], 1) if r[3] else None,
            }
            for r in rows
        ],
    }
