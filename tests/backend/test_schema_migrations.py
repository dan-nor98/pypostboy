"""Schema migration coverage for user ownership columns."""

import sqlite3

from pypostboy.db.schema import initialize_schema
from pypostboy.repositories.collections import Collections
from pypostboy.repositories.request_instances import RequestInstances
from pypostboy.repositories.requests import Requests


def _column(conn, table_name, column_name):
    return next(
        row
        for row in conn.execute(f"PRAGMA table_info({table_name})").fetchall()
        if row["name"] == column_name
    )


def _index_names(conn, table_name):
    return {row["name"] for row in conn.execute(f"PRAGMA index_list({table_name})").fetchall()}


def test_initialize_schema_creates_user_ownership_columns_and_indexes(sqlite_connection):
    assert sqlite_connection.execute(
        "SELECT username, email FROM users WHERE username = 'local_user'"
    ).fetchone()["email"] == "local@pypostboy.invalid"

    for table_name in ("collections", "requests", "request_instances"):
        user_id = _column(sqlite_connection, table_name, "user_id")
        assert user_id["type"] == "INTEGER"
        assert user_id["notnull"] == 1

    assert "idx_collections_user_id" in _index_names(sqlite_connection, "collections")
    assert "idx_requests_user_id" in _index_names(sqlite_connection, "requests")
    assert "idx_request_instances_user_id" in _index_names(sqlite_connection, "request_instances")


def test_repositories_populate_direct_user_ownership(sqlite_connection):
    collection = Collections.create({"name": "Owned"})
    request = Requests.create({"collection_id": collection["id"], "name": "Owned request"})
    instance = RequestInstances.create(request["id"], {"name": "Owned instance"})

    assert collection["user_id"] == request["user_id"] == instance["user_id"]


def test_ownership_migration_assigns_legacy_data_to_default_local_user(tmp_path):
    db_path = tmp_path / "legacy.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(
        """
        CREATE TABLE collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            parent_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            method TEXT NOT NULL DEFAULT 'GET',
            url TEXT DEFAULT '',
            headers TEXT DEFAULT '[]',
            body_type TEXT DEFAULT 'none',
            body_content TEXT DEFAULT '',
            body_raw_type TEXT DEFAULT 'application/json',
            form_data TEXT DEFAULT '[]',
            auth_type TEXT DEFAULT 'none',
            auth_data TEXT DEFAULT '{}',
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        CREATE TABLE request_instances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            method TEXT NOT NULL DEFAULT 'GET',
            url TEXT DEFAULT '',
            headers TEXT DEFAULT '[]',
            body_type TEXT DEFAULT 'none',
            body_content TEXT DEFAULT '',
            body_raw_type TEXT DEFAULT 'application/json',
            form_data TEXT DEFAULT '[]',
            auth_type TEXT DEFAULT 'none',
            auth_data TEXT DEFAULT '{}',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        INSERT INTO collections (name, created_at, updated_at) VALUES ('Legacy collection', 'now', 'now');
        INSERT INTO requests (collection_id, name, created_at, updated_at) VALUES (1, 'Legacy request', 'now', 'now');
        INSERT INTO request_instances (request_id, name, created_at, updated_at) VALUES (1, 'Legacy instance', 'now', 'now');
        """
    )
    conn.commit()

    initialize_schema(conn.cursor())
    conn.commit()

    local_user = conn.execute("SELECT id FROM users WHERE username = 'local_user'").fetchone()
    assert local_user is not None
    for table_name in ("collections", "requests", "request_instances"):
        assert _column(conn, table_name, "user_id")["notnull"] == 1
        assert conn.execute(f"SELECT user_id FROM {table_name}").fetchone()["user_id"] == local_user["id"]

    assert conn.execute("PRAGMA foreign_key_check").fetchall() == []
    conn.close()
