"""Request instance repository methods."""

from pypostboy.db.connection import get_connection
from pypostboy.db.migrations import ensure_default_local_user
from pypostboy.db.serializers import (
    parse_json_or_text,
    parse_response_body,
    safe_parse,
    safe_stringify,
    stringify_response_body,
    timestamp,
)
from pypostboy.repositories.requests import Requests


class RequestInstances:
    connection = None

    @classmethod
    def _conn(cls):
        return cls.connection or get_connection()

    @staticmethod
    def _resolve_user_id(conn, user_id=None):
        return int(user_id) if user_id is not None else ensure_default_local_user(conn.cursor())

    @staticmethod
    def _row_to_instance(row):
        """Convert a request_instances row into an API-ready dict."""
        if not row:
            return None

        result = dict(row)
        result['headers'] = safe_parse(result['headers'], [])
        result['form_data'] = safe_parse(result['form_data'], [])
        result['auth_data'] = safe_parse(result['auth_data'], {})
        result['response_headers'] = parse_json_or_text(result.get('response_headers'), {})
        result['response_body'] = parse_response_body(result.get('response_body'))
        return result

    @staticmethod
    def get_by_id(id, user_id=None):
        """Get a single user-owned saved request instance by ID."""
        conn = RequestInstances._conn()
        user_id = RequestInstances._resolve_user_id(conn, user_id)
        row = conn.execute(
            "SELECT * FROM request_instances WHERE id = ? AND user_id = ?",
            (id, user_id)
        ).fetchone()
        return RequestInstances._row_to_instance(row)

    @staticmethod
    def get_by_request(request_id, user_id=None):
        """Get user-owned saved instances for a user-owned request, newest first."""
        conn = RequestInstances._conn()
        user_id = RequestInstances._resolve_user_id(conn, user_id)
        request_obj = Requests.get_by_id(request_id, user_id)
        if not request_obj:
            raise ValueError('Request not found')

        rows = conn.execute(
            """SELECT * FROM request_instances
               WHERE request_id = ? AND user_id = ?
               ORDER BY updated_at DESC, id DESC""",
            (request_id, user_id)
        ).fetchall()
        return [RequestInstances._row_to_instance(row) for row in rows]

    @staticmethod
    def create(request_id, user_id=None, data=None):
        """Create a saved request instance from editor state for a user."""
        conn = RequestInstances._conn()
        if data is None:
            data = user_id or {}
            user_id = None
        data = data or {}
        user_id = RequestInstances._resolve_user_id(conn, user_id)
        request_obj = Requests.get_by_id(request_id, user_id)
        if not request_obj:
            raise ValueError('Request not found')

        name = (data.get('name') or '').strip()
        if not name:
            raise ValueError('name is required')

        now = timestamp()
        cursor = conn.execute(
            """INSERT INTO request_instances (
                user_id, request_id, name, method, url, headers,
                body_type, body_content, body_raw_type, form_data,
                auth_type, auth_data, response_status, response_status_text,
                response_headers, response_body, response_time_ms, response_size,
                created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                request_id,
                name,
                data.get('method', request_obj.get('method', 'GET')).upper(),
                data.get('url', request_obj.get('url', '')),
                safe_stringify(data.get('headers', request_obj.get('headers', [])), '[]'),
                data.get('body_type', request_obj.get('body_type', 'none')),
                data.get('body_content', data.get('body_raw', request_obj.get('body_content', ''))),
                data.get('body_raw_type', request_obj.get('body_raw_type', 'application/json')),
                safe_stringify(data.get('form_data', request_obj.get('form_data', [])), '[]'),
                data.get('auth_type', request_obj.get('auth_type', 'none')),
                safe_stringify(data.get('auth_data', request_obj.get('auth_data', {})), '{}'),
                data.get('response_status'),
                data.get('response_status_text', ''),
                stringify_response_body(data.get('response_headers', {})),
                stringify_response_body(data.get('response_body')),
                data.get('response_time_ms'),
                data.get('response_size', ''),
                now,
                now
            )
        )
        conn.commit()
        return RequestInstances.get_by_id(cursor.lastrowid, user_id)

    @staticmethod
    def update(id, user_id=None, data=None):
        """Update a user-owned saved request instance."""
        conn = RequestInstances._conn()
        if data is None:
            data = user_id or {}
            user_id = None
        user_id = RequestInstances._resolve_user_id(conn, user_id)
        instance = RequestInstances.get_by_id(id, user_id)
        if not instance:
            raise ValueError('Request instance not found')

        updates = []
        params = []
        field_mapping = {
            'name': 'name',
            'method': 'method',
            'url': 'url',
            'body_type': 'body_type',
            'body_content': 'body_content',
            'body_raw': 'body_content',
            'body_raw_type': 'body_raw_type',
            'auth_type': 'auth_type'
        }

        for key, db_field in field_mapping.items():
            if key in data:
                value = data[key]
                if key == 'name':
                    value = (value or '').strip()
                    if not value:
                        raise ValueError('name is required')
                if key == 'method':
                    value = value.upper()
                updates.append(f'{db_field} = ?')
                params.append(value)

        if 'headers' in data:
            updates.append('headers = ?')
            params.append(safe_stringify(data['headers'], '[]'))
        if 'form_data' in data:
            updates.append('form_data = ?')
            params.append(safe_stringify(data['form_data'], '[]'))
        if 'auth_data' in data:
            updates.append('auth_data = ?')
            params.append(safe_stringify(data['auth_data'], '{}'))

        response_field_mapping = {
            'response_status': 'response_status',
            'response_status_text': 'response_status_text',
            'response_time_ms': 'response_time_ms',
            'response_size': 'response_size',
        }
        for key, db_field in response_field_mapping.items():
            if key in data:
                updates.append(f'{db_field} = ?')
                params.append(data[key])

        if 'response_headers' in data:
            updates.append('response_headers = ?')
            params.append(stringify_response_body(data['response_headers']))
        if 'response_body' in data:
            updates.append('response_body = ?')
            params.append(stringify_response_body(data['response_body']))

        if not updates:
            return instance

        updates.append('updated_at = ?')
        params.append(timestamp())
        params.extend([id, user_id])

        conn.execute(
            f"UPDATE request_instances SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
            params
        )
        conn.commit()
        return RequestInstances.get_by_id(id, user_id)

    @staticmethod
    def delete(id, user_id=None):
        """Delete a user-owned saved request instance."""
        conn = RequestInstances._conn()
        user_id = RequestInstances._resolve_user_id(conn, user_id)
        result = conn.execute(
            "SELECT id FROM request_instances WHERE id = ? AND user_id = ?",
            (id, user_id)
        ).fetchone()
        if not result:
            return {'deleted': 0}

        conn.execute("DELETE FROM request_instances WHERE id = ? AND user_id = ?", (id, user_id))
        conn.commit()
        return {'deleted': 1}
