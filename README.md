# PostBoy

PostBoy is a local-first API client and lightweight HTTP proxy built with Python and Django-compatible modules. Use it to save requests, organize collections, import cURL or Postman data, and inspect proxied responses from a browser UI.

## Screenshots

> Screenshot placeholders: replace these with current application captures before publishing.

| Request Builder | Collections | Response Viewer |
| --- | --- | --- |
| ![Request builder screenshot placeholder](docs/screenshots/request-builder-placeholder.svg) | ![Collections screenshot placeholder](docs/screenshots/collections-placeholder.svg) | ![Response viewer screenshot placeholder](docs/screenshots/response-viewer-placeholder.svg) |

## Features

- Organize API requests into nested collections.
- Build requests with custom methods, headers, auth, and body content.
- Import Postman collections and cURL commands.
- Send requests through the built-in local proxy.
- View status, timing, headers, and formatted response bodies.
- Store data locally in SQLite.

## Quick Start

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

Open `http://localhost:3001` in your browser.

On Windows, activate the virtual environment with:

```powershell
venv\Scripts\activate
```


## Docker

PostBoy includes Docker assets for both local SQLite development and production-like PostgreSQL runs. Both modes build the same image, install `requirements.txt`, and serve the WSGI app with Gunicorn.

### Dev SQLite mode

Use the development compose file when you want a quick local container with SQLite persistence:

```bash
docker compose -f docker-compose.dev.yml up --build
```

Open `http://localhost:3001` in your browser. SQLite data is stored in the named `postboy-sqlite-data` Docker volume at `/data/postboy-data.db` inside the container.

To use a different host port, set `PORT` before running compose:

```bash
PORT=8080 docker compose -f docker-compose.dev.yml up --build
```

### Production-like PostgreSQL mode

Use the default compose file to run PostBoy with a PostgreSQL service:

```bash
POSTBOY_SECRET_KEY=replace-with-a-long-random-value docker compose up --build
```

Open `http://localhost:3001` in your browser. PostgreSQL data is stored in the named `postboy-postgres-data` Docker volume.

To stop containers without deleting persisted data:

```bash
docker compose down
```

To remove the PostgreSQL volume as well:

```bash
docker compose down -v
```

### Docker environment variables and volumes

| Variable | Docker usage |
| --- | --- |
| `POSTBOY_CONFIG` | Set to `development` in `docker-compose.dev.yml` and `production` in `docker-compose.yml`. |
| `POSTBOY_DATABASE_URL` | Required for PostgreSQL mode; the default compose file points at the `db` service. Leave unset for SQLite mode. |
| `POSTBOY_DB_PATH` | SQLite database path for dev mode; `docker-compose.dev.yml` sets it to `/data/postboy-data.db`. |
| `POSTBOY_SECRET_KEY` | Required for signed sessions. Override the local defaults with a strong random value before sharing or deploying. |
| `PORT` | Container and host port, defaulting to `3001`. |

| Volume | Used by | Purpose |
| --- | --- | --- |
| `postboy-sqlite-data` | `docker-compose.dev.yml` | Persists the SQLite database under `/data`. |
| `postboy-postgres-data` | `docker-compose.yml` | Persists PostgreSQL data under `/var/lib/postgresql/data`. |

## Configuration

PostBoy works out of the box for local development. Useful environment variables:

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `3001` | Server port. |
| `POSTBOY_CONFIG` | `development` | Built-in config name or import path. |
| `POSTBOY_DB_PATH` | `postboy-data.db` | SQLite database path. |
| `POSTBOY_PROXY_TIMEOUT` | `30` | Proxy timeout in seconds. |
| `POSTBOY_MAX_CONTENT_LENGTH` | `10485760` | Maximum request/import payload size. |

Example:

```bash
PORT=8080 POSTBOY_CONFIG=production python app.py
```

## Project Layout

```text
app.py                  # Server entrypoint
requirements.txt        # Python dependencies
public/                 # Browser UI assets
pypostboy/              # Application package
pypostboy/routes/       # HTTP route handlers
pypostboy/services/     # Import, cURL parsing, and proxy logic
pypostboy/repositories/ # SQLite persistence layer
tests/                  # Backend test suite
```

## API Overview

| Area | Endpoints |
| --- | --- |
| Collections | `GET/POST /api/collections`, `GET/PUT/DELETE /api/collections/:id`, `POST /api/collections/:id/duplicate` |
| Requests | `GET/POST/PUT/DELETE /api/requests`, `GET /api/requests/:id`, `POST /api/requests/:id/duplicate`, `PUT /api/requests/:id/move` |
| Import | `POST /api/import` |
| Proxy | `POST /api/proxy` |

## Security Notes

PostBoy is intended for local development. The proxy forwards requests as provided, and saved secrets remain in the local SQLite database. Do not expose an instance to public networks without adding appropriate authentication and network controls.

## License

Add license information before distribution.
