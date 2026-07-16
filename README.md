# PyPostBoy

PyPostBoy is a local-first API backend and lightweight HTTP proxy built with Python and Django-compatible modules. Use it to save requests, organize collections, import cURL or Postman data, and execute outbound HTTP calls through a server-side proxy.

## Features

- Django-compatible routing, sessions, CSRF protection, and WSGI deployment.
- SQLite by default, with PostgreSQL-oriented Docker Compose support.
- Collection, request, snapshot, history, and environment-variable persistence.
- Server-side request execution for outbound HTTP calls.
- API token and session authentication helpers.

## Local development

Create a Python environment and install backend dependencies:

```bash
python -m venv venv
. venv/bin/activate
pip install -r requirements.txt
```

Install frontend dependencies and build the React app before starting the
backend-served UI:

```bash
npm install
npm run frontend:build
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

PyPostBoy includes separate Docker Compose entry points for local HTTP development and production-oriented PostgreSQL deployments.

### Local HTTP development

Use the SQLite development stack for local-only testing over plain HTTP. This file intentionally keeps developer-friendly defaults such as an HTTP origin and non-secure cookies:

```bash
docker compose -f docker-compose.dev.yml up --build
```

The local stack is exposed at `http://localhost:8080` by default. If port 8080 is already in use, set `POSTBOY_HTTP_PORT` when starting Compose, for example `POSTBOY_HTTP_PORT=8081 docker compose -f docker-compose.dev.yml up --build`, then visit `http://localhost:8081`. Do not use `docker-compose.dev.yml` for an internet-facing deployment.

### Production-oriented PostgreSQL

The default `docker-compose.yml` is production-oriented and fails fast when required secrets and origins are missing. Create an uncommitted `.env` from `.env.example`, then set at least:

- `POSTBOY_SECRET_KEY` to a long random value.
- `POSTGRES_PASSWORD` for the database container.
- `POSTBOY_DATABASE_URL` to a PostgreSQL DSN that matches the database credentials. URL-encode special characters in the password.
- `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS` to your production hostnames and HTTPS origins.

Production examples default `SESSION_COOKIE_SECURE=true` and `CSRF_COOKIE_SECURE=true`, so deploy behind TLS. The Compose nginx service binds to loopback at `127.0.0.1:8080` by default and expects a host-level TLS-terminating reverse proxy to handle public HTTPS traffic before forwarding to this stack over HTTP. The provided production override keeps that same loopback binding while documenting production hostname and origin settings:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.example.yml up -d --build
```

For quick production-like validation on a private machine, you can run the base stack directly after setting the required variables, then visit `http://127.0.0.1:8080`:

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

Start from `.env.example` and set production values explicitly in an uncommitted `.env` or secret store. Production-oriented Compose usage requires `POSTBOY_SECRET_KEY`, `POSTGRES_PASSWORD`, `POSTBOY_DATABASE_URL`, `ALLOWED_HOSTS`, `CORS_ALLOWED_ORIGINS`, and `CSRF_TRUSTED_ORIGINS`; missing values stop Compose before containers start. Use HTTPS origins for production TLS deployments and reserve plain HTTP origins for local development only.

## Security

PyPostBoy is intended for local development. The proxy forwards requests as provided, and saved secrets remain in the configured database. Do not expose an instance to public networks without adding appropriate authentication and network controls.
