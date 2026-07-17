"""Synchronization status API views."""

from django.views.decorators.csrf import csrf_exempt

from pypostboy.http.responses import ok
from pypostboy.services.sync_status import build_sync_status


def get_sync_status(request):
    """Return current synchronization status, diagnostics, and conflict policy."""
    return ok(build_sync_status())


@csrf_exempt
def retry_sync(request):
    """Acknowledge a retry request and report that synchronization is being retried."""
    return ok(build_sync_status("synchronizing", ["Retry requested by client"]))
