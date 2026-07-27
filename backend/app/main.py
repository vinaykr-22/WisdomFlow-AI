import asyncio
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"Warning: Database initialization error: {e}")

    asyncio.create_task(_reindex_stale_docs())
    yield
    try:
        await engine.dispose()
    except Exception:
        pass




app = FastAPI(title="WisdomFlow AI", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
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

# ── Serve uploaded files ──
UPLOADS = Path(__file__).resolve().parent.parent / settings.upload_dir
UPLOADS.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS)), name="uploads")

# ── Serve React SPA (production build) ──
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
if STATIC_DIR.exists() and (STATIC_DIR / "index.html").exists():
    app.mount("/assets", StaticFiles(directory=str(STATIC_DIR / "assets")), name="spa-assets")


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.api_route("/{full_path:path}", methods=["GET"], include_in_schema=False)
async def spa_fallback(request: Request, full_path: str):
    """Serve React SPA for all non-API routes (client-side routing support)."""
    # Don't intercept API, uploads, docs, or WebSocket paths
    if full_path.startswith(("api/", "uploads/", "docs", "openapi.json", "health")):
        from fastapi.responses import JSONResponse
        return JSONResponse({"detail": "Not Found"}, status_code=404)

    index = STATIC_DIR / "index.html"
    if index.exists():
        return FileResponse(str(index))

    # In development (no build), return a helpful message
    from fastapi.responses import JSONResponse
    return JSONResponse(
        {"detail": "Frontend not built. Run 'npm run build' in frontend/ first, or use the Vite dev server."},
        status_code=404,
    )
