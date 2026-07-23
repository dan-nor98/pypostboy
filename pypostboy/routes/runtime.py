"""Runtime status API views."""

from pypostboy.http.responses import ok
from pypostboy.services.runtime_status import build_runtime_status


def get_runtime_status(request):
    """Return server-derived runtime status for the frontend shell."""
    return ok(build_runtime_status())
