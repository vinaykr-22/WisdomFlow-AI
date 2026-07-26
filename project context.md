# LearnFlow AI — Project Context

> **Purpose**: This document captures all research, architecture decisions, tech stack choices, and implementation plans so that any new session can immediately understand the project state.

---

## 1. Project Overview

**LearnFlow AI** is an AI-powered educational platform that converts learning materials into interactive learning experiences. It generates structured study notes, creates personalized learning roadmaps, teaches concepts through an AI Voice Tutor, and continuously evaluates learner progress.

**Target Users**: College/University students, competitive exam aspirants, self-learners, professionals, teachers.

**Core Differentiator**: Not just summarization — a complete learning workflow from content ingestion to revision.

---

## 2. Tech Stack (Free Only — No Paid Services)

| Layer | Technology | Why |
|-------|-----------|-----|
| **Frontend** | React + Vite + TypeScript | Fast dev, type safety |
| **Styling** | Tailwind CSS + Shadcn UI | Rapid UI development |
| **State (Server)** | TanStack Query (React Query) | Cache management, async state |
| **State (Client)** | Zustand | Auth token, UI state, WebSocket |
| **API Client** | Axios with interceptors | Auto token refresh |
| **Routing** | React Router v6+ | Nested routes, protected routes |
| **Animations** | Motion (Framer Motion) | Page transitions, flashcard flip |
| **Backend** | FastAPI (Python) | Async, fast, Pydantic v2 |
| **ORM** | SQLAlchemy 2.0 (async) | Type-safe, async support |
| **Migrations** | Alembic | Database versioning |
| **Database** | Neon PostgreSQL (free tier) | 0.5 GB, 100 CU-hours/month |
| **Vector Store** | ChromaDB (dev) → pgvector (prod) | Local dev, unified later |
| **Embeddings** | all-MiniLM-L6-v2 (Sentence Transformers) | Local, CPU, free, 384 dims |
| **LLM (Primary)** | Google Gemini API (free tier) | 1,500 RPD, 1M context |
| **LLM (Fallback)** | Groq API (free tier) | 30 RPM, ultra-fast |
| **LLM (Last Resort)** | Ollama (local) | Unlimited, but CPU-only |
| **STT** | Faster-Whisper (local) | CPU-friendly, 4x faster than Whisper |
| **TTS** | Piper TTS (local) | CPU-friendly, 50+ voices |
| **Auth** | JWT (access + refresh) + Google OAuth | Standard, self-managed |
| **File Storage** | Local filesystem (dev) → Cloud storage (prod) | Simple start |
| **Frontend Deploy** | Vercel (free tier) | Optimized for React + Vite |
| **Backend Deploy** | Render (free tier) | 750 hrs/month, Docker support |
| **Task Queue** | FastAPI BackgroundTasks (MVP) → Celery + Redis (later) | Simple start, scale later |

---

## 3. Key Decisions & Rationale

### 3.1 Why Free Services Only
- No GPU available (16GB RAM, no GPU) → local LLMs are slow
- Gemini free tier (1,500 RPD) is sufficient for MVP
- Groq free tier provides fast fallback
- Piper TTS + Faster-Whisper run efficiently on CPU

### 3.2 Why ChromaDB → pgvector Migration Path
- ChromaDB: Zero setup for local dev, fast iteration
- pgvector: Unified data layer with PostgreSQL, ACID compliance, multi-tenancy
- Migration is straightforward with LangChain's PGVector class

### 3.3 Why Hierarchical Chunking
- Child chunks (400 tokens): Precise retrieval
- Parent chunks (2,000 tokens): Full context for LLM generation
- 2026 consensus: Best retrieval quality for educational content

### 3.4 Why BackgroundTasks → Celery Migration
- MVP: FastAPI BackgroundTasks (simple, no Redis dependency)
- Production: Celery + Redis (survives restarts, retries, monitoring)

---

## 4. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT LAYER                          │
│  React + Vite + TS + Tailwind + Shadcn                  │
│  TanStack Query (server) + Zustand (client)             │
│  Vercel Hosting                                         │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    API GATEWAY                           │
│  FastAPI on Render                                       │
│  CORS → Rate Limiter → JWT Auth → Request ID            │
│  API Router v1                                          │
│  Service Layer                                          │
└──────┬──────────────┬──────────────┬────────────────────┘
       │              │              │
       ▼              ▼              ▼
┌────────────┐ ┌────────────┐ ┌────────────────┐
│ AI LAYER   │ │ DATA LAYER │ │ SPEECH LAYER   │
│ LLM Router │ │ Neon PgSQL │ │ Faster-Whisper │
│ Gemini→    │ │ ChromaDB   │ │ Piper TTS      │
│ Groq→Ollama│ │ (vector)   │ │ (both local)   │
│ Embeddings │ │            │ │                │
│ (local)    │ │            │ │                │
└────────────┘ └────────────┘ └────────────────┘
```

---

## 5. Database Schema

### Core Tables

```sql
-- USERS & AUTH
users (id UUID PK, email UNIQUE, full_name, hashed_password, google_id, avatar_url, is_active, created_at, updated_at)
user_settings (id UUID PK, user_id FK UNIQUE, preferred_difficulty, preferred_explanation_style, daily_study_goal_minutes, notifications_enabled)

-- DOCUMENTS
documents (id UUID PK, user_id FK, title, original_filename, file_path, file_type, file_size, file_hash, processing_status, processing_error, chunk_count, total_pages, metadata JSONB, created_at, updated_at)
document_chunks (id UUID PK, document_id FK, user_id FK, chunk_index, content, embedding vector(384), chunk_type, parent_id, metadata JSONB, created_at)

-- SUMMARIES
summaries (id UUID PK, document_id FK, user_id FK, summary_type, chapter_number, content, token_count, created_at)

-- CONCEPTS
concepts (id UUID PK, document_id FK, user_id FK, name, definition, concept_type, frequency, importance_score, related_concepts JSONB, created_at)

-- ROADMAPS
roadmaps (id UUID PK, user_id FK, document_id FK NULL, topic_name, title, description, total_nodes, completed_nodes, estimated_total_hours, created_at, updated_at)
roadmap_nodes (id UUID PK, roadmap_id FK, node_id, parent_node_id, title, description, node_type, difficulty, estimated_minutes, status, prerequisites JSONB, resources JSONB, sort_order, created_at, updated_at)

-- CHAT
conversations (id UUID PK, user_id FK, document_id FK NULL, title, message_count, last_message_at, created_at, updated_at)
messages (id UUID PK, conversation_id FK, role, content, token_count, metadata JSONB, created_at)

-- QUIZZES
quizzes (id UUID PK, user_id FK, document_id FK NULL, title, description, difficulty, question_count, time_limit_minutes, created_at)
quiz_questions (id UUID PK, quiz_id FK, question_index, question_type, question, options JSONB, correct_answer, explanation, difficulty, topic, created_at)
quiz_attempts (id UUID PK, quiz_id FK, user_id FK, score, answers JSONB, time_taken_seconds, completed_at)

-- FLASHCARDS
flashcard_sets (id UUID PK, user_id FK, document_id FK NULL, title, description, card_count, created_at, updated_at)
flashcards (id UUID PK, set_id FK, front, back, hint, category, difficulty, is_bookmarked, review_count, last_reviewed_at, next_review_at, created_at)

-- PROGRESS
user_progress (id UUID PK, user_id FK, document_id FK, study_time_minutes, total_documents_uploaded, total_quizzes_taken, total_flashcards_reviewed, last_studied_at, created_at, updated_at)
topic_progress (id UUID PK, user_id FK, topic, mastery_level, quiz_average_score, times_revised, last_revised_at, created_at, updated_at)
learning_streaks (id UUID PK, user_id FK, date, study_minutes, documents_studied, quizzes_taken, created_at)

-- REVISION
revision_plans (id UUID PK, user_id FK, plan_type, title, structure JSONB, is_active, created_at, updated_at)

-- VOICE
voice_sessions (id UUID PK, user_id FK, document_id FK NULL, conversation_id FK NULL, duration_seconds, message_count, created_at)
```

### Indexes
```sql
CREATE INDEX idx_chunks_embedding ON document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_chunks_user ON document_chunks (user_id);
CREATE INDEX idx_chunks_document ON document_chunks (document_id);
```

---

## 6. REST API Endpoints

### Auth
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/v1/auth/register | {email, password, full_name} | {access_token, refresh_token, user} | No |
| POST | /api/v1/auth/login | {email, password} | {access_token, refresh_token, user} | No |
| POST | /api/v1/auth/google | {code} | {access_token, refresh_token, user} | No |
| POST | /api/v1/auth/refresh | {refresh_token} | {access_token} | No |
| GET | /api/v1/auth/me | - | {user} | Yes |
| PUT | /api/v1/auth/me | {full_name, avatar_url, ...} | {user} | Yes |

### Documents
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/v1/documents/upload | multipart: file | {document_id, status} | Yes |
| GET | /api/v1/documents | ?page=1&limit=20 | {documents, total, page, pages} | Yes |
| GET | /api/v1/documents/{id} | - | {document} | Yes |
| DELETE | /api/v1/documents/{id} | - | {success} | Yes |
| GET | /api/v1/documents/{id}/status | - | {processing_status} | Yes |

### Summarizer
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/v1/summarize | {document_id, summary_type, chapter_number?} | {summary_id, content} | Yes |
| GET | /api/v1/summarize/{doc_id} | ?type=detailed | {summaries} | Yes |
| POST | /api/v1/summarize/{doc_id}/stream | {summary_type} | SSE stream | Yes |

### Roadmap
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/v1/roadmap/generate | {document_id? OR topic_name} | {roadmap_id, nodes} | Yes |
| GET | /api/v1/roadmap/{id} | - | {roadmap with nodes} | Yes |
| GET | /api/v1/roadmaps | ?page=1&limit=20 | {roadmaps} | Yes |
| PATCH | /api/v1/roadmap/{id}/nodes/{node_id} | {status} | {node} | Yes |

### Chat
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/v1/chat | {message, document_ids?, conversation_id?} | SSE stream | Yes |
| GET | /api/v1/chat/conversations | ?page=1&limit=20 | {conversations} | Yes |
| GET | /api/v1/chat/conversations/{id} | - | {conversation with messages} | Yes |

### Voice
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/v1/voice/chat | multipart: audio_file, document_id? | {audio_url, transcript, response_text} | Yes |
| POST | /api/v1/voice/text | {message, document_id?} | {audio_url, response_text} | Yes |

### Quizzes
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/v1/quizzes/generate | {document_id, difficulty, question_count, types[]} | {quiz_id, questions} | Yes |
| GET | /api/v1/quizzes | ?page=1&limit=20 | {quizzes} | Yes |
| GET | /api/v1/quizzes/{id} | - | {quiz with questions} | Yes |
| POST | /api/v1/quizzes/{id}/submit | {answers: [{question_id, answer}]} | {score, results} | Yes |

### Flashcards
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/v1/flashcards/generate | {document_id, count, categories[]} | {set_id, flashcards} | Yes |
| GET | /api/v1/flashcards/sets | ?page=1&limit=20 | {sets} | Yes |
| GET | /api/v1/flashcards/sets/{set_id} | - | {set with flashcards} | Yes |
| PATCH | /api/v1/flashcards/{id} | {is_bookmarked?, front?, back?} | {flashcard} | Yes |

### Progress
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| GET | /api/v1/progress/dashboard | - | {stats, recent_activity, streak} | Yes |
| GET | /api/v1/progress/streak | - | {current_streak, longest_streak, dates} | Yes |
| GET | /api/v1/progress/topics | - | {topics with mastery} | Yes |

### Revision
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/v1/revision/generate | {plan_type: "daily" OR "weekly"} | {plan_id, structure} | Yes |
| GET | /api/v1/revision/plan | - | {active_plan} | Yes |

### Topics
| Method | Endpoint | Body | Response | Auth |
|--------|----------|------|----------|------|
| POST | /api/v1/topics/learn | {topic_name, difficulty?} | {roadmap_id, summary, concepts} | Yes |

---

## 7. Folder Structure

### Backend
```
backend/
├── app/
│   ├── main.py                    # App factory, lifespan, middleware
│   ├── config.py                  # Pydantic BaseSettings
│   ├── database.py                # Async engine, session factory
│   ├── dependencies.py            # get_db, get_current_user
│   ├── exceptions.py              # Custom exception handlers
│   ├── middleware.py               # CORS, rate limiting
│   ├── api/v1/                    # Route handlers (thin)
│   │   ├── auth.py, documents.py, summarize.py, roadmap.py
│   │   ├── chat.py, voice.py, quizzes.py, flashcards.py
│   │   ├── progress.py, revision.py, topics.py
│   ├── core/                      # Security, OAuth, storage
│   ├── models/                    # SQLAlchemy ORM models
│   ├── schemas/                   # Pydantic v2 request/response
│   ├── repositories/              # Data access layer (DB queries)
│   ├── services/                  # Business logic
│   ├── ai/                        # LangChain, prompts, vector store
│   │   ├── llm.py                 # LLM router (Gemini→Groq→Ollama)
│   │   ├── embeddings.py          # Sentence Transformers singleton
│   │   ├── vectorstore.py         # ChromaDB/pgvector setup
│   │   ├── retriever.py           # Hierarchical parent-child retriever
│   │   ├── chains/                # Summarization, quiz, chat, etc.
│   │   └── prompts/               # Prompt templates
│   ├── speech/                    # TTS (Piper) & STT (Faster-Whisper)
│   ├── processors/                # Document parsing (PDF, DOCX, PPTX)
│   └── tasks/                     # Background tasks
├── alembic/                       # Database migrations
├── tests/
├── uploads/                       # Local file storage (gitignored)
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### Frontend
```
frontend/src/
├── app/                           # Providers, router, entry
├── routes/                        # Page-level components
│   ├── auth/, dashboard/, documents/, summarizer/
│   ├── roadmap/, voice-tutor/, chat/, quizzes/
│   ├── flashcards/, analytics/, settings/
├── features/                      # Cross-route domain logic
│   ├── auth/, documents/, chat/, voice/
├── entities/                      # Business object components
├── shared/                        # UI components, hooks, utils
│   ├── components/ui/ (Shadcn), layout/, feedback/
│   ├── hooks/, lib/, config/, types/, utils/
├── api/                           # Pure API functions
├── hooks/                         # TanStack Query hooks
└── stores/                        # Zustand stores
```

---

## 8. Authentication & Authorization

### Token Strategy
| Token | Lifetime | Storage | Usage |
|-------|----------|---------|-------|
| Access Token | 30 min | Memory (Zustand) | API Authorization header |
| Refresh Token | 7 days | HTTP-only cookie | Auto-refresh expired access tokens |

### Auth Flows
- **Email/Password**: Register → Hash password (bcrypt, 12 rounds) → Store → Login → Issue JWT
- **Google OAuth**: Redirect → Google → Callback with code → Exchange for tokens → Issue JWT
- **Token Refresh**: Client sends refresh token → Backend validates → Issue new access token

### Authorization Rules
- All API endpoints require authentication (except /auth/* and /health)
- Users can only access their own resources (documents, quizzes, progress)
- Rate limiting: 100 requests/minute per user

---

## 9. RAG Pipeline Design

### Ingestion Flow
```
Upload → Validate → Save to disk → Extract text (pypdf/docx/pptx)
  → Chunk (hierarchical: 400 token child, 2000 token parent)
  → Embed (all-MiniLM-L6-v2, local CPU)
  → Store in ChromaDB
  → Update DB status to "completed"
```

### Retrieval Flow
```
User Query → Rewrite (history-aware, standalone query)
  → Vector search (MMR, fetch 20 diverse chunks)
  → Rerank to top 5 (relevance scoring)
  → Assemble context
  → Generate response via LLM (streaming)
  → Store message in PostgreSQL
```

### Chunking Strategy
| Type | Size | Overlap | Purpose |
|------|------|---------|---------|
| Child | 400 tokens | 80 tokens | Precise retrieval |
| Parent | 2,000 tokens | 200 tokens | Full context for LLM |

### Embedding Model
- **MVP**: `all-MiniLM-L6-v2` (384 dims, fast on CPU, free)
- **Upgrade**: `BAAI/bge-large-en-v1.5` (1024 dims, better quality)

---

## 10. Voice Tutor Workflow

### Text-Based (Lower Latency ~4s)
```
User types → LLM generates response → Piper TTS → Audio output
```

### Voice-Based (Full Pipeline ~10s)
```
Record audio (Web Audio API)
  → Faster-Whisper STT (local CPU, ~2s)
  → RAG retrieval + LLM generation (~3s)
  → Piper TTS (local CPU, ~2s)
  → Audio playback
```

### Voice Components
| Component | Technology | Details |
|-----------|-----------|---------|
| STT | Faster-Whisper | Local, CPU, base.en model (~142MB) |
| TTS | Piper TTS | Local, CPU, en_US-amy-medium voice (~50MB) |
| LLM | Gemini/Groq | With educational tutor prompt |
| Audio Format | WebM/Opus → WAV | Frontend records WebM, backend converts |

---

## 11. Free Tier Limits & Mitigations

| Service | Limit | Mitigation |
|---------|-------|-----------|
| Gemini API | 1,500 requests/day | Groq fallback + cache repeated queries |
| Groq API | 30 requests/minute | Gemini primary + Ollama last resort |
| Neon PostgreSQL | 0.5 GB storage, 100 CU-hours | Archive old data, docs on filesystem |
| Render | 750 hrs/month, cold starts after 15 min | Acceptable for dev; $7/mo Starter for prod |
| Vercel | Free Hobby plan | Sufficient for frontend |

### Multi-Provider LLM Router Strategy
```
Request → Try Gemini (1,500 RPD free)
  → If rate-limited → Try Groq (30 RPM free)
  → If rate-limited → Fall back to Ollama (local, unlimited)
```

---

## 12. Implementation Milestones (6 Weeks)

### Milestone 1: Foundation (Days 1-5, ~26h)
- Project scaffolding (monorepo, FastAPI, React+Vite)
- Database setup (Neon PostgreSQL, SQLAlchemy, Alembic)
- Auth system (register, login, JWT, Google OAuth)
- Frontend auth pages + protected routes + app shell

### Milestone 2: Document Processing + RAG (Days 6-12, ~37h)
- Document models + file upload endpoint
- Text extraction (PDF, DOCX, PPTX)
- Hierarchical chunking + embedding pipeline
- ChromaDB vector store + retriever
- LLM router (Gemini → Groq → Ollama)
- Frontend documents page + upload UI

### Milestone 3: Summarizer + Chat (Days 13-19, ~32h)
- 7 summary types (executive, detailed, chapter-wise, bullets, definitions, questions, takeaways)
- RAG-powered chat with conversation history
- Streaming responses (SSE)
- Frontend summarizer + chat pages

### Milestone 4: Roadmap + Quiz + Flashcards (Days 20-28, ~37h)
- Roadmap generation (structured nodes with prerequisites)
- Quiz engine (5 question types, scoring, attempts)
- Flashcard system (generation, bookmark, revision mode)
- Frontend roadmap tree, quiz take, flashcard flip pages

### Milestone 5: Voice Tutor + Progress (Days 29-35, ~37h)
- Faster-Whisper STT + Piper TTS integration
- Voice tutor pipeline (STT → RAG → LLM → TTS)
- Progress tracking (streak, stats, topic mastery)
- Frontend voice tutor + dashboard + analytics pages

### Milestone 6: Revision + Deploy (Days 36-42, ~39h)
- Revision planner (daily/weekly plans)
- Topic learning mode (Module 12)
- Error handling + loading states + responsive design
- Deployment (Vercel + Render + Neon)
- End-to-end testing + documentation

**Total**: ~208 hours across 6 weeks

---

## 13. PRD Gaps Identified (For Future Reference)

| Gap | Priority | Notes |
|-----|----------|-------|
| Error handling/retry strategies | High | LLM failures, parsing failures |
| Rate limiting per user | High | Prevent abuse, stay within free tiers |
| Document deletion | High | Users need to manage documents |
| Multi-document context | Medium | Chat across multiple docs |
| Search functionality | Medium | Global search across docs/summaries |
| Notification system | Medium | Weak-topic reminders, revision |
| Content moderation | Medium | Filter inappropriate content |
| Quiz retake policy | Medium | Same quiz or regenerate? |
| Loading/processing UX states | High | What user sees during async ops |
| Cost modeling | High | Capacity planning for free tiers |
| Session management | Medium | Inactive session handling |
| Browser compatibility | Low | Voice API support varies |
| Accessibility (WCAG) | Medium | Specific level not defined |
| User roles | Low | Teacher/student distinction |
| Data export | Low | Export progress/summaries |

---

## 14. Key Resources

| Resource | URL |
|----------|-----|
| PRD | `LFA PRD.md` |
| Master Prompt | `LFA MP.md` |
| This Context | `project context.md` |

---

*Last updated: July 2026*
