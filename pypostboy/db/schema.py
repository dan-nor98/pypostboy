"""Database table and index creation."""

from .migrations import create_users_table, migrate_ownership, migrate_request_instances


def create_tables(cursor, backend='sqlite'):
    """Create persistence tables if they do not already exist."""
    if backend == 'postgresql':
        create_postgres_tables(cursor)
        return

    create_users_table(cursor)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS collections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            parent_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS requests (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS request_instances (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
            response_status INTEGER,
            response_status_text TEXT DEFAULT '',
            response_headers TEXT DEFAULT '{}',
            response_body TEXT,
            response_time_ms INTEGER,
            response_size TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)


def create_postgres_tables(cursor):
    """Create PostgreSQL persistence tables if they do not already exist."""
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT NOT NULL UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT,
            auth_provider TEXT NOT NULL DEFAULT 'local',
            auth_subject TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS collections (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            name TEXT NOT NULL,
            description TEXT DEFAULT '',
            parent_id INTEGER REFERENCES collections(id) ON DELETE CASCADE,
            sort_order INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS requests (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS request_instances (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
            response_status INTEGER,
            response_status_text TEXT DEFAULT '',
            response_headers TEXT DEFAULT '{}',
            response_body TEXT,
            response_time_ms INTEGER,
            response_size TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)


def create_indexes(cursor):
    """Create persistence indexes if they do not already exist."""
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_collections_parent_id ON collections(parent_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_requests_user_id ON requests(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_requests_collection_id ON requests(collection_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_request_instances_user_id ON request_instances(user_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_request_instances_request_id ON request_instances(request_id)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_request_instances_updated_at ON request_instances(updated_at)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_collections_sort_order ON collections(sort_order)")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_requests_sort_order ON requests(sort_order)")


def initialize_schema(cursor, backend='sqlite'):
    """Create tables, run migrations, and ensure indexes exist."""
    create_tables(cursor, backend=backend)
    migrate_request_instances(cursor)
    migrate_ownership(cursor)
    create_indexes(cursor)
