# WisdomFlow AI

[![TypeScript](https://img.shields.io/badge/TypeScript-61.9%25-blue)](https://www.typescriptlang.org/) [![Python](https://img.shields.io/badge/Python-33.3%25-yellowgreen)](https://www.python.org/) [![License](https://img.shields.io/badge/License-MIT-lightgrey)](./LICENSE) [![CI](https://github.com/vinaykr-22/WisdomFlow-AI/actions/workflows/ci.yml/badge.svg)](https://github.com/vinaykr-22/WisdomFlow-AI/actions)

A learning-first AI platform that helps users convert documents into an interactive study experience — chat with your content, create summaries, quizzes, flashcards, and practice with a voice tutor. Built as a full-stack web app with a TypeScript React frontend and a Python FastAPI backend that integrates LLMs, embeddings, and speech tools.

## Live demo
- Frontend (Vercel): https://wisdomflow-ai.vercel.app
- Backend (Render): https://wisdomflow-ai.onrender.com

## Key features
- Upload and ingest documents (PDF, DOCX, PPTX, text)
- Query your documents via chat and search
- Automatic summarization and knowledge extraction
- Flashcards and quizzes generation for spaced repetition
- Interactive AI Voice Tutor (text-to-speech / speech-to-text)
- User auth and profile management
- Progress tracking and learning roadmaps

---

## Stack
- Languages: TypeScript (frontend), Python (backend), HTML/CSS
- Frontend: Vite + React + TypeScript, Tailwind CSS
- Backend: FastAPI, Async SQLAlchemy, Alembic (migrations)
- Notable libraries & services:
  - Frontend: react-router-dom, zustand, @vercel/analytics
  - Backend & AI: openai, sentence-transformers, chromadb, faster-whisper, edge-tts
  - DB & infra: asyncpg / psycopg2 (Postgres), alembic, gunicorn / uvicorn

---

## How it's organized

Top-level layout (important entries only):

```
.
├─ backend/                 FastAPI backend, DB models & AI processors
│  ├─ app/
│  │  ├─ main.py            FastAPI app entrypoint
│  │  ├─ auth.py            authentication helpers & routes
│  │  ├─ models.py          SQLAlchemy models
│  │  ├─ processors/        document & embedding processors
│  │  ├─ speech/            speech/tts/stt utilities
│  │  └─ ...                dependencies, config, DB utils
│  ├─ requirements.txt      Python dependencies
│  ├─ alembic/              DB migrations
│  ├─ .env.example          environment variable template (sensitive values)
│  └─ render.yaml / Procfile deployment configs
├─ frontend/                React + TypeScript SPA
│  ├─ src/
│  │  ├─ main.tsx           SPA entrypoint
│  │  ├─ App.tsx            routes & top-level layout
│  │  ├─ routes/            pages (Dashboard, Chat, Documents, Summarizer, VoiceTutor, ...)
│  │  └─ stores/            zustand stores (auth, theme, etc.)
│  ├─ package.json
│  └─ vite config / styles
├─ chrome-extension/        (optional) extension code
├─ build.sh                 build helper script
├─ render.yaml              Infra/deploy manifest
└─ project context.md / docs design docs
```

How it fits together:
- The React frontend (frontend/) is a single-page app that talks to the FastAPI backend (backend/) via REST endpoints (auth, documents, ai endpoints). Uploaded documents are processed by backend processors which extract text, generate embeddings (sentence-transformers / chromadb), and persist references in the DB. The AI/chat endpoints use embeddings + LLM (OpenAI or other) to answer queries. Speech features use faster-whisper/edge-tts for STT/TTS.

---

## Quick start — development

Prerequisites
- Node 18+ / npm or pnpm
- Python 3.10+ (recommend 3.11)
- PostgreSQL (or adjust to use sqlite for quick local testing)
- (Optional) OpenAI API key or other provider keys for AI features

1) Clone
```bash
git clone https://github.com/vinaykr-22/WisdomFlow-AI.git
cd WisdomFlow-AI
```

2) Backend (run API)
```bash
# create venv and install
cd backend
python3 -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# create .env from template and set values (see .env.example)
cp .env.example .env
# edit .env to provide DATABASE_URL, SECRET_KEY, LLM_API_KEY or OPENAI_API_KEY, etc.

# apply DB migrations
alembic upgrade head

# run dev server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Notes:
- If running from repo root, `cd backend` first. For production, run via Gunicorn:
```bash
# from backend/
gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind 0.0.0.0:$PORT
```

3) Frontend (run UI)
```bash
cd frontend
npm install
npm run lint   # optional (oxlint)
npm run dev
# open http://localhost:5173 (Vite default)
```

4) Optional: run both at once
- Use two terminals: start backend (port 8000) and frontend (Vite dev server). Frontend makes API calls to backend endpoints configured in the client (check frontend API client config).

---

## Environment variables
Create a `.env` file in backend/ (based on `backend/.env.example`). The project includes a `backend/.env.example`; here are the most important variables with short descriptions and example values:

```
# Core
SECRET_KEY=your-secret-key-here
DATABASE_URL=sqlite+aiosqlite:///./learnflow.db

# LLM (example: Groq or OpenAI)
LLM_API_KEY=your-llm-api-key
LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=llama-3.3-70b-versatile

# Local Ollama fallback (optional)
OLLAMA_BASE_URL=http://localhost:11434/v1

# File storage
UPLOAD_DIR=uploads

# Speech
STT_MODEL=tiny
TTS_VOICE=en-US-AvaNeural

# Deployment / CORS
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000
```

Keep secrets out of version control. For quick local testing, you can use SQLite (the example DATABASE_URL above) but prefer Postgres in production.

---

## Screenshots / Demo
Included screenshots (replace with higher-res images in `docs/assets/screenshots/`):

- Dashboard: `docs/assets/screenshots/dashboard.png`
- Summarizer: `docs/assets/screenshots/summarizer.png`
- Voice Tutor: `docs/assets/screenshots/voice-tutor.png`

Example Markdown to embed (already used below):

![Dashboard](docs/assets/screenshots/dashboard.png)

![Summarizer](docs/assets/screenshots/summarizer.png)

![Voice Tutor](docs/assets/screenshots/voice-tutor.png)

---

## Deployment
- Frontend (Vercel): https://wisdomflow-ai.vercel.app
- Backend (Render): update the URL here when available

Build frontend for production:
```bash
cd frontend
npm run build
# deploy dist/ to static host (Vercel, Netlify) or serve from a static service
```

---

## Project notes & design docs
- `project context.md`
- `project progress.md`
- `LFA PRD.md`, `LFA MP.md`

---

## Contributing
Please see `CONTRIBUTING.md`.

---

## Code of conduct
Please follow the project's Code of Conduct: `CODE_OF_CONDUCT.md`.

---

## Maintainer
Vinay Kumar (vinaykr-22) — vinaykumarrao07@gmail.com

---
