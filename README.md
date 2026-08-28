# WisdomFlow AI

[![TypeScript](https://img.shields.io/badge/TypeScript-61.9%25-blue)](https://www.typescriptlang.org/) [![Python](https://img.shields.io/badge/Python-33.3%25-yellowgreen)](https://www.python.org/) [![License](https://img.shields.io/badge/License-MIT-lightgrey)](./LICENSE)

A learning-first AI platform that helps users convert documents into an interactive study experience — chat with your content, create summaries, quizzes, flashcards, and practice with a voice tutor. Built as a full-stack web app with a TypeScript React frontend and a Python FastAPI backend that integrates LLMs, embeddings, and speech tools.

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
# edit .env to provide DATABASE_URL, SECRET_KEY, OPENAI_API_KEY, etc.

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
npm run dev
# open http://localhost:5173 (Vite default)
```

4) Optional: run both at once
- Use two terminals: start backend (port 8000) and frontend (Vite dev server). Frontend makes API calls to backend endpoints configured in the client (check frontend API client config).

---

## Environment variables (recommended)
Create a `.env` file in backend/ (based on `backend/.env.example`). Typical variables the app expects:
- DATABASE_URL=postgresql://user:pass@host:5432/dbname
- SECRET_KEY=your-secret-key
- OPENAI_API_KEY=sk-...
- CHROMA_SETTINGS or CHROMA_DIR (if using local chromadb)
- SENTRY_DSN (optional)
- SMTP_* (email for password reset)
- RENDER/DEPLOY-specific: PORT, DATABASE_URL (hosted)

Always keep secrets out of version control.

---

## Deployment
- There are examples for cloud deployment in `render.yaml` and Procfile(s). The backend is production-ready with Gunicorn + Uvicorn workers, and the frontend can be built via `npm run build` and served on a static host (or served from a Node static server).
- Build frontend for production:
```bash
cd frontend
npm run build
# deploy dist/ to static host (Netlify, Vercel, Render, S3 + CloudFront, etc.)
```

---

## Project notes & design docs
- Detailed product & design notes are available in:
  - `project context.md`
  - `project progress.md`
  - `LFA PRD.md` and `LFA MP.md`
- These docs explain the product vision, user flows, and project milestones.

---

## Contributing
- Please open issues or PRs for bug fixes, features, or docs improvements.
- Suggested workflow:
  1. Fork the repo
  2. Create a feature branch
  3. Run tests / linting locally
  4. Open a pull request with a clear description

Add a short CONTRIBUTING.md if you want to formalize reviews, commit message style, and CI requirements.

---

## Troubleshooting & Tips
- If AI endpoints error, ensure OPENAI_API_KEY (or other provider keys) are set and reachable.
- For speech features, additional native dependencies (audio libs) may be required on your system — consult the `requirements.txt` entries like `soundfile`, `faster-whisper`.
- If you need a quick local DB: set `DATABASE_URL=sqlite+aiosqlite:///./dev.db` in `.env` for fast testing (adjust models/migrations as needed).

---

## License & Contact
- Suggested: MIT (add LICENSE file to repo)
- Maintainer: vinaykr-22 — open an issue or PR on GitHub for questions.

---

## Try asking
- "Where does the backend expose the chat endpoint and how does it combine embeddings with the LLM?"
- "Which file implements the document ingestion pipeline (PDF -> chunks -> embeddings)?"
- "How are user sessions and authentication handled in backend/auth.py and the frontend auth store?"

---

Thank you for building WisdomFlow AI — this README should give contributors and users a clear starting point. Add any missing env variables or deployment instructions to the backend `.env.example` and update this README as the project matures.
