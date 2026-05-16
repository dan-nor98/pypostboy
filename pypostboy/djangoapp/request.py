"""Request parsing helpers for Django views."""

import json


class BadJsonBody(ValueError):
    """Raised when a non-blank request body cannot be parsed as a JSON object."""


def json_body(request, allow_blank=True):
    """Return a JSON request body as a dict.

    Blank bodies are returned as an empty dict when ``allow_blank`` is true.
    Malformed JSON, invalid encodings, and non-object JSON bodies raise
    ``BadJsonBody`` so API callers get an explicit parse error instead of the
    request being treated as an empty object.
    """
    if not request.body:
        if allow_blank:
            return {}
        raise BadJsonBody('Invalid JSON request body')
    try:
        payload = json.loads(request.body.decode(request.encoding or 'utf-8'))
    except (UnicodeDecodeError, json.JSONDecodeError, TypeError) as err:
        raise BadJsonBody('Invalid JSON request body') from err
    if not isinstance(payload, dict):
        raise BadJsonBody('Invalid JSON request body')
    return payload
