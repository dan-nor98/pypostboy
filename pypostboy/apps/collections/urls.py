"""URL routes for collections API domain."""

from django.http import HttpResponseNotAllowed
from django.urls import path

from pypostboy.routes import collections, requests


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
    path('', dispatch({'GET': collections.get_collections, 'POST': collections.create_collection})),
    path('reorder', collections.reorder_collections),
    path('<int:id>', dispatch({
        'GET': collections.get_collection,
        'PUT': collections.update_collection,
        'DELETE': collections.delete_collection,
    })),
    path('<int:id>/duplicate', collections.duplicate_collection),
    path('<int:id>/requests', requests.get_collection_requests),
]
