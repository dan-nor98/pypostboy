"""Shared JSON response helpers for the PostBoy API."""

from flask import jsonify


def success_response(data=None, status=200):
    """Return a standard successful API response."""
    payload = {"success": True, "data": data}
    response = jsonify(payload)
    return (response, status) if status != 200 else response


def error_response(error, status=400):
    """Return a standard error API response."""
    return jsonify({"success": False, "error": str(error)}), status
