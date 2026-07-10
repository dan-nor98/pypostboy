# Repository Guidelines

## Project Structure & Module Organization

PyPostBoy is a local-first API client with a Django-compatible Python backend, a static browser UI, and an Electron desktop shell.

- `pypostboy/` contains backend application code: routes, services, repositories, Django app modules, HTTP helpers, and database utilities.
- `public/` contains the browser UI assets, including `index.html`, `recover.html`, CSS, and JavaScript modules.
- `electron/` contains the Electron main process, preload bridge, and request executor.
- `tests/backend/`, `tests/frontend/`, and `tests/e2e/` hold pytest, frontend regression, and Playwright/Node tests.
- `docs/` stores project documentation, checklists, and screenshot placeholders.

## Build, Test, and Development Commands

- `python -m venv venv` then `pip install -r requirements.txt`: create a local Python environment.
- `python app.py`: run the local backend/UI server on `http://localhost:3001`.
- `python manage.py check`: validate Django configuration.
- `python manage.py migrate`: apply Django database migrations.
- `pytest`: run the Python test suite configured by `pytest.ini`.
- `npm run test:electron`: run Electron request-executor tests.
- `npm run test:e2e:playwright`: run Playwright browser tests.
- `npm run dev:desktop`: run Django and Electron together for desktop development.
- `docker compose -f docker-compose.dev.yml up --build`: run the SQLite Docker dev stack on `http://localhost:8080`.

## Coding Style & Naming Conventions

Use 4-space indentation for Python and keep modules focused by layer: route handlers in `pypostboy/routes/`, business logic in `pypostboy/services/`, and persistence in `pypostboy/repositories/` or `pypostboy/db/`. Prefer `snake_case` for Python files, functions, and variables. Use existing ES module style in `public/js/`, with feature code grouped under `features/`, state under `state/`, and shared UI helpers under `ui/`.

## Testing Guidelines

Pytest discovers `test_*.py`, `Test*` classes, and `test_*` functions under `tests/`. Add backend tests near similar files in `tests/backend/`; add frontend behavior tests in `tests/frontend/`; use Playwright specs in `tests/e2e/` for browser workflows. Run the narrowest relevant test first, then `pytest` or the matching npm script before submitting broad changes.

## Commit & Pull Request Guidelines

Keep commits small and action-oriented, for example `Fix proxy timeout handling` or `Add import validation tests`. PRs should include a concise summary, test results, linked issues when applicable, and screenshots or short recordings for UI changes. Call out configuration, migration, Docker, or security-sensitive changes explicitly.

## Security & Configuration Tips

Start from `.env.example` and avoid committing real secrets, local databases, or generated artifacts. For production-like Docker runs, set `POSTBOY_SECRET_KEY` and use explicit CORS/CSRF origins instead of permissive development defaults.

# Project Instructions for Codex

Before making any UI or frontend changes, read `DESIGN.md`.

Use `DESIGN.md` as the source of truth for:
- colors
- typography
- spacing
- border radius
- component styling
- general visual direction

When implementing UI:
- Do not invent a new visual style.
- Use existing tokens from `DESIGN.md`.
- If a needed token is missing, propose the smallest reasonable addition.
- Keep the implementation consistent with the design rationale in the Markdown sections.

