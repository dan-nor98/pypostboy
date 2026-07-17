"""Request repository methods."""

from pypostboy.db.adapter import (
    execute as db_execute,
    insert_and_get_id,
    row_to_mapping,
)
from pypostboy.db.connection import get_connection
from pypostboy.db.migrations import ensure_default_local_user
from pypostboy.db.serializers import safe_parse, safe_stringify, timestamp
from pypostboy.apps.core.models import Collection, Request
from pypostboy.services.sync_status import assert_expected_version
from pypostboy.repositories.collections import ReorderTokenConflictError


class Requests:
    connection = None
    use_orm_reads = True

    @classmethod
    def _conn(cls):
        return cls.connection or get_connection()

    @staticmethod
    def _resolve_user_id(conn, user_id=None):
        return (
            int(user_id)
            if user_id is not None
            else ensure_default_local_user(conn.cursor())
        )

    @staticmethod
    def _row_to_request(row):
        if not row:
            return None
        result = dict(row) if isinstance(row, dict) else dict(row_to_mapping(row))
        result["headers"] = safe_parse(result["headers"], [])
        result["form_data"] = safe_parse(result["form_data"], [])
        result["auth_data"] = safe_parse(result["auth_data"], {})
        return result

    @staticmethod
    def get_by_id(id, user_id=None):
        """Get a single user-owned request by ID."""
        conn = Requests._conn()
        user_id = Requests._resolve_user_id(conn, user_id)
        if Requests.use_orm_reads:
            req = Request.objects.filter(id=id, user_id=user_id).values().first()
            return Requests._row_to_request(req)
        req = db_execute(conn, "SELECT * FROM requests WHERE id = ? AND user_id = ?", (id, user_id)).fetchone()
        return Requests._row_to_request(req)

    @staticmethod
    def get_by_collection(collection_id, user_id=None):
        """Get all user-owned requests in a user-owned collection."""
        conn = Requests._conn()
        user_id = Requests._resolve_user_id(conn, user_id)
        if Requests.use_orm_reads:
            collection = Collection.objects.filter(id=collection_id, user_id=user_id).values('id').first()
        else:
            collection = db_execute(conn, "SELECT id FROM collections WHERE id = ? AND user_id = ?", (collection_id, user_id)).fetchone()
        if not collection:
            raise ValueError("Collection not found")

        if Requests.use_orm_reads:
            reqs = list(Request.objects.filter(collection_id=collection_id, user_id=user_id).order_by('sort_order', 'id').values())
        else:
            reqs = db_execute(conn, """SELECT * FROM requests
               WHERE collection_id = ? AND user_id = ?
               ORDER BY sort_order ASC, id ASC""", (collection_id, user_id)).fetchall()
        return [Requests._row_to_request(row) for row in reqs]

    @staticmethod
    def create(user_id=None, data=None):
        """Create a new request for a user."""
        conn = Requests._conn()
        if isinstance(user_id, dict) and data is None:
            data = user_id
            user_id = data.get("user_id")
        data = data or {}
        user_id = Requests._resolve_user_id(conn, user_id)
        if "collection_id" not in data:
            raise ValueError("collection_id is required")

        collection = db_execute(
            conn,
            "SELECT id FROM collections WHERE id = ? AND user_id = ?",
            (data["collection_id"], user_id),
        ).fetchone()
        if not collection:
            raise ValueError("Collection not found")

        max_order_row = db_execute(
            conn,
            """SELECT COALESCE(MAX(sort_order), -1) as max_order
               FROM requests WHERE collection_id = ? AND user_id = ?""",
            (data["collection_id"], user_id),
        ).fetchone()

        max_order = max_order_row["max_order"] if max_order_row else -1
        now = timestamp()
        request_id = insert_and_get_id(
            conn,
            """INSERT INTO requests (
                user_id, collection_id, name, method, url, headers,
                body_type, body_content, body_raw_type, form_data,
                auth_type, auth_data, sort_order, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                user_id,
                data["collection_id"],
                data.get("name", "New Request"),
                data.get("method", "GET").upper(),
                data.get("url", ""),
                safe_stringify(data.get("headers"), "[]"),
                data.get("body_type", "none"),
                data.get("body_content", data.get("body_raw", "")),
                data.get("body_raw_type", "application/json"),
                safe_stringify(data.get("form_data"), "[]"),
                data.get("auth_type", "none"),
                safe_stringify(data.get("auth_data"), "{}"),
                max_order + 1,
                now,
                now,
            ),
        )
        conn.commit()

        return Requests.get_by_id(request_id, user_id)

    @staticmethod
    def update(id, user_id=None, data=None):
        """Update a user-owned request."""
        conn = Requests._conn()
        if data is None:
            data = user_id or {}
            user_id = None
        user_id = Requests._resolve_user_id(conn, user_id)
        req = Requests.get_by_id(id, user_id)
        if not req:
            raise ValueError("Request not found")
        assert_expected_version("request", req, data.get("expected_updated_at"))

        updates = []
        params = []

        if "collection_id" in data:
            target_collection = db_execute(
                conn,
                "SELECT id FROM collections WHERE id = ? AND user_id = ?",
                (data["collection_id"], user_id),
            ).fetchone()
            if not target_collection:
                raise ValueError("Target collection not found")
            updates.append("collection_id = ?")
            params.append(data["collection_id"])

        field_mapping = {
            "name": "name",
            "method": "method",
            "url": "url",
            "body_type": "body_type",
            "body_content": "body_content",
            "body_raw": "body_content",
            "body_raw_type": "body_raw_type",
            "sort_order": "sort_order",
            "auth_type": "auth_type",
        }

        for key, db_field in field_mapping.items():
            if key in data:
                value = data[key]
                if key == "method":
                    value = value.upper()
                updates.append(f"{db_field} = ?")
                params.append(value)

        if "headers" in data:
            updates.append("headers = ?")
            params.append(safe_stringify(data["headers"], "[]"))
        if "form_data" in data:
            updates.append("form_data = ?")
            params.append(safe_stringify(data["form_data"], "[]"))
        if "auth_data" in data:
            updates.append("auth_data = ?")
            params.append(safe_stringify(data["auth_data"], "{}"))

        updates.append("updated_at = ?")
        params.append(timestamp())
        params.extend([id, user_id])

        db_execute(
            conn,
            f"UPDATE requests SET {', '.join(updates)} WHERE id = ? AND user_id = ?",
            params,
        )
        conn.commit()

        return Requests.get_by_id(id, user_id)

    @staticmethod
    def _reorder_token(rows):
        return "|".join(f"{row['id']}:{row['updated_at']}" for row in rows)

    @staticmethod
    def reorder(collection_id, user_id=None, ordered_ids=None, reorder_token=None):
        """Reorder user-owned requests within a user-owned collection."""
        conn = Requests._conn()
        if ordered_ids is None:
            ordered_ids = user_id
            user_id = None
        user_id = Requests._resolve_user_id(conn, user_id)
        if not isinstance(ordered_ids, list):
            raise ValueError("ordered_ids must be a list")

        try:
            collection_id = int(collection_id)
            normalized_ids = [int(item) for item in ordered_ids]
        except (TypeError, ValueError):
            raise ValueError("ordered_ids must contain only request IDs")

        if len(normalized_ids) != len(set(normalized_ids)):
            raise ValueError("ordered_ids must not contain duplicates")

        sibling_requests = Requests.get_by_collection(collection_id, user_id)
        sibling_ids = [request["id"] for request in sibling_requests]
        expected_token = Requests._reorder_token(sibling_requests)
        if not reorder_token:
            raise ValueError("reorder_token required")
        if reorder_token != expected_token:
            raise ReorderTokenConflictError(
                "Request reorder token is stale; refresh collections and try again"
            )

        if set(normalized_ids) != set(sibling_ids):
            raise ValueError(
                "ordered_ids must include exactly the requests for the collection"
            )

        now = timestamp()
        with conn:
            for index, request_id in enumerate(normalized_ids):
                db_execute(
                    conn,
                    "UPDATE requests SET sort_order = ?, updated_at = ? WHERE id = ? AND user_id = ?",
                    (index, now, request_id, user_id),
                )

        return {"updated": len(normalized_ids)}

    @staticmethod
    def delete(id, user_id=None):
        """Delete a user-owned request."""
        conn = Requests._conn()
        user_id = Requests._resolve_user_id(conn, user_id)
        result = db_execute(
            conn, "SELECT id FROM requests WHERE id = ? AND user_id = ?", (id, user_id)
        ).fetchone()

        if not result:
            return {"deleted": 0}

        db_execute(
            conn,
            "DELETE FROM requests WHERE id = ? AND user_id = ?",
            (id, user_id),
        )
        conn.commit()
        return {"deleted": 1}

    @staticmethod
    def duplicate(id, user_id=None):
        """Duplicate a user-owned request."""
        from pypostboy.repositories.collections import Collections

        conn = Requests._conn()
        user_id = Requests._resolve_user_id(conn, user_id)
        original = Requests.get_by_id(id, user_id)
        if not original:
            raise ValueError("Request not found")

        if not Collections.get_by_id(original["collection_id"], user_id):
            raise ValueError("Collection not found")

        return Requests.create(
            user_id,
            {
                "collection_id": original["collection_id"],
                "name": original["name"] + " (copy)",
                "method": original["method"],
                "url": original["url"],
                "headers": original["headers"],
                "body_type": original["body_type"],
                "body_content": original["body_content"],
                "body_raw_type": original["body_raw_type"],
                "form_data": original["form_data"],
                "auth_type": original["auth_type"],
                "auth_data": original["auth_data"],
            },
        )

    @staticmethod
    def move(id, user_id=None, new_collection_id=None):
        """Move a user-owned request to another user-owned collection."""
        from pypostboy.repositories.collections import Collections

        conn = Requests._conn()
        if new_collection_id is None:
            new_collection_id = user_id
            user_id = None
        user_id = Requests._resolve_user_id(conn, user_id)
        req = Requests.get_by_id(id, user_id)
        if not req:
            raise ValueError("Request not found")

        target_col = Collections.get_by_id(new_collection_id, user_id)
        if not target_col:
            raise ValueError("Target collection not found")

        db_execute(
            conn,
            "UPDATE requests SET collection_id = ?, updated_at = ? WHERE id = ? AND user_id = ?",
            (new_collection_id, timestamp(), id, user_id),
        )
        conn.commit()

        return Requests.get_by_id(id, user_id)
