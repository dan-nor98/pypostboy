"""SQLite connection lifecycle and transaction helpers."""

import os
import sqlite3
from contextlib import contextmanager
from threading import Lock

from .schema import initialize_schema

DB_PATH = os.path.abspath(
    os.environ.get(
        'POSTBOY_DB_PATH',
        os.path.join(os.path.dirname(__file__), '..', '..', 'postboy-data.db')
    )
)


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
        self._ready = False
        self.init_database()

    def init_database(self):
        """Initialize database and create tables."""
        self.conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA foreign_keys=ON")

        initialize_schema(self.conn.cursor())

        self.conn.commit()
        self._ready = True
        print(f'[DB] SQLite database initialized at {DB_PATH}')

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


def get_connection():
    """Return the active SQLite connection."""
    return db.conn


@contextmanager
def transaction():
    """Run multiple statements in a SQLite transaction using the active database."""
    with db.transaction() as conn:
        yield conn
