import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Document, Quiz, QuizQuestion, QuizAttempt
from app.processors.extractor import extract_text
from app.ai.llm import generate_quiz
from app.api.v1.progress import record_activity

router = APIRouter(prefix="/api/v1/quizzes", tags=["quizzes"])


class GenerateRequest(BaseModel):
    document_id: str
    difficulty: str = "medium"
    question_count: int = 5


class SubmitRequest(BaseModel):
    answers: dict  # {question_id: answer_string}


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

    questions_data = generate_quiz(text, body.difficulty, body.question_count)

    quiz = Quiz(
        user_id=user.id,
        document_id=doc.id,
        title=f"{doc.title} — {body.difficulty} quiz",
        difficulty=body.difficulty,
        question_count=len(questions_data),
    )
    db.add(quiz)
    await db.commit()
    await db.refresh(quiz)

    for i, q in enumerate(questions_data):
        db.add(QuizQuestion(
            quiz_id=quiz.id,
            question_index=i,
            question_type=q.get("question_type", "mcq"),
            question=q["question"],
            options=q.get("options"),
            correct_answer=q["correct_answer"],
            explanation=q.get("explanation", ""),
        ))
    await db.commit()

    return {"id": str(quiz.id), "question_count": len(questions_data)}


@router.get("")
async def list_quizzes(
    page: int = 1,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Quiz).where(Quiz.user_id == user.id).order_by(Quiz.created_at.desc()).offset((page - 1) * limit).limit(limit)
    )
    quizzes = result.scalars().all()
    return {
        "quizzes": [
            {"id": str(q.id), "title": q.title, "difficulty": q.difficulty, "question_count": q.question_count, "created_at": q.created_at.isoformat()}
            for q in quizzes
        ],
        "total": len(quizzes),
        "page": page,
    }


@router.get("/{quiz_id}")
async def get_quiz(
    quiz_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id, Quiz.user_id == user.id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz_id).order_by(QuizQuestion.question_index)
    )
    questions = result.scalars().all()

    return {
        "id": str(quiz.id),
        "title": quiz.title,
        "difficulty": quiz.difficulty,
        "questions": [
            {
                "id": str(q.id),
                "question_index": q.question_index,
                "question_type": q.question_type,
                "question": q.question,
                "options": q.options,
            }
            for q in questions
        ],
    }


@router.post("/{quiz_id}/submit")
async def submit_quiz(
    quiz_id: uuid.UUID,
    body: SubmitRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Quiz).where(Quiz.id == quiz_id, Quiz.user_id == user.id))
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    result = await db.execute(
        select(QuizQuestion).where(QuizQuestion.quiz_id == quiz_id)
    )
    questions = result.scalars().all()

    correct = 0
    results = []
    for q in questions:
        user_answer = body.answers.get(str(q.id), "")
        is_correct = user_answer.strip().lower() == q.correct_answer.strip().lower()
        if is_correct:
            correct += 1
        results.append({
            "question_id": str(q.id),
            "question": q.question,
            "your_answer": user_answer,
            "correct_answer": q.correct_answer,
            "is_correct": is_correct,
            "explanation": q.explanation,
        })

    score = (correct / len(questions) * 100) if questions else 0

    attempt = QuizAttempt(quiz_id=quiz.id, user_id=user.id, score=score, answers=body.answers)
    db.add(attempt)
    await db.commit()

    await record_activity(db, user.id, "quiz")

    return {"score": score, "correct": correct, "total": len(questions), "results": results}
