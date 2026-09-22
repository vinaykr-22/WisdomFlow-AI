# Contributing to WisdomFlow AI

Thanks for your interest in contributing! This file explains how to report issues, propose changes, and contribute code or documentation.

1) Reporting issues
- Open a clear, concise issue describing the bug or feature request.
- Include steps to reproduce, expected vs actual behavior, and any relevant logs or screenshots.
- Add the appropriate labels (bug, enhancement, docs) if you have permission.

2) Branching & workflow
- Fork the repository and create branches from main:
  - feature/<short-description>
  - fix/<short-description>
  - chore/<short-description>
- Keep your PRs focused and small. One feature or fix per PR.

3) Pull request checklist
- [ ] The PR has a descriptive title and detailed description of changes.
- [ ] Code follows existing style and lint rules (frontend uses oxlint; run the linter before committing).
- [ ] All new code is covered by tests where appropriate.
- [ ] Commit messages are clear and (optionally) follow Conventional Commits.
- [ ] CI checks pass.

4) Running the project locally (short)
- Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
# create .env from .env.example and set values
cp .env.example .env
# run migrations (if any)
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

- Frontend
```bash
cd frontend
npm install
npm run lint   # optional (oxlint)
npm run dev
```

5) Linting and formatting
- Frontend uses `oxlint` and TypeScript. Run `npm run lint` in `frontend/` before submitting PRs.
- Add or update lint rules via `.oxlintrc.json` in the frontend if needed.

6) Tests
- If you add tests, include commands to run them in this file. There are currently no centralized test suites configured in CI; add tests and update `.github/workflows/ci.yml` to run them.

7) Code of Conduct
- Please follow the project's Code of Conduct (CODE_OF_CONDUCT.md). Respectful, constructive behavior is expected.

Thank you — maintainers will review PRs as quickly as possible. If you need help getting started, open an issue and tag it with good-first-issue.