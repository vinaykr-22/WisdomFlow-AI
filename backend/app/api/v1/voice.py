import asyncio
import json
import re
import uuid
from pathlib import Path

import edge_tts
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db, async_session
from app.dependencies import get_current_user
from app.models import User, Document, VoiceSession
from app.ai.embeddings import embed
from app.ai.llm import chat_completion
from app.ai.vectorstore import search
from app.processors.extractor import extract_text
from app.speech.tts import text_to_speech
from app.speech.stt import speech_to_text

router = APIRouter(prefix="/api/v1/voice", tags=["voice"])

VOICE_DIR = Path(__file__).resolve().parent.parent.parent.parent / settings.upload_dir / "voice"


def clean_voice_text(text: str) -> str:
    """Strip markdown formatting symbols for clean voice output and natural TTS generation."""
    if not text:
        return ""
    # Remove divider lines like === or ---
    text = re.sub(r'^[=\-_]{2,}\s*$', '', text, flags=re.MULTILINE)
    # Remove markdown headers like # Header
    text = re.sub(r'^#+\s*', '', text, flags=re.MULTILINE)
    # Remove bold/italic markers
    text = re.sub(r'[*_]{1,3}', '', text)
    # Remove code blocks/backticks
    text = re.sub(r'`+', '', text)
    # Replace list markers at line start with clean spacing
    text = re.sub(r'^\s*[\*\-\+]\s+', '', text, flags=re.MULTILINE)
    # Normalize multiple blank lines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


class TextRequest(BaseModel):
    message: str
    document_id: str | None = None


@router.post("/text")
async def voice_text(
    body: TextRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    VOICE_DIR.mkdir(parents=True, exist_ok=True)

    context = ""
    if body.document_id:
        query_emb = embed(body.message)
        chunks = search(query_emb, doc_id=body.document_id)
        if not chunks:
            doc_result = await db.execute(
                select(Document).where(Document.id == uuid.UUID(body.document_id), Document.user_id == user.id)
            )
            doc = doc_result.scalar_one_or_none()
            if doc:
                try:
                    text = await asyncio.to_thread(extract_text, doc.file_path)
                    context = text[:10000]
                except Exception:
                    pass
        else:
            context = "\n\n".join(chunks)

    messages = [{"role": "user", "content": body.message}]
    response_text = await asyncio.to_thread(chat_completion, messages, context=context, voice_mode=True)
    response_text = clean_voice_text(response_text)

    audio_path = await text_to_speech(response_text, str(VOICE_DIR))
    audio_filename = Path(audio_path).name

    db.add(VoiceSession(user_id=user.id, document_id=uuid.UUID(body.document_id) if body.document_id else None, message_count=1))
    await db.commit()

    return {
        "response_text": response_text,
        "audio_url": f"/uploads/voice/{audio_filename}",
    }


@router.post("/chat")
async def voice_chat(
    audio: UploadFile = File(...),
    document_id: str = Form(None),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    VOICE_DIR.mkdir(parents=True, exist_ok=True)

    audio_input_path = VOICE_DIR / f"input_{uuid.uuid4()}.wav"
    content = await audio.read()
    audio_input_path.write_bytes(content)

    transcript = await asyncio.to_thread(speech_to_text, str(audio_input_path))
    audio_input_path.unlink(missing_ok=True)

    if not transcript.strip():
        raise HTTPException(status_code=400, detail="No speech detected")

    context = ""
    if document_id:
        query_emb = embed(transcript)
        chunks = search(query_emb, doc_id=document_id)
        if not chunks:
            doc_result = await db.execute(
                select(Document).where(Document.id == uuid.UUID(document_id), Document.user_id == user.id)
            )
            doc = doc_result.scalar_one_or_none()
            if doc:
                try:
                    text = await asyncio.to_thread(extract_text, doc.file_path)
                    context = text[:10000]
                except Exception:
                    pass
        else:
            context = "\n\n".join(chunks)

    messages = [{"role": "user", "content": transcript}]
    response_text = await asyncio.to_thread(chat_completion, messages, context=context, voice_mode=True)
    response_text = clean_voice_text(response_text)

    audio_path = await text_to_speech(response_text, str(VOICE_DIR))
    audio_filename = Path(audio_path).name

    db.add(VoiceSession(user_id=user.id, document_id=uuid.UUID(document_id) if document_id else None, message_count=1))
    await db.commit()

    return {
        "transcript": transcript,
        "response_text": response_text,
        "audio_url": f"/uploads/voice/{audio_filename}",
    }


@router.websocket("/ws")
async def voice_ws(websocket: WebSocket):
    await websocket.accept()
    token = websocket.query_params.get("token", "")
    document_id = websocket.query_params.get("document_id", "").strip() or None
    user_id = _validate_token(token)
    if not user_id:
        await websocket.send_json({"type": "error", "message": "Invalid token"})
        await websocket.close()
        return

    VOICE_DIR.mkdir(parents=True, exist_ok=True)
    session_messages: list[dict] = []

    try:
        while True:
            audio_data = await websocket.receive_bytes()

            # Immediately acknowledge so frontend can show "thinking"
            await websocket.send_json({"type": "thinking"})

            audio_path = VOICE_DIR / f"input_{uuid.uuid4()}.webm"
            audio_path.write_bytes(audio_data)

            transcript = await asyncio.to_thread(speech_to_text, str(audio_path))
            audio_path.unlink(missing_ok=True)

            if not transcript.strip():
                await websocket.send_json({"type": "error", "message": "No speech detected"})
                continue

            await websocket.send_json({"type": "transcript", "text": transcript})
            session_messages.append({"role": "user", "content": transcript})
            if len(session_messages) > 10:
                session_messages = session_messages[-10:]

            # Retrieve document RAG context if a document is selected
            context = ""
            if document_id:
                try:
                    query_emb = await asyncio.to_thread(embed, transcript)
                    chunks = await asyncio.to_thread(search, query_emb, doc_id=document_id)
                    if not chunks:
                        async with async_session() as db:
                            doc_result = await db.execute(
                                select(Document).where(
                                    Document.id == uuid.UUID(document_id),
                                    Document.user_id == uuid.UUID(user_id),
                                )
                            )
                            doc = doc_result.scalar_one_or_none()
                            if doc:
                                text = await asyncio.to_thread(extract_text, doc.file_path)
                                context = text[:10000]
                    else:
                        context = "\n\n".join(chunks)
                except Exception:
                    pass

            sentence_endings = {'.', '!', '?'}
            full_response_parts: list[str] = []
            sentence_buf: list[str] = []

            def _stream_llm():
                return chat_completion(
                    list(session_messages),
                    context=context,
                    stream=True,
                    voice_mode=True,
                )

            token_gen = await asyncio.to_thread(_stream_llm)

            async def _next_token(gen):
                """Get next token from sync generator in a thread."""
                def _get():
                    try:
                        return next(gen)
                    except StopIteration:
                        return None
                return await asyncio.to_thread(_get)

            while True:
                tok = await _next_token(token_gen)
                if tok is None:
                    break
                full_response_parts.append(tok)
                sentence_buf.append(tok)

                # Check if this token ends a sentence
                stripped = tok.rstrip()
                if stripped and stripped[-1] in sentence_endings:
                    sentence_text = clean_voice_text("".join(sentence_buf))
                    sentence_buf = []
                    if sentence_text:
                        communicate = edge_tts.Communicate(sentence_text, settings.tts_voice)
                        async for chunk in communicate.stream():
                            if chunk["type"] == "audio" and chunk["data"]:
                                await websocket.send_bytes(chunk["data"])
                        await websocket.send_json({"type": "sentence_done"})

            # Flush any remaining text that didn't end with punctuation
            remaining = clean_voice_text("".join(sentence_buf))
            if remaining:
                communicate = edge_tts.Communicate(remaining, settings.tts_voice)
                async for chunk in communicate.stream():
                    if chunk["type"] == "audio" and chunk["data"]:
                        await websocket.send_bytes(chunk["data"])
                await websocket.send_json({"type": "sentence_done"})

            full_response = clean_voice_text("".join(full_response_parts))
            session_messages.append({"role": "assistant", "content": full_response})

            await websocket.send_json({"type": "response_text", "text": full_response})
            await websocket.send_json({"type": "done"})

            # Record session activity
            try:
                async with async_session() as db:
                    db.add(VoiceSession(
                        user_id=uuid.UUID(user_id),
                        document_id=uuid.UUID(document_id) if document_id else None,
                        message_count=1,
                    ))
                    await db.commit()
            except Exception:
                pass

    except WebSocketDisconnect:
        pass


def _validate_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=["HS256"])
        return payload.get("sub")
    except JWTError:
        return None

