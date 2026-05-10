"""Shared JSON response helpers for the PostBoy API."""

from flask import jsonify


def ok(data=None, status=200, **extra):
    """Return a standard successful API response."""
    payload = {"success": True, "data": data}
    payload.update(extra)
    response = jsonify(payload)
    return response, status


def created(data=None, **extra):
    """Return a standard successful creation API response."""
    return ok(data, status=201, **extra)


def error(message, status=400, **extra):
    """Return a standard failed API response."""
    payload = {"success": False, "error": str(message)}
    payload.update(extra)
    return jsonify(payload), status


# Backwards-compatible aliases for modules/tests that still import the old names.
success_response = ok
error_response = error
