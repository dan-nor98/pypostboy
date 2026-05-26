"""URL routes for request instances API domain."""

from django.http import HttpResponseNotAllowed
from django.urls import path

from pypostboy.routes import instances


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
    path('requests/<int:id>/instances', dispatch({
        'GET': instances.get_request_instances,
        'POST': instances.create_request_instance,
    })),
    path('request-instances/<int:instance_id>', dispatch({
        'GET': instances.get_request_instance,
        'PUT': instances.update_request_instance,
        'DELETE': instances.delete_request_instance,
    })),
]
