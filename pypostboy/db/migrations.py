"""SQLite schema migration helpers."""

REQUEST_INSTANCE_COLUMN_MIGRATIONS = {
    'response_status': 'INTEGER',
    'response_status_text': "TEXT DEFAULT ''",
    'response_headers': "TEXT DEFAULT '{}'",
    'response_body': 'TEXT',
    'response_time_ms': 'INTEGER',
    'response_size': "TEXT DEFAULT ''",
}


def migrate_request_instances(cursor):
    """Add request instance columns introduced after initial SQLite releases."""
    existing_columns = {
        row['name'] for row in cursor.execute("PRAGMA table_info(request_instances)").fetchall()
    }

    for column, definition in REQUEST_INSTANCE_COLUMN_MIGRATIONS.items():
        if column not in existing_columns:
            cursor.execute(f"ALTER TABLE request_instances ADD COLUMN {column} {definition}")
