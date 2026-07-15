"""Lightweight health check views for service diagnostics."""

from pypostboy.http.responses import ok


def healthz(request):
    """Return success when the Django process can serve requests."""
    return ok({'status': 'ok'})
