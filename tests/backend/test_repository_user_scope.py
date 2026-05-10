"""Repository-level coverage for multi-user ownership boundaries."""

import pytest

from pypostboy.db.serializers import timestamp
from pypostboy.repositories.collections import Collections
from pypostboy.repositories.requests import Requests


def _create_user(conn, username):
    now = timestamp()
    cursor = conn.execute(
        """INSERT INTO users (username, email, created_at, updated_at)
           VALUES (?, ?, ?, ?)""",
        (username, f"{username}@example.test", now, now),
    )
    return cursor.lastrowid


def test_collection_update_and_reorder_require_user_owned_parent(sqlite_connection):
    user_one = _create_user(sqlite_connection, "scope_collections_one")
    user_two = _create_user(sqlite_connection, "scope_collections_two")
    collection = Collections.create(user_one, {"name": "User one collection"})
    user_two_parent = Collections.create(user_two, {"name": "User two parent"})

    with pytest.raises(ValueError, match="Parent collection not found"):
        Collections.update(collection["id"], user_one, {"parent_id": user_two_parent["id"]})

    with pytest.raises(ValueError, match="Parent collection not found"):
        Collections.reorder(user_two_parent["id"], user_one, [])


def test_collection_duplicate_uses_user_scoped_original_children_and_requests(sqlite_connection):
    user_one = _create_user(sqlite_connection, "scope_dup_collections_one")
    user_two = _create_user(sqlite_connection, "scope_dup_collections_two")
    root = Collections.create(user_one, {"name": "Root"})
    child = Collections.create(user_one, {"name": "Child", "parent_id": root["id"]})
    Requests.create(user_one, {"collection_id": root["id"], "name": "Root request"})
    Requests.create(user_one, {"collection_id": child["id"], "name": "Child request"})
    other_root = Collections.create(user_two, {"name": "Other root"})
    Requests.create(user_two, {"collection_id": other_root["id"], "name": "Other request"})

    with pytest.raises(ValueError, match="Collection not found"):
        Collections.duplicate(root["id"], user_two)

    duplicate = Collections.duplicate(root["id"], user_one)

    assert duplicate["user_id"] == user_one
    assert [request["name"] for request in duplicate["requests"]] == ["Root request"]
    assert [item["name"] for item in duplicate["children"]] == ["Child"]
    copied_child = Collections.get_by_id(duplicate["children"][0]["id"], user_one)
    assert [request["name"] for request in copied_child["requests"]] == ["Child request"]
    assert Collections.get_by_id(duplicate["id"], user_two) is None


def test_request_reorder_move_and_duplicate_require_user_owned_records(sqlite_connection):
    user_one = _create_user(sqlite_connection, "scope_requests_one")
    user_two = _create_user(sqlite_connection, "scope_requests_two")
    collection_one = Collections.create(user_one, {"name": "One"})
    collection_two = Collections.create(user_two, {"name": "Two"})
    request_one = Requests.create(user_one, {"collection_id": collection_one["id"], "name": "One request"})
    request_two = Requests.create(user_two, {"collection_id": collection_two["id"], "name": "Two request"})

    with pytest.raises(ValueError, match="Collection not found"):
        Requests.reorder(collection_two["id"], user_one, [request_one["id"]])

    with pytest.raises(ValueError, match="exactly the requests"):
        Requests.reorder(collection_one["id"], user_one, [request_one["id"], request_two["id"]])

    with pytest.raises(ValueError, match="Target collection not found"):
        Requests.move(request_one["id"], user_one, collection_two["id"])

    with pytest.raises(ValueError, match="Request not found"):
        Requests.move(request_two["id"], user_one, collection_one["id"])

    with pytest.raises(ValueError, match="Request not found"):
        Requests.duplicate(request_two["id"], user_one)

    duplicate = Requests.duplicate(request_one["id"], user_one)
    assert duplicate["user_id"] == user_one
    assert duplicate["collection_id"] == collection_one["id"]
    assert Requests.get_by_id(duplicate["id"], user_two) is None
