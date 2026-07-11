# Repository Guidelines

## Project Structure & Module Organization

PyPostBoy is a local-first API client backend built with Django-compatible Python modules.

- `pypostboy/` contains backend application code: routes, services, repositories, Django app modules, HTTP helpers, and database utilities.
- `tests/backend/` holds pytest coverage for backend behavior.
- `docs/` stores project documentation and operational notes.

## Build, Test, and Development Commands

- `python -m venv venv` then `pip install -r requirements.txt`: create a local Python environment.
- `python app.py`: run the local backend server on `http://localhost:3001`.
- `python manage.py check`: validate Django configuration.
- `python manage.py migrate`: apply Django database migrations.
- `pytest`: run the Python test suite configured by `pytest.ini`.
- `docker compose -f docker-compose.dev.yml up --build`: run the SQLite Docker dev stack on `http://localhost:8080`.

## Coding Style & Naming Conventions

Use 4-space indentation for Python and keep modules focused by layer: route handlers in `pypostboy/routes/`, business logic in `pypostboy/services/`, and persistence in `pypostboy/repositories/` or `pypostboy/db/`. Prefer `snake_case` for Python files, functions, and variables.

## Testing Guidelines

Pytest discovers `test_*.py`, `Test*` classes, and `test_*` functions under `tests/`. Add backend tests near similar files in `tests/backend/`. Run the narrowest relevant test first, then `pytest` before submitting broad changes.

## Commit & Pull Request Guidelines

Keep commits small and action-oriented, for example `Fix proxy timeout handling` or `Add import validation tests`. PRs should include a concise summary, test results, linked issues when applicable, and call out configuration, migration, Docker, or security-sensitive changes explicitly.

## Security & Configuration Tips

Start from `.env.example` and avoid committing real secrets, local databases, or generated artifacts. For production-like Docker runs, set `POSTBOY_SECRET_KEY` and use explicit CORS/CSRF origins instead of permissive development defaults.
