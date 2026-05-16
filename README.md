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
