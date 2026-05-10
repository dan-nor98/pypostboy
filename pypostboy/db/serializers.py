"""Serialization helpers for SQLite persistence values."""

import json
from datetime import datetime, timezone


def timestamp():
    return datetime.now(timezone.utc).isoformat()


def safe_parse(val, fallback=None):
    """Safely parse JSON string to object."""
    if val is None:
        return fallback
    if isinstance(val, (dict, list)):
        return val
    if isinstance(val, str):
        try:
            return json.loads(val)
        except (json.JSONDecodeError, TypeError):
            return fallback
    return fallback


def safe_stringify(val, fallback='[]'):
    """Safely convert object to JSON string."""
    if val is None:
        return fallback
    if isinstance(val, str):
        try:
            json.loads(val)
            return val
        except (json.JSONDecodeError, TypeError):
            return fallback
    try:
        return json.dumps(val)
    except (TypeError, ValueError):
        return fallback


def stringify_response_body(val):
    """Store response body while preserving plain text and JSON values."""
    if val is None:
        return None
    if isinstance(val, str):
        return val
    try:
        return json.dumps(val)
    except (TypeError, ValueError):
        return str(val)


def parse_response_body(val):
    """Parse response body JSON when possible, otherwise return stored text."""
    if val is None:
        return None
    if not isinstance(val, str):
        return val
    try:
        return json.loads(val)
    except (json.JSONDecodeError, TypeError):
        return val


def parse_json_or_text(val, fallback=None):
    """Parse JSON text when possible, otherwise return the original text."""
    if val is None:
        return fallback
    parsed = safe_parse(val, None)
    return parsed if parsed is not None else val


def row_to_dict(row):
    """Convert sqlite3.Row to dict."""
    if row is None:
        return None
    return dict(row)


def rows_to_list(rows):
    """Convert list of sqlite3.Row to list of dicts."""
    return [dict(row) for row in rows]
