import pytest
from pypostboy.repositories.requests import Requests


def test_request_query_params_persist_structured_rows(collection, user_a):
    rows = [
        {"enabled": False, "key": "debug", "value": "1", "description": "disabled flag"},
        {"enabled": True, "key": "tag", "value": "one", "description": "first"},
        {"enabled": True, "key": "tag", "value": "two", "description": "duplicate"},
        {"enabled": True, "key": "", "value": "", "description": ""},
    ]
    request = Requests.create(user_a["id"], {"collection_id": collection["id"], "name": "Params", "query_params": rows})
    assert request["query_params"] == rows

    updated_rows = [*rows, {"enabled": True, "key": "empty_value", "value": "", "description": "empty values are allowed"}]
    updated = Requests.update(request["id"], user_a["id"], {"query_params": updated_rows})
    assert updated["query_params"] == updated_rows


def test_duplicate_request_copies_query_param_metadata(collection, user_a):
    rows = [{"enabled": False, "key": "archived", "value": "yes", "description": "do not send"}]
    request = Requests.create(user_a["id"], {"collection_id": collection["id"], "name": "Original", "query_params": rows})

    duplicate = Requests.duplicate(request["id"], user_a["id"])

    assert duplicate["query_params"] == rows
