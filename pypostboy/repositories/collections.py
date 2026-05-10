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
    def get_all():
        """Get all collections in tree structure."""
        conn = Collections._conn()
        all_cols = conn.execute(
            "SELECT * FROM collections ORDER BY sort_order ASC, id ASC"
        ).fetchall()

        col_map = {}
        for c in all_cols:
            c_dict = dict(c)
            c_dict['children'] = []
            c_dict['requests'] = []
            col_map[c_dict['id']] = c_dict

        all_reqs = conn.execute(
            "SELECT * FROM requests ORDER BY sort_order ASC, id ASC"
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
    def get_by_id(id):
        """Get single collection by ID with children and requests."""
        conn = Collections._conn()
        col = conn.execute(
            "SELECT * FROM collections WHERE id = ?", (id,)
        ).fetchone()

        if not col:
            return None

        result = dict(col)
        result['children'] = []
        result['requests'] = []

        children = conn.execute(
            """SELECT * FROM collections
               WHERE parent_id = ?
               ORDER BY sort_order ASC, id ASC""",
            (id,)
        ).fetchall()

        result['children'] = rows_to_list(children)

        reqs = conn.execute(
            """SELECT * FROM requests
               WHERE collection_id = ?
               ORDER BY sort_order ASC, id ASC""",
            (id,)
        ).fetchall()

        for r in reqs:
            r_dict = dict(r)
            r_dict['headers'] = safe_parse(r_dict['headers'], [])
            r_dict['form_data'] = safe_parse(r_dict['form_data'], [])
            r_dict['auth_data'] = safe_parse(r_dict['auth_data'], {})
            result['requests'].append(r_dict)

        return result

    @staticmethod
    def create(data=None):
        """Create a new collection."""
        conn = Collections._conn()
        data = data or {}
        name = data.get('name', 'New Collection')
        parent_id = data.get('parent_id', None)
        description = data.get('description', '')
        user_id = data.get('user_id')
        if user_id is None and parent_id is not None:
            parent = conn.execute(
                "SELECT user_id FROM collections WHERE id = ?",
                (parent_id,)
            ).fetchone()
            if not parent:
                raise ValueError('Parent collection not found')
            user_id = parent['user_id']
        if user_id is None:
            user_id = Collections._default_user_id(conn)

        if parent_id is not None:
            max_order_row = conn.execute(
                """SELECT COALESCE(MAX(sort_order), -1) as max_order
                   FROM collections WHERE parent_id = ?""",
                (parent_id,)
            ).fetchone()
        else:
            max_order_row = conn.execute(
                """SELECT COALESCE(MAX(sort_order), -1) as max_order
                   FROM collections WHERE parent_id IS NULL"""
            ).fetchone()

        max_order = max_order_row['max_order'] if max_order_row else -1

        now = timestamp()
        cursor = conn.execute(
            """INSERT INTO collections (
                user_id, name, description, parent_id, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, name, description, parent_id, max_order + 1, now, now)
        )

        return Collections.get_by_id(cursor.lastrowid)

    @staticmethod
    def update(id, data):
        """Update a collection."""
        conn = Collections._conn()
        col = Collections.get_by_id(id)
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
            updates.append('parent_id = ?')
            params.append(data['parent_id'] or None)
        if 'sort_order' in data:
            updates.append('sort_order = ?')
            params.append(data['sort_order'])

        updates.append('updated_at = ?')
        params.append(timestamp())
        params.append(id)

        conn.execute(
            f"UPDATE collections SET {', '.join(updates)} WHERE id = ?",
            params
        )

        return Collections.get_by_id(id)

    @staticmethod
    def reorder(parent_id, ordered_ids):
        """Reorder sibling collections under a parent."""
        conn = Collections._conn()
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
                "SELECT id FROM collections WHERE id = ?",
                (parent_id,)
            ).fetchone()
            if not parent:
                raise ValueError('Parent collection not found')
            sibling_rows = conn.execute(
                "SELECT id FROM collections WHERE parent_id = ? ORDER BY sort_order ASC, id ASC",
                (parent_id,)
            ).fetchall()
        else:
            sibling_rows = conn.execute(
                "SELECT id FROM collections WHERE parent_id IS NULL ORDER BY sort_order ASC, id ASC"
            ).fetchall()

        sibling_ids = [row['id'] for row in sibling_rows]
        if set(normalized_ids) != set(sibling_ids):
            raise ValueError('ordered_ids must include exactly the sibling collections for the parent')

        now = timestamp()
        with conn:
            for index, collection_id in enumerate(normalized_ids):
                conn.execute(
                    "UPDATE collections SET sort_order = ?, updated_at = ? WHERE id = ?",
                    (index, now, collection_id)
                )

        return {'updated': len(normalized_ids)}

    @staticmethod
    def delete(id):
        """Delete a collection and all its children recursively."""
        conn = Collections._conn()
        ids_to_delete = [id]
        to_process = [id]

        while to_process:
            current_id = to_process.pop()
            children = conn.execute(
                "SELECT id FROM collections WHERE parent_id = ?",
                (current_id,)
            ).fetchall()

            for child in children:
                child_id = child['id']
                ids_to_delete.append(child_id)
                to_process.append(child_id)

        for col_id in ids_to_delete:
            conn.execute("DELETE FROM requests WHERE collection_id = ?", (col_id,))

        for col_id in ids_to_delete:
            conn.execute("DELETE FROM collections WHERE id = ?", (col_id,))

        db.save()

        return {'deleted': len(ids_to_delete)}

    @staticmethod
    def duplicate(id):
        """Duplicate a collection including all children and requests."""
        from pypostboy.repositories.requests import Requests

        conn = Collections._conn()
        original = Collections.get_by_id(id)
        if not original:
            raise ValueError('Collection not found')

        new_col = Collections.create({
            'name': original['name'] + ' (copy)',
            'parent_id': original['parent_id'],
            'description': original['description'] or ''
        })

        reqs = conn.execute(
            "SELECT * FROM requests WHERE collection_id = ?", (id,)
        ).fetchall()

        for r in reqs:
            Requests.create({
                'collection_id': new_col['id'],
                'name': r['name'],
                'method': r['method'],
                'url': r['url'],
                'headers': safe_parse(r['headers'], []),
                'body_type': r['body_type'],
                'body_content': r['body_content'],
                'body_raw_type': r['body_raw_type'],
                'form_data': safe_parse(r['form_data'], []),
                'auth_type': r['auth_type'],
                'auth_data': safe_parse(r['auth_data'], {})
            })

        children = conn.execute(
            "SELECT * FROM collections WHERE parent_id = ?", (id,)
        ).fetchall()

        for child in children:
            _duplicate_collection_recursive(child['id'], new_col['id'])

        return Collections.get_by_id(new_col['id'])


def _duplicate_collection_recursive(original_id, new_parent_id):
    """Recursive helper for collection duplication."""
    from pypostboy.repositories.requests import Requests

    conn = Collections._conn()
    original = conn.execute(
        "SELECT * FROM collections WHERE id = ?", (original_id,)
    ).fetchone()

    if not original:
        return

    new_col = Collections.create({
        'name': original['name'],
        'parent_id': new_parent_id,
        'description': original['description'] or ''
    })

    reqs = conn.execute(
        "SELECT * FROM requests WHERE collection_id = ?", (original_id,)
    ).fetchall()

    for r in reqs:
        Requests.create({
            'collection_id': new_col['id'],
            'name': r['name'],
            'method': r['method'],
            'url': r['url'],
            'headers': safe_parse(r['headers'], []),
            'body_type': r['body_type'],
            'body_content': r['body_content'],
            'body_raw_type': r['body_raw_type'],
            'form_data': safe_parse(r['form_data'], []),
            'auth_type': r['auth_type'],
            'auth_data': safe_parse(r['auth_data'], {})
        })

    children = conn.execute(
        "SELECT * FROM collections WHERE parent_id = ?", (original_id,)
    ).fetchall()

    for child in children:
        _duplicate_collection_recursive(child['id'], new_col['id'])
