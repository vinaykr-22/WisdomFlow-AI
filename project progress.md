# LearnFlow AI — Project Progress

## ✅ Completed

| Milestone | Feature | Details |
|-----------|---------|---------|
| **M1** | Foundation | FastAPI + SQLAlchemy async + Alembic, React+Vite+TS+Tailwind v4 scaffold, JWT auth (register/login/refresh/me), Zustand auth store + Axios client, ProtectedRoute, Login/Register pages |
| **M2** | Document Processing | PDF/DOCX/PPTX/TXT upload (20MB max), text extraction (`extractor.py`), chunking 500/50, ChromaDB vector store, `all-MiniLM-L6-v2` embeddings, auto-index on upload, delete from vectorstore, startup re-index for stale docs |
| **M3** | Summarizer (Page-length) | 4 page-length options (1/5/10/20 pages) with depth escalation. Image extraction from PDF/DOCX/PPTX for 10+ page summaries. No new dependencies. |
| **M3** | RAG Chat | `POST /api/v1/chat` with SSE streaming, Conversation + Message persistence, vector search with raw-text fallback, message history (last 10), chat frontend with document selector + streaming bubbles |
| **M4** | Quiz Generator | LLM-based MCQ + True/False JSON generation, `generate/list/get/submit` endpoints, score with explanations, frontend (select doc → generate → take → review), `_parse_json` with markdown fence stripping, `_fallback_quiz` for LLM downtime |
| **M4** | Flashcards | LLM-based front/back generation, `FlashcardSet` + `Flashcard` models, `generate/list/sets/{id}/update-card` endpoints, frontend (select doc → browse → click-to-flip → bookmark) |
| **M4** | Roadmap Generator | `POST /generate`, `GET /lists`, `GET /{id}`, `PATCH /nodes/{node_id}`. LLM generates structured tree with prerequisites. Frontend with topic input, tree view, status toggles, progress bar |
| **M5** | Progress Tracking | `LearningStreak` model, 3 endpoints (dashboard/streak/topics), auto-tracked on quiz/doc/chat actions. Frontend dashboard with stats cards, streak display, recent activity, per-document mastery table |
| **—** | LLM Fallback Fix | Fixed Ollama fallback across all LLM functions: `_call_llm` now accepts `base_url` param, orphaned `_client()` calls removed, model name corrected from `llama3.2` to `llama3:latest` |
| **M6** | Topic Learning Mode | Built into roadmap generator — `topic_name` param on `POST /roadmap/generate` creates full learning path from any topic |
| **M6** | Revision Planner | Daily/weekly revision plans — model, LLM function, CRUD endpoints, frontend page with subject picker |

| **M6** | Voice Tutor | Real-time WebSocket AI Voice Tutor with Edge-TTS, Whisper STT, document context integration, multi-turn conversational memory, spoken prose prompt engineering, and markdown cleaning |
| **M6** | Multi-Document Chat | Chat across multiple selected documents simultaneously with vector RAG context aggregation and interactive document selection chips |
| **M6** | Global Search | `GET /api/v1/search` endpoint + frontend `/search` view for querying across documents, roadmaps, topic nodes, and document vector snippets |
| **M6** | Loading/Error UX | Added Axios retry interceptors for transient 502/network drops, active document context badges, and clean loading states |

## 🔄 In Progress

| Feature | Details | Known Issues |
|---------|---------|-------------|
| **Deployment Prep** | Preparing backend & frontend build configurations | Target: Vercel + Render + Neon |

## ⬜ TODO

| Milestone | Feature | Status | Notes |
|-----------|---------|--------|-------|
| **M6** | Deployment | Not started | Vercel + Render + Neon |
| **—** | Rate Limiting | Not started | Prevent abuse within free tiers |

---

*Last updated: July 26, 2026*
