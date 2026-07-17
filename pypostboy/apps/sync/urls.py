"""URL routes for synchronization status."""

from django.http import HttpResponseNotAllowed
from django.urls import path

from pypostboy.routes import sync


def dispatch(method_map):
    allowed = sorted(method_map)

    def view(request, *args, **kwargs):
        handler = method_map.get(request.method)
        if handler is None:
            return HttpResponseNotAllowed(allowed)
        return handler(request, *args, **kwargs)

    return view


urlpatterns = [
    path('status', dispatch({'GET': sync.get_sync_status})),
    path('retry', dispatch({'POST': sync.retry_sync})),
]
