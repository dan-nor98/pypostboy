"""Small database adapter helpers shared by repository code.

The application writes SQL with SQLite-style ``?`` placeholders by default so
local development and tests can keep using the standard sqlite3 module.  These
helpers adapt the handful of backend-specific differences that leak into call
sites, namely PostgreSQL placeholder syntax and insert ID retrieval.
"""

from collections.abc import Mapping

POSTGRES_BACKENDS = {"postgres", "postgresql"}


def backend_name(connection):
    """Return the normalized backend name for a DB-API-like connection."""
    return (getattr(connection, "backend", None) or "sqlite").lower()


def is_postgresql(connection):
    """Return True when the connection is backed by PostgreSQL."""
    return backend_name(connection) in POSTGRES_BACKENDS


def convert_placeholders(sql, connection):
    """Convert SQLite-style placeholders to the active backend's placeholder style."""
    if is_postgresql(connection):
        return sql.replace("?", "%s")
    return sql


def with_returning_id(sql, connection):
    """Append ``RETURNING id`` for PostgreSQL inserts that need generated IDs."""
    statement = convert_placeholders(sql, connection)
    if not is_postgresql(connection):
        return statement

    if " RETURNING " in statement.upper():
        return statement
    return f'{statement.rstrip().rstrip(";")} RETURNING id'


def execute(connection, sql, params=None, *, returning_id=False):
    """Execute SQL after applying backend-specific placeholder conversion."""
    statement = (
        with_returning_id(sql, connection)
        if returning_id
        else convert_placeholders(sql, connection)
    )
    return connection.execute(statement, tuple(params or ()))


def fetch_inserted_id(cursor, connection):
    """Return the ID produced by an insert cursor for SQLite or PostgreSQL."""
    if is_postgresql(connection):
        row = cursor.fetchone()
        if not row:
            return None
        return row_to_mapping(row)["id"]
    return cursor.lastrowid


def insert_and_get_id(connection, sql, params=None):
    """Execute an insert and return its generated primary key."""
    cursor = execute(connection, sql, params, returning_id=True)
    return fetch_inserted_id(cursor, connection)


def row_to_mapping(row):
    """Convert DB rows to mapping-compatible objects."""
    if row is None:
        return None
    if isinstance(row, Mapping):
        return row
    return dict(row)


def rows_to_mappings(rows):
    """Convert an iterable of DB rows to mapping-compatible objects."""
    return [row_to_mapping(row) for row in rows]
