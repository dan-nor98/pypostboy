"""Request repository methods."""

from pypostboy.db.connection import get_connection
from pypostboy.db.serializers import safe_parse, safe_stringify, timestamp


class Requests:
    connection = None

    @classmethod
    def _conn(cls):
        return cls.connection or get_connection()

    @staticmethod
    def get_by_id(id):
        """Get a single request by ID."""
        conn = Requests._conn()
        req = conn.execute(
            "SELECT * FROM requests WHERE id = ?", (id,)
        ).fetchone()

        if not req:
            return None

        result = dict(req)
        result['headers'] = safe_parse(result['headers'], [])
        result['form_data'] = safe_parse(result['form_data'], [])
        result['auth_data'] = safe_parse(result['auth_data'], {})
        return result

    @staticmethod
    def get_by_collection(collection_id):
        """Get all requests in a collection."""
        conn = Requests._conn()
        reqs = conn.execute(
            """SELECT * FROM requests
               WHERE collection_id = ?
               ORDER BY sort_order ASC, id ASC""",
            (collection_id,)
        ).fetchall()

        result = []
        for r in reqs:
            r_dict = dict(r)
            r_dict['headers'] = safe_parse(r_dict['headers'], [])
            r_dict['form_data'] = safe_parse(r_dict['form_data'], [])
            r_dict['auth_data'] = safe_parse(r_dict['auth_data'], {})
            result.append(r_dict)

        return result

    @staticmethod
    def create(data=None):
        """Create a new request."""
        conn = Requests._conn()
        data = data or {}
        if 'collection_id' not in data:
            raise ValueError('collection_id is required')

        max_order_row = conn.execute(
            """SELECT COALESCE(MAX(sort_order), -1) as max_order
               FROM requests WHERE collection_id = ?""",
            (data['collection_id'],)
        ).fetchone()

        max_order = max_order_row['max_order'] if max_order_row else -1

        cursor = conn.execute(
            """INSERT INTO requests (
                collection_id, name, method, url, headers,
                body_type, body_content, body_raw_type, form_data,
                auth_type, auth_data, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                data['collection_id'],
                data.get('name', 'New Request'),
                data.get('method', 'GET').upper(),
                data.get('url', ''),
                safe_stringify(data.get('headers'), '[]'),
                data.get('body_type', 'none'),
                data.get('body_content', data.get('body_raw', '')),
                data.get('body_raw_type', 'application/json'),
                safe_stringify(data.get('form_data'), '[]'),
                data.get('auth_type', 'none'),
                safe_stringify(data.get('auth_data'), '{}'),
                max_order + 1,
                timestamp(),
                timestamp()
            )
        )

        return Requests.get_by_id(cursor.lastrowid)

    @staticmethod
    def update(id, data):
        """Update a request."""
        conn = Requests._conn()
        req = Requests.get_by_id(id)
        if not req:
            raise ValueError('Request not found')

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
            'collection_id': 'collection_id',
            'sort_order': 'sort_order',
            'auth_type': 'auth_type'
        }

        for key, db_field in field_mapping.items():
            if key in data:
                value = data[key]
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

        updates.append('updated_at = ?')
        params.append(timestamp())
        params.append(id)

        conn.execute(
            f"UPDATE requests SET {', '.join(updates)} WHERE id = ?",
            params
        )

        return Requests.get_by_id(id)

    @staticmethod
    def reorder(collection_id, ordered_ids):
        """Reorder requests within a collection."""
        from pypostboy.repositories.collections import Collections

        conn = Requests._conn()
        if not isinstance(ordered_ids, list):
            raise ValueError('ordered_ids must be a list')

        try:
            collection_id = int(collection_id)
            normalized_ids = [int(item) for item in ordered_ids]
        except (TypeError, ValueError):
            raise ValueError('ordered_ids must contain only request IDs')

        if len(normalized_ids) != len(set(normalized_ids)):
            raise ValueError('ordered_ids must not contain duplicates')

        collection = Collections.get_by_id(collection_id)
        if not collection:
            raise ValueError('Collection not found')

        sibling_rows = conn.execute(
            "SELECT id FROM requests WHERE collection_id = ? ORDER BY sort_order ASC, id ASC",
            (collection_id,)
        ).fetchall()
        sibling_ids = [row['id'] for row in sibling_rows]

        if set(normalized_ids) != set(sibling_ids):
            raise ValueError('ordered_ids must include exactly the requests for the collection')

        now = timestamp()
        with conn:
            for index, request_id in enumerate(normalized_ids):
                conn.execute(
                    "UPDATE requests SET sort_order = ?, updated_at = ? WHERE id = ?",
                    (index, now, request_id)
                )

        return {'updated': len(normalized_ids)}

    @staticmethod
    def delete(id):
        """Delete a request."""
        conn = Requests._conn()
        result = conn.execute(
            "SELECT id FROM requests WHERE id = ?", (id,)
        ).fetchone()

        if not result:
            return {'deleted': 0}

        conn.execute("DELETE FROM requests WHERE id = ?", (id,))

        return {'deleted': 1}

    @staticmethod
    def duplicate(id):
        """Duplicate a request."""
        original = Requests.get_by_id(id)
        if not original:
            raise ValueError('Request not found')

        return Requests.create({
            'collection_id': original['collection_id'],
            'name': original['name'] + ' (copy)',
            'method': original['method'],
            'url': original['url'],
            'headers': original['headers'],
            'body_type': original['body_type'],
            'body_content': original['body_content'],
            'body_raw_type': original['body_raw_type'],
            'form_data': original['form_data'],
            'auth_type': original['auth_type'],
            'auth_data': original['auth_data']
        })

    @staticmethod
    def move(id, new_collection_id):
        """Move request to another collection."""
        from pypostboy.repositories.collections import Collections

        conn = Requests._conn()
        req = Requests.get_by_id(id)
        if not req:
            raise ValueError('Request not found')

        target_col = Collections.get_by_id(new_collection_id)
        if not target_col:
            raise ValueError('Target collection not found')

        conn.execute(
            "UPDATE requests SET collection_id = ?, updated_at = ? WHERE id = ?",
            (new_collection_id, timestamp(), id)
        )

        return Requests.get_by_id(id)
