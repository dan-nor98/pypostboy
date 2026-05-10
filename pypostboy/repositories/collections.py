"""Collection repository methods."""

from pypostboy.db.connection import db, get_connection
from pypostboy.db.migrations import ensure_default_local_user
from pypostboy.db.serializers import rows_to_list, safe_parse, timestamp


class Collections:
    connection = None

    @classmethod
    def _conn(cls):
        return cls.connection or get_connection()

    @staticmethod
    def _default_user_id(conn):
        return ensure_default_local_user(conn.cursor())

    @staticmethod
    def _resolve_user_id(conn, user_id=None):
        return int(user_id) if user_id is not None else Collections._default_user_id(conn)

    @staticmethod
    def get_all(user_id=None):
        """Get all collections owned by a user in tree structure."""
        conn = Collections._conn()
        user_id = Collections._resolve_user_id(conn, user_id)
        all_cols = conn.execute(
            """SELECT * FROM collections
               WHERE user_id = ?
               ORDER BY sort_order ASC, id ASC""",
            (user_id,)
        ).fetchall()

        col_map = {}
        for c in all_cols:
            c_dict = dict(c)
            c_dict['children'] = []
            c_dict['requests'] = []
            col_map[c_dict['id']] = c_dict

        all_reqs = conn.execute(
            """SELECT * FROM requests
               WHERE user_id = ?
               ORDER BY sort_order ASC, id ASC""",
            (user_id,)
        ).fetchall()

        for r in all_reqs:
            r_dict = dict(r)
            r_dict['headers'] = safe_parse(r_dict['headers'], [])
            r_dict['form_data'] = safe_parse(r_dict['form_data'], [])
            r_dict['auth_data'] = safe_parse(r_dict['auth_data'], {})
            if r_dict['collection_id'] in col_map:
                col_map[r_dict['collection_id']]['requests'].append(r_dict)

        tree = []
        for c_dict in col_map.values():
            if c_dict['parent_id'] and c_dict['parent_id'] in col_map:
                col_map[c_dict['parent_id']]['children'].append(c_dict)
            elif not c_dict['parent_id']:
                tree.append(c_dict)

        return tree

    @staticmethod
    def get_by_id(id, user_id=None):
        """Get single collection owned by a user with children and requests."""
        conn = Collections._conn()
        user_id = Collections._resolve_user_id(conn, user_id)
        col = conn.execute(
            "SELECT * FROM collections WHERE id = ? AND user_id = ?",
            (id, user_id)
        ).fetchone()

        if not col:
            return None

        result = dict(col)
        result['children'] = []
        result['requests'] = []

        children = conn.execute(
            """SELECT * FROM collections
               WHERE parent_id = ? AND user_id = ?
               ORDER BY sort_order ASC, id ASC""",
            (id, user_id)
        ).fetchall()

        result['children'] = rows_to_list(children)

        reqs = conn.execute(
            """SELECT * FROM requests
               WHERE collection_id = ? AND user_id = ?
               ORDER BY sort_order ASC, id ASC""",
            (id, user_id)
        ).fetchall()

        for r in reqs:
            r_dict = dict(r)
            r_dict['headers'] = safe_parse(r_dict['headers'], [])
            r_dict['form_data'] = safe_parse(r_dict['form_data'], [])
            r_dict['auth_data'] = safe_parse(r_dict['auth_data'], {})
            result['requests'].append(r_dict)

        return result

    @staticmethod
    def create(user_id=None, data=None):
        """Create a new collection for a user."""
        conn = Collections._conn()
        if isinstance(user_id, dict) and data is None:
            data = user_id
            user_id = data.get('user_id')
        data = data or {}
        user_id = Collections._resolve_user_id(conn, user_id)
        name = data.get('name', 'New Collection')
        parent_id = data.get('parent_id', None)
        description = data.get('description', '')

        if parent_id is not None:
            parent = conn.execute(
                "SELECT id FROM collections WHERE id = ? AND user_id = ?",
                (parent_id, user_id)
            ).fetchone()
            if not parent:
                raise ValueError('Parent collection not found')

        if parent_id is not None:
            max_order_row = conn.execute(
                """SELECT COALESCE(MAX(sort_order), -1) as max_order
                   FROM collections WHERE parent_id = ? AND user_id = ?""",
                (parent_id, user_id)
            ).fetchone()
        else:
            max_order_row = conn.execute(
                """SELECT COALESCE(MAX(sort_order), -1) as max_order
                   FROM collections WHERE parent_id IS NULL AND user_id = ?""",
                (user_id,)
            ).fetchone()

        max_order = max_order_row['max_order'] if max_order_row else -1

        now = timestamp()
        cursor = conn.execute(
            """INSERT INTO collections (
                user_id, name, description, parent_id, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, name, description, parent_id, max_order + 1, now, now)
        )

        return Collections.get_by_id(cursor.lastrowid, user_id)

    @staticmethod
    def update(id, user_id=None, data=None):
        """Update a user-owned collection."""
        conn = Collections._conn()
        if data is None:
            data = user_id or {}
            user_id = None
        user_id = Collections._resolve_user_id(conn, user_id)
        col = Collections.get_by_id(id, user_id)
        if not col:
            raise ValueError('Collection not found')

        updates = []
        params = []

        if 'name' in data:
            updates.append('name = ?')
            params.append(data['name'])
        if 'description' in data:
            updates.append('description = ?')
            params.append(data['description'])
        if 'parent_id' in data:
            parent_id = data['parent_id'] or None
            if parent_id is not None:
                parent = conn.execute(
                    "SELECT id FROM collections WHERE id = ? AND user_id = ?",
                    (parent_id, user_id)
                ).fetchone()
                if not parent:
                    raise ValueError('Parent collection not found')
            updates.append('parent_id = ?')
            params.append(parent_id)
        if 'sort_order' in data:
            updates.append('sort_order = ?')
            params.append(data['sort_order'])

        updates.append('updated_at = ?')
        params.append(timestamp())
        params.extend([id, user_id])

        conn.execute(
            f"UPDATE collections SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
            params
        )

        return Collections.get_by_id(id, user_id)

    @staticmethod
    def reorder(parent_id, user_id=None, ordered_ids=None):
        """Reorder sibling collections owned by a user under a parent."""
        conn = Collections._conn()
        if ordered_ids is None:
            ordered_ids = user_id
            user_id = None
        user_id = Collections._resolve_user_id(conn, user_id)
        if not isinstance(ordered_ids, list):
            raise ValueError('ordered_ids must be a list')

        try:
            normalized_ids = [int(item) for item in ordered_ids]
        except (TypeError, ValueError):
            raise ValueError('ordered_ids must contain only collection IDs')

        if len(normalized_ids) != len(set(normalized_ids)):
            raise ValueError('ordered_ids must not contain duplicates')

        if parent_id is not None:
            parent_id = int(parent_id)
            parent = conn.execute(
                "SELECT id FROM collections WHERE id = ? AND user_id = ?",
                (parent_id, user_id)
            ).fetchone()
            if not parent:
                raise ValueError('Parent collection not found')
            sibling_rows = conn.execute(
                """SELECT id FROM collections
                   WHERE parent_id = ? AND user_id = ?
                   ORDER BY sort_order ASC, id ASC""",
                (parent_id, user_id)
            ).fetchall()
        else:
            sibling_rows = conn.execute(
                """SELECT id FROM collections
                   WHERE parent_id IS NULL AND user_id = ?
                   ORDER BY sort_order ASC, id ASC""",
                (user_id,)
            ).fetchall()

        sibling_ids = [row['id'] for row in sibling_rows]
        if set(normalized_ids) != set(sibling_ids):
            raise ValueError('ordered_ids must include exactly the sibling collections for the parent')

        now = timestamp()
        with conn:
            for index, collection_id in enumerate(normalized_ids):
                conn.execute(
                    "UPDATE collections SET sort_order = ?, updated_at = ? WHERE id = ? AND user_id = ?",
                    (index, now, collection_id, user_id)
                )

        return {'updated': len(normalized_ids)}

    @staticmethod
    def delete(id, user_id=None):
        """Delete a user-owned collection and all its children recursively."""
        conn = Collections._conn()
        user_id = Collections._resolve_user_id(conn, user_id)
        if not Collections.get_by_id(id, user_id):
            return {'deleted': 0}

        ids_to_delete = [id]
        to_process = [id]

        while to_process:
            current_id = to_process.pop()
            children = conn.execute(
                "SELECT id FROM collections WHERE parent_id = ? AND user_id = ?",
                (current_id, user_id)
            ).fetchall()

            for child in children:
                child_id = child['id']
                ids_to_delete.append(child_id)
                to_process.append(child_id)

        for col_id in ids_to_delete:
            conn.execute(
                "DELETE FROM requests WHERE collection_id = ? AND user_id = ?",
                (col_id, user_id)
            )

        for col_id in ids_to_delete:
            conn.execute(
                "DELETE FROM collections WHERE id = ? AND user_id = ?",
                (col_id, user_id)
            )

        db.save()

        return {'deleted': len(ids_to_delete)}

    @staticmethod
    def duplicate(id, user_id=None):
        """Duplicate a user-owned collection including children and requests."""
        from pypostboy.repositories.requests import Requests

        conn = Collections._conn()
        user_id = Collections._resolve_user_id(conn, user_id)
        original = Collections.get_by_id(id, user_id)
        if not original:
            raise ValueError('Collection not found')

        new_col = Collections.create(user_id, {
            'name': original['name'] + ' (copy)',
            'parent_id': original['parent_id'],
            'description': original['description'] or ''
        })

        for request in Requests.get_by_collection(id, user_id):
            _copy_request_to_collection(request, new_col['id'], user_id)

        for child in original['children']:
            _duplicate_collection_recursive(child['id'], new_col['id'], user_id)

        return Collections.get_by_id(new_col['id'], user_id)


def _copy_request_to_collection(request, collection_id, user_id):
    """Copy a user-scoped request into a user-owned collection."""
    from pypostboy.repositories.requests import Requests

    Requests.create(user_id, {
        'collection_id': collection_id,
        'name': request['name'],
        'method': request['method'],
        'url': request['url'],
        'headers': request['headers'],
        'body_type': request['body_type'],
        'body_content': request['body_content'],
        'body_raw_type': request['body_raw_type'],
        'form_data': request['form_data'],
        'auth_type': request['auth_type'],
        'auth_data': request['auth_data']
    })


def _duplicate_collection_recursive(original_id, new_parent_id, user_id):
    """Recursive helper for collection duplication."""
    from pypostboy.repositories.requests import Requests

    original = Collections.get_by_id(original_id, user_id)

    if not original:
        return

    new_col = Collections.create(user_id, {
        'name': original['name'],
        'parent_id': new_parent_id,
        'description': original['description'] or ''
    })

    for request in Requests.get_by_collection(original_id, user_id):
        _copy_request_to_collection(request, new_col['id'], user_id)

    for child in original['children']:
        _duplicate_collection_recursive(child['id'], new_col['id'], user_id)
