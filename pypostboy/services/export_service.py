"""Export helpers for Postman collections and cURL commands."""

import shlex
from urllib.parse import parse_qsl, urlparse

from db import Collections, Requests


def _enabled_items(items):
    for item in items or []:
        if isinstance(item, dict):
            if item.get("enabled", True) is not False and item.get("key"):
                yield item
        elif isinstance(item, (list, tuple)):
            if len(item) >= 3:
                enabled, key, value = item[0], item[1], item[2]
            elif len(item) >= 2:
                enabled, key, value = True, item[0], item[1]
            else:
                continue
            if enabled and key:
                yield {"key": key, "value": value}


def _postman_auth(request_record):
    auth_type = (request_record.get("auth_type") or "none").lower()
    auth_data = request_record.get("auth_data") or {}
    if auth_type in ("none", "noauth", ""):
        return None
    if auth_type == "bearer":
        return {"type": "bearer", "bearer": [{"key": "token", "value": auth_data.get("token", ""), "type": "string"}]}
    if auth_type == "basic":
        return {"type": "basic", "basic": [
            {"key": "username", "value": auth_data.get("username", ""), "type": "string"},
            {"key": "password", "value": auth_data.get("password", ""), "type": "string"},
        ]}
    if auth_type == "api_key":
        return {"type": "apikey", "apikey": [
            {"key": "key", "value": auth_data.get("key", ""), "type": "string"},
            {"key": "value", "value": auth_data.get("value", ""), "type": "string"},
            {"key": "in", "value": auth_data.get("in", "header"), "type": "string"},
        ]}
    return None


def _postman_url(url):
    parsed = urlparse(url or "")
    result = {"raw": url or ""}
    if parsed.scheme:
        result["protocol"] = parsed.scheme
    if parsed.netloc:
        result["host"] = parsed.hostname.split(".") if parsed.hostname else []
        if parsed.port:
            result["port"] = str(parsed.port)
    path = parsed.path.strip("/")
    if path:
        result["path"] = path.split("/")
    query = [{"key": key, "value": value} for key, value in parse_qsl(parsed.query, keep_blank_values=True)]
    if query:
        result["query"] = query
    return result


def _postman_body(request_record):
    body_type = request_record.get("body_type") or "none"
    content = request_record.get("body_content") or request_record.get("body_raw") or ""
    form_data = list(_enabled_items(request_record.get("form_data")))
    if body_type in ("form", "form_data", "multipart") and form_data:
        return {"mode": "formdata", "formdata": [{"key": item.get("key", ""), "value": item.get("value", ""), "type": item.get("type", "text")} for item in form_data]}
    if body_type in ("urlencoded", "x-www-form-urlencoded") and form_data:
        return {"mode": "urlencoded", "urlencoded": [{"key": item.get("key", ""), "value": item.get("value", "")} for item in form_data]}
    if content:
        return {"mode": "raw", "raw": content, "options": {"raw": {"language": "json" if request_record.get("body_raw_type") == "application/json" else "text"}}}
    return None


def request_to_postman_item(request_record):
    item_request = {
        "method": (request_record.get("method") or "GET").upper(),
        "header": [{"key": item.get("key", ""), "value": item.get("value", ""), "type": "text"} for item in _enabled_items(request_record.get("headers"))],
        "url": _postman_url(request_record.get("url")),
    }
    body = _postman_body(request_record)
    auth = _postman_auth(request_record)
    if body:
        item_request["body"] = body
    if auth:
        item_request["auth"] = auth
    return {"name": request_record.get("name") or "Untitled Request", "request": item_request}


def _collection_item(collection):
    items = [request_to_postman_item(request) for request in collection.get("requests", [])]
    items.extend(_collection_item(child) for child in collection.get("children", []))
    result = {"name": collection.get("name") or "Untitled Collection", "item": items}
    if collection.get("description"):
        result["description"] = collection["description"]
    return result


def export_collection(collection_id, user_id):
    collection = Collections.get_by_id(collection_id, user_id)
    if not collection:
        raise ValueError("Collection not found")
    # get_by_id only returns one child level; get_all has the complete tree.
    def find(nodes):
        for node in nodes:
            if str(node.get("id")) == str(collection_id):
                return node
            match = find(node.get("children", []))
            if match:
                return match
        return None
    root = find(Collections.get_all(user_id)) or collection
    return {
        "info": {
            "name": root.get("name") or "PostBoy Collection",
            "description": root.get("description") or "",
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json",
        },
        "item": _collection_item(root)["item"],
    }


def request_to_curl(request_record):
    if not request_record:
        raise ValueError("Request not found")
    parts = ["curl", "-X", (request_record.get("method") or "GET").upper(), request_record.get("url") or ""]
    for header in _enabled_items(request_record.get("headers")):
        parts.extend(["-H", f"{header.get('key')}: {header.get('value', '')}"])
    auth_type = (request_record.get("auth_type") or "none").lower()
    auth_data = request_record.get("auth_data") or {}
    if auth_type == "bearer" and auth_data.get("token"):
        parts.extend(["-H", f"Authorization: Bearer {auth_data['token']}"])
    elif auth_type == "basic":
        parts.extend(["-u", f"{auth_data.get('username', '')}:{auth_data.get('password', '')}"])
    elif auth_type == "api_key" and auth_data.get("key"):
        if auth_data.get("in") == "query":
            separator = "&" if "?" in parts[3] else "?"
            parts[3] = f"{parts[3]}{separator}{auth_data['key']}={auth_data.get('value', '')}"
        else:
            parts.extend(["-H", f"{auth_data['key']}: {auth_data.get('value', '')}"])
    body_type = request_record.get("body_type") or "none"
    form_data = list(_enabled_items(request_record.get("form_data")))
    if body_type in ("form", "form_data", "multipart") and form_data:
        for item in form_data:
            parts.extend(["-F", f"{item.get('key')}={item.get('value', '')}"])
    elif body_type in ("urlencoded", "x-www-form-urlencoded") and form_data:
        for item in form_data:
            parts.extend(["--data-urlencode", f"{item.get('key')}={item.get('value', '')}"])
    elif request_record.get("body_content"):
        parts.extend(["--data", request_record.get("body_content")])
    return " ".join(shlex.quote(str(part)) for part in parts if part != "")


def export_request_curl(request_id, user_id):
    request_record = Requests.get_by_id(request_id, user_id)
    if not request_record:
        raise ValueError("Request not found")
    return {"curl": request_to_curl(request_record)}
