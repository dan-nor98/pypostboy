"""Request parsing helpers for Django views."""

import json


def json_body(request):
    """Return a JSON request body as a dict, or an empty dict for blank/invalid JSON."""
    if not request.body:
        return {}
    try:
        payload = json.loads(request.body.decode(request.encoding or 'utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError, TypeError):
        return {}
    return payload if isinstance(payload, dict) else {}
