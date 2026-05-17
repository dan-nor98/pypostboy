"""Database adapter helper coverage."""

import sqlite3

from pypostboy.db.adapter import (
    convert_placeholders,
    execute,
    insert_and_get_id,
    row_to_mapping,
    with_returning_id,
)


class _FakePostgresCursor:
    def __init__(self, rows=None):
        self.lastrowid = None
        self._rows = list(rows or [])

    def fetchone(self):
        return self._rows.pop(0) if self._rows else None


class _FakePostgresConnection:
    backend = "postgresql"

    def __init__(self):
        self.statements = []

    def execute(self, sql, params=None):
        self.statements.append((sql, params))
        return _FakePostgresCursor([{"id": 42}])


def test_adapter_defaults_to_sqlite_placeholder_behavior():
    connection = sqlite3.connect(":memory:")

    assert convert_placeholders("SELECT * FROM users WHERE id = ?", connection) == (
        "SELECT * FROM users WHERE id = ?"
    )
    assert with_returning_id("INSERT INTO users (username) VALUES (?)", connection) == (
        "INSERT INTO users (username) VALUES (?)"
    )


def test_adapter_converts_postgresql_placeholders_and_returning_id():
    connection = _FakePostgresConnection()

    assert convert_placeholders("SELECT * FROM users WHERE id = ?", connection) == (
        "SELECT * FROM users WHERE id = %s"
    )
    assert with_returning_id("INSERT INTO users (username) VALUES (?)", connection) == (
        "INSERT INTO users (username) VALUES (%s) RETURNING id"
    )


def test_insert_and_get_id_uses_lastrowid_for_sqlite():
    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    connection.execute(
        "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT)"
    )

    inserted_id = insert_and_get_id(
        connection,
        "INSERT INTO users (username) VALUES (?)",
        ("alice",),
    )

    assert inserted_id == 1
    assert (
        connection.execute(
            "SELECT username FROM users WHERE id = ?", (inserted_id,)
        ).fetchone()["username"]
        == "alice"
    )


def test_insert_and_get_id_uses_returning_id_for_postgresql():
    connection = _FakePostgresConnection()

    inserted_id = insert_and_get_id(
        connection,
        "INSERT INTO users (username) VALUES (?)",
        ("alice",),
    )

    assert inserted_id == 42
    assert connection.statements == [
        ("INSERT INTO users (username) VALUES (%s) RETURNING id", ("alice",)),
    ]


def test_execute_converts_params_to_tuple_and_row_to_mapping_supports_rows():
    connection = sqlite3.connect(":memory:")
    connection.row_factory = sqlite3.Row
    connection.execute(
        "CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT)"
    )
    connection.execute("INSERT INTO users (username) VALUES (?)", ("alice",))

    row = execute(
        connection,
        "SELECT * FROM users WHERE username = ?",
        ["alice"],
    ).fetchone()

    assert row_to_mapping(row)["username"] == "alice"
    assert row_to_mapping({"username": "bob"})["username"] == "bob"
