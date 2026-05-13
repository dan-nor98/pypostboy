"""Shared fixtures for backend route and service tests."""

import os
import sqlite3
import tempfile

# The legacy compatibility module initializes a database at import time. Point it
# outside the repository before importing application modules.
os.environ.setdefault(
    "POSTBOY_DB_PATH",
    os.path.join(tempfile.gettempdir(), "postboy-pytest-bootstrap.db"),
)

import pytest

from pypostboy import create_app
from pypostboy.db.schema import initialize_schema
from pypostboy.db.serializers import timestamp
from pypostboy.repositories.collections import Collections
from pypostboy.repositories.request_instances import RequestInstances
from pypostboy.repositories.requests import Requests


def _create_test_user(conn, username):
    """Create a local test user and return it as a dict."""
    now = timestamp()
    cursor = conn.execute(
        """INSERT INTO users (
            username, email, password_hash, auth_provider, auth_subject, created_at, updated_at
        ) VALUES (?, ?, NULL, 'local', NULL, ?, ?)""",
        (username, f"{username}@example.test", now, now),
    )
    conn.commit()
    return dict(
        conn.execute("SELECT * FROM users WHERE id = ?", (cursor.lastrowid,)).fetchone()
    )


def _auth_headers(user):
    """Return request headers that authenticate as the supplied user row/dict/id."""
    user_id = user["id"] if isinstance(user, dict) else user
    return {"X-Postboy-User-Id": str(user_id)}


@pytest.fixture
def sqlite_connection(tmp_path, monkeypatch):
    """Provide an isolated SQLite database for each test."""
    db_path = tmp_path / "postboy-test.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    initialize_schema(conn.cursor())
    conn.commit()

    Collections.connection = conn
    Requests.connection = conn
    RequestInstances.connection = conn

    # Collection deletion still calls the compatibility singleton's save method.
    import pypostboy.db.connection as connection_module

    monkeypatch.setattr(connection_module.db, "conn", conn)

    yield conn

    Collections.connection = None
    Requests.connection = None
    RequestInstances.connection = None
    conn.close()


@pytest.fixture
def app(sqlite_connection):
    """Create a Django app configured for tests against the temp database."""
    return create_app(
        {
            "TESTING": True,
            "DATABASE": sqlite_connection,
            "WTF_CSRF_ENABLED": False,
        }
    )


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def user_a(sqlite_connection):
    """Primary authenticated test user."""
    return _create_test_user(sqlite_connection, "user-a")


@pytest.fixture
def user_b(sqlite_connection):
    """Secondary authenticated test user."""
    return _create_test_user(sqlite_connection, "user-b")


@pytest.fixture
def auth_headers():
    """Helper for building authenticated request headers for a test user."""
    return _auth_headers


@pytest.fixture
def user_a_headers(user_a, auth_headers):
    """Headers that authenticate route requests as user A."""
    return auth_headers(user_a)


@pytest.fixture
def user_b_headers(user_b, auth_headers):
    """Headers that authenticate route requests as user B."""
    return auth_headers(user_b)


@pytest.fixture
def collection(sqlite_connection, user_a):
    return Collections.create(
        user_a["id"], {"name": "Primary", "description": "Root collection"}
    )


@pytest.fixture
def request_record(collection, user_a):
    return Requests.create(
        user_a["id"],
        {
            "collection_id": collection["id"],
            "name": "List widgets",
            "method": "get",
            "url": "https://example.test/widgets",
            "headers": [{"key": "Accept", "value": "application/json"}],
        },
    )
