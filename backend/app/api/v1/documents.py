import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.embeddings import embed_batch
from app.ai.vectorstore import index_document, delete_document as vs_delete
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Document
from app.processors.chunker import chunk_text
from app.processors.extractor import extract_text
from app.config import settings
from app.api.v1.progress import record_activity

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent.parent / settings.upload_dir

router = APIRouter(prefix="/api/v1/documents", tags=["documents"])
ALLOWED_TYPES = {".pdf", ".docx", ".pptx", ".txt"}
MAX_SIZE = 20 * 1024 * 1024  # 20 MB


class DocumentResponse(BaseModel):
    id: str
    title: str
    original_filename: str
    file_type: str
    file_size: int
    processing_status: str
    created_at: str

    model_config = {"from_attributes": True}


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {ext}")

    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 20MB)")

    file_id = uuid.uuid4()
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    dest = UPLOAD_DIR / f"{file_id}{ext}"
    dest.write_bytes(content)

    doc = Document(
        id=file_id,
        user_id=user.id,
        title=Path(file.filename).stem,
        original_filename=file.filename,
        file_path=str(dest),
        file_type=ext,
        file_size=len(content),
        processing_status="indexing",
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    # auto-index into vector store
    try:
        text = extract_text(str(dest))
        chunks = chunk_text(text)
        embeddings = embed_batch(chunks)
        index_document(str(file_id), chunks, embeddings)
        doc.processing_status = "ready"
    except Exception:
        doc.processing_status = "error"
    await db.commit()

    await record_activity(db, user.id, "document")

    return {"id": str(doc.id), "status": doc.processing_status}


@router.get("")
async def list_documents(
    page: int = 1,
    limit: int = 20,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document)
        .where(Document.user_id == user.id)
        .order_by(Document.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    docs = result.scalars().all()
    return {
        "documents": [
            DocumentResponse(
                id=str(d.id), title=d.title, original_filename=d.original_filename,
                file_type=d.file_type, file_size=d.file_size,
                processing_status=d.processing_status,
                created_at=d.created_at.isoformat(),
            ) for d in docs
        ],
        "total": len(docs),
        "page": page,
    }


@router.delete("/{doc_id}")
async def delete_document(
    doc_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    Path(doc.file_path).unlink(missing_ok=True)
    vs_delete(str(doc_id))
    await db.execute(delete(Document).where(Document.id == doc_id))
    await db.commit()
    return {"success": True}


@router.get("/{doc_id}/content")
async def get_document_content(
    doc_id: uuid.UUID,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Document).where(Document.id == doc_id, Document.user_id == user.id)
    )
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    file_path = Path(doc.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")
        
    return FileResponse(
        path=file_path, 
        filename=doc.original_filename
    )
