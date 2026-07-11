# PyPostBoy

PyPostBoy is a local-first API backend and lightweight HTTP proxy built with Python and Django-compatible modules. Use it to save requests, organize collections, import cURL or Postman data, and execute outbound HTTP calls through a server-side proxy.

## Features

- Django-compatible routing, sessions, CSRF protection, and WSGI deployment.
- SQLite by default, with PostgreSQL-oriented Docker Compose support.
- Collection, request, snapshot, history, and environment-variable persistence.
- Server-side request execution for outbound HTTP calls.
- API token and session authentication helpers.

## Local development

Create an environment and install dependencies:

```bash
python -m venv venv
. venv/bin/activate
pip install -r requirements.txt
```

Run validation and migrations:

```bash
python manage.py check
python manage.py migrate
```

Start the backend:

```bash
python app.py
```

The service listens on `http://localhost:3001` by default.

## Docker

PyPostBoy includes Docker assets for local SQLite development and production-like PostgreSQL runs.

SQLite development stack:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Production-like PostgreSQL stack:

```bash
docker compose up --build
```

## Testing

Run the Python test suite:

```bash
pytest
```

Before opening a PR that touches the frontend, install the local frontend dependencies, run the Vitest smoke suite, build the Vite app, and verify the generated artifact:

```bash
npm run frontend:install
npm run test:frontend
npm run frontend:build
npm run frontend:check
```

## Project layout

```text
pypostboy/             # Backend application code
tests/backend/         # Backend pytest coverage
docs/                  # Project documentation
app.py                 # Local server entry point
manage.py              # Django management entry point
```

## Configuration

Start from `.env.example` and set production values explicitly. In particular, set `POSTBOY_SECRET_KEY` for non-development deployments and configure CORS/CSRF origins according to your network boundary.

## Security

PyPostBoy is intended for local development. The proxy forwards requests as provided, and saved secrets remain in the configured database. Do not expose an instance to public networks without adding appropriate authentication and network controls.
