"""URL routes for requests API domain."""

from django.http import HttpResponseNotAllowed
from django.urls import path

from pypostboy.routes import requests


def dispatch(method_map):
    """Return a small function-based dispatcher for method-specific views."""
    allowed = sorted(method_map)

    def view(request, *args, **kwargs):
        handler = method_map.get(request.method)
        if handler is None:
            return HttpResponseNotAllowed(allowed)
        return handler(request, *args, **kwargs)

    return view


urlpatterns = [
    path('', dispatch({'POST': requests.create_request})),
    path('reorder', requests.reorder_requests),
    path('<int:id>', dispatch({
        'GET': requests.get_request,
        'PUT': requests.update_request,
        'DELETE': requests.delete_request,
    })),
    path('<int:id>/duplicate', requests.duplicate_request),
    path('<int:id>/move', requests.move_request),
]
