"""SQLite connection lifecycle and transaction helpers."""

import os
import sqlite3
from contextlib import contextmanager
from threading import Lock

from pypostboy.config import DEFAULT_DATABASE_PATH

from .schema import initialize_schema

DB_PATH = os.path.abspath(os.environ.get('POSTBOY_DB_PATH', DEFAULT_DATABASE_PATH))


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
        self._owns_connection = False
        self._ready = False

    def init_database(self, database_path=None):
        """Initialize database and create tables at the configured path."""
        global DB_PATH

        resolved_path = os.path.abspath(database_path or DB_PATH)
        if self._ready and self._owns_connection and self.database_path == resolved_path:
            return

        self.close()
        os.makedirs(os.path.dirname(resolved_path), exist_ok=True)

        self.conn = sqlite3.connect(resolved_path, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")

        initialize_schema(self.conn.cursor())

        self.conn.commit()
        self.database_path = resolved_path
        self._owns_connection = True
        self._ready = True
        DB_PATH = resolved_path
        print(f'[DB] SQLite database initialized at {resolved_path}')

    def use_connection(self, connection):
        """Use an externally managed SQLite connection."""
        if self.conn is not connection:
            self.close()
        self.conn = connection
        self.database_path = None
        self._owns_connection = False
        self._ready = connection is not None

    def close(self):
        """Close the managed SQLite connection when this object owns it."""
        if self.conn and self._owns_connection:
            self.conn.close()
        self.conn = None
        self.database_path = None
        self._owns_connection = False
        self._ready = False

    def is_ready(self):
        return self._ready

    def save(self):
        """Commit changes (sqlite3 auto-commits but this ensures it)."""
        if self.conn:
            self.conn.commit()

    @contextmanager
    def transaction(self):
        """Run multiple statements in a SQLite transaction."""
        if not self.conn:
            raise RuntimeError('Database connection is not initialized')
        with self.conn:
            yield self.conn


# Database access singleton retained for compatibility with existing callers.
db = Database()


def configure_database(config):
    """Configure the compatibility singleton from Flask app config."""
    external_connection = config.get('DATABASE')
    if external_connection is not None:
        db.use_connection(external_connection)
        return

    db.init_database(config.get('DATABASE_PATH', DB_PATH))


def get_connection():
    """Return the active SQLite connection."""
    if not db.conn:
        db.init_database(DB_PATH)
    return db.conn


@contextmanager
def transaction():
    """Run multiple statements in a SQLite transaction using the active database."""
    get_connection()
    with db.transaction() as conn:
        yield conn
