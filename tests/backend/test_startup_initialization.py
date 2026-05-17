"""Coverage for one-shot startup database initialization."""

import pytest

import pypostboy.app as app_module
import pypostboy.db.connection as connection_module
from pypostboy.db.startup import initialize_database_from_config


class _FakePostgresConnection:
    backend = "postgresql"

    def __init__(self, database_url):
        self.database_url = database_url
        self.commits = 0
        self.closed = False

    def cursor(self):
        return object()

    def commit(self):
        self.commits += 1

    def close(self):
        self.closed = True


@pytest.fixture(autouse=True)
def reset_database_singleton():
    connection_module.db.close()
    yield
    connection_module.db.close()


def test_create_app_skips_postgresql_schema_initialization(monkeypatch):
    """Gunicorn worker imports should connect without running schema setup."""
    schema_calls = []

    monkeypatch.setattr(app_module, "get_wsgi_application", lambda: object())
    monkeypatch.setattr(connection_module, "PostgresConnection", _FakePostgresConnection)
    monkeypatch.setattr(
        connection_module,
        "initialize_database_schema",
        lambda cursor, backend="sqlite": schema_calls.append((cursor, backend)),
    )

    app = app_module.create_app(
        {
            "DB_BACKEND": "postgresql",
            "DATABASE_URL": "postgresql://postboy:test@db/postboy-worker",
        }
    )

    assert app.config["DB_BACKEND"] == "postgresql"
    assert connection_module.db.backend == "postgresql"
    assert schema_calls == []


def test_create_app_keeps_sqlite_automatic_schema_initialization(monkeypatch):
    """Local SQLite startup should still initialize schema automatically."""
    schema_calls = []

    monkeypatch.setattr(app_module, "get_wsgi_application", lambda: object())
    monkeypatch.setattr(
        connection_module,
        "initialize_database_schema",
        lambda cursor, backend="sqlite": schema_calls.append((cursor, backend)),
    )

    app_module.create_app({"DB_BACKEND": "sqlite", "DATABASE_PATH": ":memory:"})

    assert len(schema_calls) == 1
    assert schema_calls[0][1] == "sqlite"
    assert connection_module.db.backend == "sqlite"


def test_explicit_startup_initializer_runs_postgresql_schema_once(monkeypatch):
    """The Docker entrypoint path should run the existing schema initializer once."""
    schema_calls = []

    monkeypatch.setattr(connection_module, "PostgresConnection", _FakePostgresConnection)
    monkeypatch.setattr(
        connection_module,
        "initialize_database_schema",
        lambda cursor, backend="sqlite": schema_calls.append((cursor, backend)),
    )

    config = initialize_database_from_config(
        {
            "DB_BACKEND": "postgresql",
            "DATABASE_URL": "postgresql://postboy:test@db/postboy-startup",
        }
    )

    assert config["DB_BACKEND"] == "postgresql"
    assert len(schema_calls) == 1
    assert schema_calls[0][1] == "postgresql"
    assert connection_module.db.conn.commits == 1
