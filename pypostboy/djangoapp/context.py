"""Per-request context helpers for the Django backend."""

from contextvars import ContextVar

_current_request = ContextVar('postboy_current_request', default=None)


def set_current_request(request):
    """Bind a Django request to the current execution context."""
    return _current_request.set(request)


def reset_current_request(token):
    """Restore the previous request binding."""
    _current_request.reset(token)


def get_current_request():
    """Return the Django request bound to this context, if any."""
    return _current_request.get()
