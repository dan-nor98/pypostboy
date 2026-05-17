"""Database connection lifecycle and transaction helpers."""

import logging
import os
import re
import sqlite3
from contextlib import contextmanager
from threading import Lock
from urllib.parse import urlparse, unquote

from pypostboy.config import (
    DEFAULT_DATABASE_PATH,
    DEFAULT_DATABASE_URL,
    get_database_backend,
)

from .schema import initialize_schema

logger = logging.getLogger(__name__)

DB_PATH = os.path.abspath(os.environ.get('POSTBOY_DB_PATH', DEFAULT_DATABASE_PATH))
DB_URL = os.environ.get('POSTBOY_DATABASE_URL', DEFAULT_DATABASE_URL)
DB_BACKEND = get_database_backend(DB_URL, os.environ.get('POSTBOY_DB_BACKEND'))

_POSTGRES_INSERT_RE = re.compile(
    r'^\s*INSERT\s+INTO\s+(users|collections|requests|request_instances)\b',
    re.IGNORECASE,
)


def _sqlite_path_from_url(database_url):
    """Resolve a sqlite:// URL to a filesystem path."""
    if not database_url:
        return None
    parsed = urlparse(database_url)
    if parsed.scheme != 'sqlite':
        return None
    if database_url == 'sqlite:///:memory:' or parsed.path == '/:memory:':
        return ':memory:'
    if parsed.netloc and parsed.netloc not in {'', 'localhost'}:
        return os.path.abspath(unquote(f'//{parsed.netloc}{parsed.path}'))
    return os.path.abspath(unquote(parsed.path or DEFAULT_DATABASE_PATH))


class PostgresCursor:
    """Small sqlite-compatible cursor facade backed by psycopg."""

    def __init__(self, connection, cursor=None):
        self.connection = connection
        self._cursor = cursor or connection.raw.cursor()
        self.lastrowid = None
        self._prefetched_rows = None

    def execute(self, sql, params=None):
        """Execute SQL using sqlite-style placeholders for compatibility."""
        self.lastrowid = None
        self._prefetched_rows = None
        statement = self._prepare_statement(sql)
        self._cursor.execute(statement, tuple(params or ()))
        if self._should_capture_lastrowid(sql):
            row = self._cursor.fetchone()
            if row:
                self.lastrowid = row['id']
        return self

    def fetchone(self):
        if self._prefetched_rows is not None:
            return self._prefetched_rows.pop(0) if self._prefetched_rows else None
        return self._cursor.fetchone()

    def fetchall(self):
        if self._prefetched_rows is not None:
            rows = self._prefetched_rows
            self._prefetched_rows = []
            return rows
        return self._cursor.fetchall()

    def close(self):
        self._cursor.close()

    def _prepare_statement(self, sql):
        statement = sql.replace('?', '%s')
        if self._should_capture_lastrowid(statement):
            statement = f'{statement.rstrip().rstrip(";")} RETURNING id'
        return statement

    def _should_capture_lastrowid(self, sql):
        upper_sql = sql.upper()
        if ' RETURNING ' in upper_sql:
            return False
        if ' SELECT ' in upper_sql:
            return False
        return bool(_POSTGRES_INSERT_RE.match(sql))


class PostgresConnection:
    """sqlite-like connection facade for repository code using PostgreSQL."""

    backend = 'postgresql'

    def __init__(self, database_url):
        from psycopg import connect
        from psycopg.rows import dict_row

        self.database_url = database_url
        self.raw = connect(database_url, row_factory=dict_row)

    def cursor(self):
        return PostgresCursor(self)

    def execute(self, sql, params=None):
        cursor = self.cursor()
        return cursor.execute(sql, params)

    def commit(self):
        self.raw.commit()

    def rollback(self):
        self.raw.rollback()

    def close(self):
        self.raw.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        if exc_type is None:
            self.commit()
        else:
            self.rollback()
        return False


class Database:
    _instance = None
    _lock = Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    instance = super().__new__(cls)
                    instance._initialized = False
                    cls._instance = instance
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self.conn = None
        self.database_path = None
        self.database_url = None
        self.backend = None
        self._owns_connection = False
        self._ready = False

    def init_database(self, database_path=None, database_url=None, backend=None):
        """Initialize SQLite or PostgreSQL and create tables."""
        global DB_PATH, DB_URL, DB_BACKEND

        resolved_url = database_url or DB_URL
        selected_backend = get_database_backend(resolved_url, backend or DB_BACKEND)

        if selected_backend == 'postgresql':
            self._init_postgres(resolved_url)
            DB_URL = resolved_url
            DB_BACKEND = selected_backend
            return

        sqlite_path = database_path or _sqlite_path_from_url(resolved_url) or DB_PATH
        self._init_sqlite(sqlite_path)
        DB_PATH = self.database_path
        DB_URL = (
            f'sqlite:///{self.database_path}'
            if self.database_path != ':memory:'
            else 'sqlite:///:memory:'
        )
        DB_BACKEND = selected_backend

    def _init_sqlite(self, database_path):
        """Initialize database and create tables at the configured path."""
        resolved_path = (
            ':memory:'
            if database_path == ':memory:'
            else os.path.abspath(database_path)
        )
        if (
            self._ready
            and self._owns_connection
            and self.backend == 'sqlite'
            and self.database_path == resolved_path
        ):
            return

        self.close()
        if resolved_path != ':memory:':
            os.makedirs(os.path.dirname(resolved_path), exist_ok=True)

        self.conn = sqlite3.connect(resolved_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")

        initialize_schema(self.conn.cursor(), backend='sqlite')

        self.conn.commit()
        self.database_path = resolved_path
        self.database_url = None
        self.backend = 'sqlite'
        self._owns_connection = True
        self._ready = True
        logger.info('SQLite database initialized at %s', resolved_path)

    def _init_postgres(self, database_url):
        """Initialize database and create tables at the configured PostgreSQL URL."""
        if not database_url:
            raise RuntimeError(
                'POSTBOY_DATABASE_URL is required when POSTBOY_DB_BACKEND=postgresql'
            )
        if (
            self._ready
            and self._owns_connection
            and self.backend == 'postgresql'
            and self.database_url == database_url
        ):
            return

        self.close()
        self.conn = PostgresConnection(database_url)
        initialize_schema(self.conn.cursor(), backend='postgresql')
        self.conn.commit()
        self.database_path = None
        self.database_url = database_url
        self.backend = 'postgresql'
        self._owns_connection = True
        self._ready = True
        logger.info('PostgreSQL database initialized')

    def use_connection(self, connection):
        """Use an externally managed database connection."""
        if self.conn is not connection:
            self.close()
        self.conn = connection
        self.database_path = None
        self.database_url = getattr(connection, 'database_url', None)
        self.backend = getattr(connection, 'backend', 'sqlite')
        self._owns_connection = False
        self._ready = connection is not None

    def close(self):
        """Close the managed database connection when this object owns it."""
        if self.conn and self._owns_connection:
            self.conn.close()
        self.conn = None
        self.database_path = None
        self.database_url = None
        self.backend = None
        self._owns_connection = False
        self._ready = False

    def is_ready(self):
        return self._ready

    def save(self):
        """Commit changes."""
        if self.conn:
            self.conn.commit()

    @contextmanager
    def transaction(self):
        """Run multiple statements in a database transaction."""
        if not self.conn:
            raise RuntimeError('Database connection is not initialized')
        with self.conn:
            yield self.conn


# Database access singleton retained for compatibility with existing callers.
db = Database()


def configure_database(config):
    """Configure the compatibility singleton from Django app config."""
    external_connection = config.get('DATABASE')
    if external_connection is not None:
        db.use_connection(external_connection)
        return

    db.init_database(
        database_path=config.get('DATABASE_PATH', DB_PATH),
        database_url=(
            config.get('DATABASE_URL')
            or config.get('POSTBOY_DATABASE_URL')
            or DB_URL
        ),
        backend=config.get('DB_BACKEND') or config.get('POSTBOY_DB_BACKEND') or DB_BACKEND,
    )


def get_connection():
    """Return the active database connection."""
    if not db.conn:
        db.init_database(DB_PATH, DB_URL, DB_BACKEND)
    return db.conn


@contextmanager
def transaction():
    """Run multiple statements in a transaction using the active database."""
    get_connection()
    with db.transaction() as conn:
        yield conn
