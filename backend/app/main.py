import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select

from app.auth import router as auth_router
from app.api.v1.documents import router as documents_router
from app.api.v1.summarize import router as summarize_router
from app.api.v1.chat import router as chat_router
from app.api.v1.quizzes import router as quizzes_router
from app.api.v1.flashcards import router as flashcards_router
from app.api.v1.roadmap import router as roadmap_router
from app.api.v1.progress import router as progress_router
from app.api.v1.revision import router as revision_router
from app.api.v1.voice import router as voice_router
from app.api.v1.search import router as search_router
from pathlib import Path

from app.config import settings
from app.database import engine, async_session, Base
from app.models import Document


async def _reindex_stale_docs():
    """ponytail: one-time re-index of docs that missed ChromaDB indexing."""
    async with async_session() as db:
        result = await db.execute(
            select(Document).where(Document.processing_status.in_(["uploaded", "error"]))
        )
        docs = result.scalars().all()
        if not docs:
            return

        from app.processors.extractor import extract_text
        from app.processors.chunker import chunk_text
        from app.ai.embeddings import embed_batch
        from app.ai.vectorstore import index_document

        for doc in docs:
            try:
                text = await asyncio.to_thread(extract_text, doc.file_path)
                chunks = chunk_text(text)
                embeddings = await asyncio.to_thread(embed_batch, chunks)
                index_document(str(doc.id), chunks, embeddings)
                doc.processing_status = "ready"
            except Exception:
                doc.processing_status = "error"
        await db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    await _reindex_stale_docs()
    yield
    await engine.dispose()


app = FastAPI(title="WisdomFlow AI", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:8000"],
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(documents_router)
app.include_router(summarize_router)
app.include_router(chat_router)
app.include_router(quizzes_router)
app.include_router(flashcards_router)
app.include_router(roadmap_router)
app.include_router(progress_router)
app.include_router(revision_router)
app.include_router(voice_router)
app.include_router(search_router)

UPLOADS = Path(__file__).resolve().parent.parent / settings.upload_dir
UPLOADS.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS)), name="uploads")


@app.get("/health")
async def health():
    return {"status": "ok"}
