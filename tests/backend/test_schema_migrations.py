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


def test_initialize_schema_creates_user_auth_columns_on_fresh_sqlite_schema(sqlite_connection):
    user_columns = {
        row["name"]: row
        for row in sqlite_connection.execute("PRAGMA table_info(users)").fetchall()
    }

    assert user_columns["last_login"]["notnull"] == 0
    assert user_columns["is_superuser"]["notnull"] == 1
    assert user_columns["is_superuser"]["dflt_value"] == "0"
    assert user_columns["is_staff"]["notnull"] == 1
    assert user_columns["is_staff"]["dflt_value"] == "0"
    assert user_columns["is_active"]["notnull"] == 1
    assert user_columns["is_active"]["dflt_value"] == "1"


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


class _FakeCursor:
    def __init__(self, backend='sqlite', table_columns_by_name=None):
        self.backend = backend
        self.connection = self
        self.statements = []
        self._rows = []
        self._table_columns_by_name = table_columns_by_name or {}

    def execute(self, sql, params=None):
        self.statements.append((sql, params))
        normalized_sql = ' '.join(sql.split()).lower()
        self._rows = []
        if 'information_schema.columns' in normalized_sql:
            table_name = params[0]
            self._rows = self._table_columns_by_name.get(table_name, [])
        elif normalized_sql.startswith('pragma table_info'):
            table_name = sql.split('(')[1].split(')')[0]
            self._rows = self._table_columns_by_name.get(table_name, [])
        elif normalized_sql.startswith('select id from users where username'):
            self._rows = [{'id': 1}]
        return self

    def fetchone(self):
        return self._rows.pop(0) if self._rows else None

    def fetchall(self):
        rows = self._rows
        self._rows = []
        return rows

    def commit(self):
        self.statements.append(('COMMIT', None))


def _postgres_column_rows(nullable_user_id='NO'):
    base_columns = [
        {'name': 'id', 'nullable': 'NO'},
        {'name': 'user_id', 'nullable': nullable_user_id},
        {'name': 'name', 'nullable': 'NO'},
        {'name': 'created_at', 'nullable': 'NO'},
        {'name': 'updated_at', 'nullable': 'NO'},
    ]
    return {
        'collections': base_columns,
        'requests': [
            *base_columns,
            {'name': 'collection_id', 'nullable': 'NO'},
        ],
        'request_instances': [
            *base_columns,
            {'name': 'request_id', 'nullable': 'NO'},
            {'name': 'response_status', 'nullable': 'YES'},
            {'name': 'response_status_text', 'nullable': 'YES'},
            {'name': 'response_headers', 'nullable': 'YES'},
            {'name': 'response_body', 'nullable': 'YES'},
            {'name': 'response_time_ms', 'nullable': 'YES'},
            {'name': 'response_size', 'nullable': 'YES'},
        ],
    }


def test_backend_schema_variants_use_backend_specific_identity_columns():
    sqlite_cursor = _FakeCursor()
    initialize_schema(sqlite_cursor, backend='sqlite')
    sqlite_sql = '\n'.join(sql for sql, _params in sqlite_cursor.statements)

    assert 'INTEGER PRIMARY KEY AUTOINCREMENT' in sqlite_sql
    assert 'GENERATED BY DEFAULT AS IDENTITY' not in sqlite_sql

    postgres_cursor = _FakeCursor(
        backend='postgresql',
        table_columns_by_name=_postgres_column_rows(),
    )
    initialize_schema(postgres_cursor, backend='postgresql')
    postgres_sql = '\n'.join(sql for sql, _params in postgres_cursor.statements)

    assert 'INTEGER GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY' in postgres_sql
    assert 'AUTOINCREMENT' not in postgres_sql
    assert 'SERIAL PRIMARY KEY' not in postgres_sql


def test_initialize_schema_adds_missing_auth_columns_on_postgres_path():
    postgres_cursor = _FakeCursor(
        backend='postgresql',
        table_columns_by_name={
            **_postgres_column_rows(),
            'users': [
                {'name': 'id', 'nullable': 'NO'},
                {'name': 'username', 'nullable': 'NO'},
                {'name': 'email', 'nullable': 'YES'},
                {'name': 'password_hash', 'nullable': 'YES'},
                {'name': 'auth_provider', 'nullable': 'NO'},
                {'name': 'auth_subject', 'nullable': 'YES'},
                {'name': 'created_at', 'nullable': 'NO'},
                {'name': 'updated_at', 'nullable': 'NO'},
            ],
        },
    )

    initialize_schema(postgres_cursor, backend='postgresql')
    postgres_sql = '\n'.join(sql for sql, _params in postgres_cursor.statements)

    assert 'ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL' in postgres_sql
    assert 'ALTER TABLE users ADD COLUMN is_superuser BOOLEAN NOT NULL DEFAULT FALSE' in postgres_sql
    assert 'ALTER TABLE users ADD COLUMN is_staff BOOLEAN NOT NULL DEFAULT FALSE' in postgres_sql
    assert 'ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE' in postgres_sql


def test_initialize_schema_migrates_legacy_user_auth_columns_and_is_idempotent(tmp_path):
    db_path = tmp_path / "legacy_auth.db"
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.executescript(
        """
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            auth_provider TEXT NOT NULL DEFAULT 'local',
            auth_subject TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );
        """
    )
    conn.commit()

    initialize_schema(conn.cursor())
    initialize_schema(conn.cursor())
    conn.commit()

    user_columns = {
        row["name"]: row
        for row in conn.execute("PRAGMA table_info(users)").fetchall()
    }
    assert user_columns["last_login"]["notnull"] == 0
    assert user_columns["is_superuser"]["notnull"] == 1
    assert user_columns["is_superuser"]["dflt_value"] == "0"
    assert user_columns["is_staff"]["notnull"] == 1
    assert user_columns["is_staff"]["dflt_value"] == "0"
    assert user_columns["is_active"]["notnull"] == 1
    assert user_columns["is_active"]["dflt_value"] == "1"
    assert list(user_columns).count("last_login") == 1
    assert list(user_columns).count("is_superuser") == 1
    assert list(user_columns).count("is_staff") == 1
    assert list(user_columns).count("is_active") == 1
    conn.close()


def test_table_column_introspection_uses_backend_specific_queries():
    sqlite_cursor = _FakeCursor(table_columns_by_name={
        'collections': [{'name': 'user_id', 'notnull': 1}],
    })
    from pypostboy.db.migrations import table_columns

    sqlite_columns = table_columns(sqlite_cursor, 'collections')

    assert sqlite_columns['user_id']['notnull'] == 1
    assert any('PRAGMA table_info(collections)' in sql for sql, _params in sqlite_cursor.statements)

    postgres_cursor = _FakeCursor(
        backend='postgresql',
        table_columns_by_name={
            'collections': [{'name': 'user_id', 'nullable': 'NO'}],
        },
    )

    postgres_columns = table_columns(postgres_cursor, 'collections')

    assert postgres_columns['user_id']['notnull'] is True
    assert any('information_schema.columns' in sql for sql, _params in postgres_cursor.statements)
    assert not any('PRAGMA table_info' in sql for sql, _params in postgres_cursor.statements)


def test_postgresql_schema_initialization_does_not_issue_sqlite_pragmas():
    cursor = _FakeCursor(
        backend='postgresql',
        table_columns_by_name=_postgres_column_rows(),
    )

    initialize_schema(cursor, backend='postgresql')

    all_sql = '\n'.join(sql for sql, _params in cursor.statements)
    assert 'PRAGMA foreign_keys' not in all_sql
    assert 'PRAGMA table_info' not in all_sql
    assert 'information_schema.columns' in all_sql


def test_postgresql_ownership_migration_enforces_nullable_user_columns():
    cursor = _FakeCursor(
        backend='postgresql',
        table_columns_by_name=_postgres_column_rows(nullable_user_id='YES'),
    )

    initialize_schema(cursor, backend='postgresql')

    all_sql = '\n'.join(sql for sql, _params in cursor.statements)
    assert 'PRAGMA foreign_keys' not in all_sql
    assert 'ALTER TABLE collections ALTER COLUMN user_id SET NOT NULL' in all_sql
    assert 'ALTER TABLE requests ALTER COLUMN user_id SET NOT NULL' in all_sql
    assert 'ALTER TABLE request_instances ALTER COLUMN user_id SET NOT NULL' in all_sql
