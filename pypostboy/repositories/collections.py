"""Collection repository methods."""

from pypostboy.db.adapter import (
    execute as db_execute,
    insert_and_get_id,
    row_to_mapping,
    rows_to_mappings,
)
from pypostboy.db.connection import get_connection
from pypostboy.db.migrations import ensure_default_local_user
from pypostboy.db.serializers import safe_parse, timestamp
from pypostboy.apps.core.models import Collection, Request


MAX_COLLECTION_NESTING_DEPTH = None


class DuplicateCollectionNameError(ValueError):
    """Raised when a collection name duplicates a sibling for the same user."""


class Collections:
    connection = None
    use_orm_reads = True

    @classmethod
    def _conn(cls):
        return cls.connection or get_connection()

    @staticmethod
    def _default_user_id(conn):
        return ensure_default_local_user(conn.cursor())

    @staticmethod
    def _resolve_user_id(conn, user_id=None):
        return (
            int(user_id) if user_id is not None else Collections._default_user_id(conn)
        )

    @staticmethod
    def _duplicate_name_exists(conn, user_id, parent_id, name, exclude_id=None):
        # Duplicate-name policy: collection/folder names must be unique among
        # siblings for the same user and parent. The same name is allowed under
        # different parents and for different users.
        params = [user_id, name]
        exclude_clause = ""
        if exclude_id is not None:
            exclude_clause = " AND id != ?"
            params.append(exclude_id)

        if parent_id is None:
            query = f"""SELECT id FROM collections
                        WHERE user_id = ? AND name = ? AND parent_id IS NULL{exclude_clause}
                        LIMIT 1"""
        else:
            query = f"""SELECT id FROM collections
                        WHERE user_id = ? AND name = ? AND parent_id = ?{exclude_clause}
                        LIMIT 1"""
            params.insert(2, parent_id)

        return db_execute(conn, query, tuple(params)).fetchone() is not None

    @staticmethod
    def _validate_unique_sibling_name(conn, user_id, parent_id, name, exclude_id=None):
        if Collections._duplicate_name_exists(conn, user_id, parent_id, name, exclude_id):
            raise DuplicateCollectionNameError(
                "Collection name already exists in this folder"
            )

    @staticmethod
    def get_all(user_id=None):
        """Get all collections owned by a user in tree structure."""
        conn = Collections._conn()
        user_id = Collections._resolve_user_id(conn, user_id)
        if Collections.use_orm_reads:
            all_cols = list(Collection.objects.filter(user_id=user_id).order_by('sort_order', 'id').values())
        else:
            all_cols = db_execute(conn, """SELECT * FROM collections
               WHERE user_id = ?
               ORDER BY sort_order ASC, id ASC""", (user_id,)).fetchall()

        col_map = {}
        for c in all_cols:
            c_dict = dict(c) if isinstance(c, dict) else dict(row_to_mapping(c))
            c_dict["children"] = []
            c_dict["requests"] = []
            col_map[c_dict["id"]] = c_dict

        if Collections.use_orm_reads:
            all_reqs = list(Request.objects.filter(user_id=user_id).order_by('sort_order', 'id').values())
        else:
            all_reqs = db_execute(conn, """SELECT * FROM requests
               WHERE user_id = ?
               ORDER BY sort_order ASC, id ASC""", (user_id,)).fetchall()

        for r in all_reqs:
            r_dict = dict(r) if isinstance(r, dict) else dict(row_to_mapping(r))
            r_dict["headers"] = safe_parse(r_dict["headers"], [])
            r_dict["form_data"] = safe_parse(r_dict["form_data"], [])
            r_dict["auth_data"] = safe_parse(r_dict["auth_data"], {})
            if r_dict["collection_id"] in col_map:
                col_map[r_dict["collection_id"]]["requests"].append(r_dict)

        tree = []
        for c_dict in col_map.values():
            if c_dict["parent_id"] and c_dict["parent_id"] in col_map:
                col_map[c_dict["parent_id"]]["children"].append(c_dict)
            elif not c_dict["parent_id"]:
                tree.append(c_dict)

        return tree

    @staticmethod
    def get_by_id(id, user_id=None):
        """Get single collection owned by a user with children and requests."""
        conn = Collections._conn()
        user_id = Collections._resolve_user_id(conn, user_id)
        if Collections.use_orm_reads:
            col = Collection.objects.filter(id=id, user_id=user_id).values().first()
        else:
            col = db_execute(conn, "SELECT * FROM collections WHERE id = ? AND user_id = ?", (id, user_id)).fetchone()

        if not col:
            return None

        result = dict(col) if isinstance(col, dict) else dict(row_to_mapping(col))
        result["children"] = []
        result["requests"] = []

        children = db_execute(
            conn,
            """SELECT * FROM collections
               WHERE parent_id = ? AND user_id = ?
               ORDER BY sort_order ASC, id ASC""",
            (id, user_id),
        ).fetchall()

        result["children"] = rows_to_mappings(children)

        reqs = db_execute(
            conn,
            """SELECT * FROM requests
               WHERE collection_id = ? AND user_id = ?
               ORDER BY sort_order ASC, id ASC""",
            (id, user_id),
        ).fetchall()

        for r in reqs:
            r_dict = dict(row_to_mapping(r))
            r_dict["headers"] = safe_parse(r_dict["headers"], [])
            r_dict["form_data"] = safe_parse(r_dict["form_data"], [])
            r_dict["auth_data"] = safe_parse(r_dict["auth_data"], {})
            result["requests"].append(r_dict)

        return result

    @staticmethod
    def create(user_id=None, data=None):
        """Create a new collection for a user."""
        conn = Collections._conn()
        if isinstance(user_id, dict) and data is None:
            data = user_id
            user_id = data.get("user_id")
        data = data or {}
        user_id = Collections._resolve_user_id(conn, user_id)
        name = str(data.get("name", "New Collection")).strip()
        if not name:
            raise ValueError("Collection name is required")
        parent_id = data.get("parent_id", None)
        if parent_id is not None:
            parent_id = int(parent_id)
        description = data.get("description", "")

        if parent_id is not None:
            parent = db_execute(
                conn,
                "SELECT id FROM collections WHERE id = ? AND user_id = ?",
                (parent_id, user_id),
            ).fetchone()
            if not parent:
                raise ValueError("Parent collection not found")

        Collections._validate_unique_sibling_name(conn, user_id, parent_id, name)

        if parent_id is not None:
            max_order_row = db_execute(
                conn,
                """SELECT COALESCE(MAX(sort_order), -1) as max_order
                   FROM collections WHERE parent_id = ? AND user_id = ?""",
                (parent_id, user_id),
            ).fetchone()
        else:
            max_order_row = db_execute(
                conn,
                """SELECT COALESCE(MAX(sort_order), -1) as max_order
                   FROM collections WHERE parent_id IS NULL AND user_id = ?""",
                (user_id,),
            ).fetchone()

        max_order = max_order_row["max_order"] if max_order_row else -1

        now = timestamp()
        collection_id = insert_and_get_id(
            conn,
            """INSERT INTO collections (
                user_id, name, description, parent_id, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (user_id, name, description, parent_id, max_order + 1, now, now),
        )
        conn.commit()

        return Collections.get_by_id(collection_id, user_id)

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
            raise ValueError("Collection not found")

        updates = []
        params = []
        next_name = col["name"]
        next_parent_id = col["parent_id"]

        if "name" in data:
            next_name = str(data["name"]).strip()
            if not next_name:
                raise ValueError("Collection name is required")
        if "parent_id" in data:
            next_parent_id = data["parent_id"] or None
            if next_parent_id is not None:
                next_parent_id = int(next_parent_id)
                parent = db_execute(
                    conn,
                    "SELECT id FROM collections WHERE id = ? AND user_id = ?",
                    (next_parent_id, user_id),
                ).fetchone()
                if not parent:
                    raise ValueError("Parent collection not found")

        Collections._validate_unique_sibling_name(
            conn, user_id, next_parent_id, next_name, exclude_id=id
        )

        if "name" in data:
            updates.append("name = ?")
            params.append(next_name)
        if "description" in data:
            updates.append("description = ?")
            params.append(data["description"])
        if "parent_id" in data:
            updates.append("parent_id = ?")
            params.append(next_parent_id)
        if "sort_order" in data:
            updates.append("sort_order = ?")
            params.append(data["sort_order"])

        updates.append("updated_at = ?")
        params.append(timestamp())
        params.extend([id, user_id])

        db_execute(
            conn,
            f"UPDATE collections SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
            params,
        )
        conn.commit()

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
            raise ValueError("ordered_ids must be a list")

        try:
            normalized_ids = [int(item) for item in ordered_ids]
        except (TypeError, ValueError):
            raise ValueError("ordered_ids must contain only collection IDs")

        if len(normalized_ids) != len(set(normalized_ids)):
            raise ValueError("ordered_ids must not contain duplicates")

        if parent_id is not None:
            parent_id = int(parent_id)
            parent = db_execute(
                conn,
                "SELECT id FROM collections WHERE id = ? AND user_id = ?",
                (parent_id, user_id),
            ).fetchone()
            if not parent:
                raise ValueError("Parent collection not found")
            sibling_rows = db_execute(
                conn,
                """SELECT id FROM collections
                   WHERE parent_id = ? AND user_id = ?
                   ORDER BY sort_order ASC, id ASC""",
                (parent_id, user_id),
            ).fetchall()
        else:
            sibling_rows = db_execute(
                conn,
                """SELECT id FROM collections
                   WHERE parent_id IS NULL AND user_id = ?
                   ORDER BY sort_order ASC, id ASC""",
                (user_id,),
            ).fetchall()

        sibling_ids = [row["id"] for row in sibling_rows]
        if set(normalized_ids) != set(sibling_ids):
            raise ValueError(
                "ordered_ids must include exactly the sibling collections for the parent"
            )

        now = timestamp()
        with conn:
            for index, collection_id in enumerate(normalized_ids):
                db_execute(
                    conn,
                    "UPDATE collections SET sort_order = ?, updated_at = ? WHERE id = ? AND user_id = ?",
                    (index, now, collection_id, user_id),
                )

        return {"updated": len(normalized_ids)}

    @staticmethod
    def delete(id, user_id=None):
        """Delete a user-owned collection and all its children recursively."""
        conn = Collections._conn()
        user_id = Collections._resolve_user_id(conn, user_id)
        if not Collections.get_by_id(id, user_id):
            return {"deleted": 0}

        ids_to_delete = [id]
        to_process = [id]

        while to_process:
            current_id = to_process.pop()
            children = db_execute(
                conn,
                "SELECT id FROM collections WHERE parent_id = ? AND user_id = ?",
                (current_id, user_id),
            ).fetchall()

            for child in children:
                child_id = child["id"]
                ids_to_delete.append(child_id)
                to_process.append(child_id)

        for col_id in ids_to_delete:
            db_execute(
                conn,
                "DELETE FROM requests WHERE collection_id = ? AND user_id = ?",
                (col_id, user_id),
            )

        for col_id in ids_to_delete:
            db_execute(
                conn,
                "DELETE FROM collections WHERE id = ? AND user_id = ?",
                (col_id, user_id),
            )

        conn.commit()

        return {"deleted": len(ids_to_delete)}

    @staticmethod
    def duplicate(id, user_id=None):
        """Duplicate a user-owned collection including children and requests."""
        from pypostboy.repositories.requests import Requests

        conn = Collections._conn()
        user_id = Collections._resolve_user_id(conn, user_id)
        original = Collections.get_by_id(id, user_id)
        if not original:
            raise ValueError("Collection not found")

        new_col = Collections.create(
            user_id,
            {
                "name": original["name"] + " (copy)",
                "parent_id": original["parent_id"],
                "description": original["description"] or "",
            },
        )

        for request in Requests.get_by_collection(id, user_id):
            _copy_request_to_collection(request, new_col["id"], user_id)

        for child in original["children"]:
            _duplicate_collection_recursive(child["id"], new_col["id"], user_id)

        return Collections.get_by_id(new_col["id"], user_id)


def _copy_request_to_collection(request, collection_id, user_id):
    """Copy a user-scoped request into a user-owned collection."""
    from pypostboy.repositories.requests import Requests

    Requests.create(
        user_id,
        {
            "collection_id": collection_id,
            "name": request["name"],
            "method": request["method"],
            "url": request["url"],
            "headers": request["headers"],
            "body_type": request["body_type"],
            "body_content": request["body_content"],
            "body_raw_type": request["body_raw_type"],
            "form_data": request["form_data"],
            "auth_type": request["auth_type"],
            "auth_data": request["auth_data"],
        },
    )


def _duplicate_collection_recursive(original_id, new_parent_id, user_id):
    """Recursive helper for collection duplication."""
    from pypostboy.repositories.requests import Requests

    original = Collections.get_by_id(original_id, user_id)

    if not original:
        return

    new_col = Collections.create(
        user_id,
        {
            "name": original["name"],
            "parent_id": new_parent_id,
            "description": original["description"] or "",
        },
    )

    for request in Requests.get_by_collection(original_id, user_id):
        _copy_request_to_collection(request, new_col["id"], user_id)

    for child in original["children"]:
        _duplicate_collection_recursive(child["id"], new_col["id"], user_id)
