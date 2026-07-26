import asyncio
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from app.ai.embeddings import embed
from app.ai.llm import chat_completion
from app.ai.vectorstore import search
from app.database import get_db, async_session
from app.dependencies import get_current_user
from app.models import User, Conversation, Message, Document
from app.processors.extractor import extract_text
from app.api.v1.progress import record_activity

router = APIRouter(prefix="/api/v1/chat", tags=["chat"])


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None
    document_id: str | None = None
    document_ids: list[str] | None = None


@router.post("")
async def chat(
    body: ChatRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    target_doc_ids: list[str] = []
    if body.document_ids:
        target_doc_ids = [d for d in body.document_ids if d]
    elif body.document_id:
        target_doc_ids = [body.document_id]

    if not body.conversation_id:
        primary_doc = uuid.UUID(target_doc_ids[0]) if target_doc_ids else None
        conv = Conversation(
            user_id=user.id,
            document_id=primary_doc,
            document_ids=target_doc_ids if target_doc_ids else None,
        )
        db.add(conv)
        await db.commit()
        await db.refresh(conv)
    else:
        result = await db.execute(
            select(Conversation).where(Conversation.id == uuid.UUID(body.conversation_id), Conversation.user_id == user.id)
        )
        conv = result.scalar_one_or_none()
        if not conv:
            raise HTTPException(status_code=404, detail="Conversation not found")
        if not target_doc_ids and conv.document_ids:
            target_doc_ids = conv.document_ids
        elif not target_doc_ids and conv.document_id:
            target_doc_ids = [str(conv.document_id)]

    # save user message
    db.add(Message(conversation_id=conv.id, role="user", content=body.message))
    await db.commit()

    await record_activity(db, user.id, "chat")

    # Multi-document RAG context
    context = ""
    if target_doc_ids:
        query_emb = embed(body.message)
        context_chunks: list[str] = []

        for d_id in target_doc_ids:
            chunks = search(query_emb, doc_id=d_id)
            if chunks:
                context_chunks.extend(chunks)
            else:
                # Fallback to direct raw text reading if vector store has no chunks
                try:
                    doc_result = await db.execute(
                        select(Document).where(Document.id == uuid.UUID(d_id), Document.user_id == user.id)
                    )
                    doc = doc_result.scalar_one_or_none()
                    if doc:
                        text = await asyncio.to_thread(extract_text, doc.file_path)
                        context_chunks.append(f"--- Document: {doc.title} ---\n{text[:5000]}")
                except Exception:
                    pass

        if context_chunks:
            context = "\n\n".join(context_chunks)

    # message history
    result = await db.execute(
        select(Message).where(Message.conversation_id == conv.id).order_by(Message.created_at.desc()).limit(10)
    )
    history = list(reversed(result.scalars().all()))
    messages = [{"role": m.role, "content": m.content} for m in history]

    async def event_stream():
        try:
            # run sync LLM stream in thread pool so we can use async DB
            def _stream():
                return chat_completion(messages, context=context, stream=True)

            gen = await asyncio.to_thread(_stream)
            full = ""
            for token in gen:
                full += token
                yield f"data: {json.dumps({'token': token})}\n\n"

            # save assistant message in a fresh async session
            async with async_session() as s:
                s.add(Message(conversation_id=conv.id, role="assistant", content=full))
                await s.commit()

            yield f"data: {json.dumps({'done': True, 'conversation_id': str(conv.id)})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/conversations")
async def list_conversations(
    page: int = 1,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    convs = result.scalars().all()
    return {
        "conversations": [
            {
                "id": str(c.id),
                "title": c.title,
                "document_id": str(c.document_id) if c.document_id else None,
                "document_ids": c.document_ids or ([str(c.document_id)] if c.document_id else []),
                "created_at": c.created_at.isoformat(),
            }
            for c in convs
        ],
        "total": len(convs),
        "page": page,
    }


@router.get("/conversations/{conv_id}")
async def get_conversation(
    conv_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Conversation).where(Conversation.id == conv_id, Conversation.user_id == user.id)
    )
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")

    result = await db.execute(
        select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at)
    )
    messages = result.scalars().all()
    return {
        "id": str(conv.id),
        "title": conv.title,
        "document_id": str(conv.document_id) if conv.document_id else None,
        "document_ids": conv.document_ids or ([str(conv.document_id)] if conv.document_id else []),
        "messages": [
            {"id": str(m.id), "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
            for m in messages
        ],
    }
