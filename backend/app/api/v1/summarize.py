import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Document
from app.processors.extractor import extract_text, extract_images
from app.ai.llm import generate_summary
from app.config import settings

IMAGE_DIR = Path(__file__).resolve().parent.parent.parent.parent / settings.upload_dir / "images"

router = APIRouter(prefix="/api/v1/summarize", tags=["summarize"])


class SummarizeRequest(BaseModel):
    document_id: str
    page_count: int = 5


class PodcastRequest(BaseModel):
    document_id: str


@router.post("")
async def summarize(
    body: SummarizeRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if body.page_count not in (1, 5, 10, 20):
        raise HTTPException(status_code=400, detail="page_count must be 1, 5, 10, or 20")

    result = await db.execute(
        select(Document).where(Document.id == uuid.UUID(body.document_id), Document.user_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    text = extract_text(doc.file_path)
    if not text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted from this document")

    try:
        content = generate_summary(text, body.page_count)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")

    image_urls: list[str] = []
    if body.page_count >= 10:
        doc_img_dir = IMAGE_DIR / str(doc.id)
        doc_img_dir.mkdir(parents=True, exist_ok=True)
        img_list = extract_images(doc.file_path)
        for img in img_list:
            name = f"{img['page']}_{img['name']}"
            path = doc_img_dir / name
            path.write_bytes(img["data"])
            image_urls.append(f"/api/v1/summarize/images/{doc.id}/{name}")

    return {"content": content, "images": image_urls, "page_count": body.page_count}


@router.get("/images/{doc_id}/{filename}")
async def serve_image(doc_id: str, filename: str):
    path = IMAGE_DIR / doc_id / filename
    if not path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(str(path))


@router.post("/podcast")
async def generate_podcast(
    body: PodcastRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    import asyncio
    from app.ai.llm import generate_podcast_script
    from app.speech.tts import text_to_speech
    import tempfile
    import os

    result = await db.execute(
        select(Document).where(Document.id == uuid.UUID(body.document_id), Document.user_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    text = extract_text(doc.file_path)
    if not text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted")

    # Generate script
    try:
        script = await asyncio.to_thread(generate_podcast_script, text)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {e}")

    # Generate audio for each line
    podcast_dir = Path(__file__).resolve().parent.parent.parent.parent / settings.upload_dir / "podcasts"
    podcast_dir.mkdir(parents=True, exist_ok=True)
    
    with tempfile.TemporaryDirectory() as tmpdirname:
        final_filename = f"podcast_{uuid.uuid4()}.mp3"
        final_path = podcast_dir / final_filename
        
        with open(final_path, "wb") as outfile:
            for i, line in enumerate(script):
                voice = "en-US-JennyNeural" if line.get("speaker") == "A" else "en-US-GuyNeural"
                speech_text = line.get("text", "")
                if not speech_text:
                    continue
                    
                audio_path = await text_to_speech(speech_text, tmpdirname, voice=voice)
                with open(audio_path, "rb") as infile:
                    outfile.write(infile.read())
                    
                # Optional: we could append silence bytes if we had a pre-generated mp3 silence, 
                # but direct dialogue works fine as edge_tts adds small padding usually.
                
    return {
        "script": script,
        "audio_url": f"/uploads/podcasts/{final_filename}"
    }
