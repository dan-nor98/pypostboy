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
from pypostboy.repositories.collections import Collections
from pypostboy.repositories.request_instances import RequestInstances
from pypostboy.repositories.requests import Requests


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
    """Create a Flask app configured for tests against the temp database."""
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
def collection(sqlite_connection):
    return Collections.create({"name": "Primary", "description": "Root collection"})


@pytest.fixture
def request_record(collection):
    return Requests.create(
        {
            "collection_id": collection["id"],
            "name": "List widgets",
            "method": "get",
            "url": "https://example.test/widgets",
            "headers": [{"key": "Accept", "value": "application/json"}],
        }
    )
