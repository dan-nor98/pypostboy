"""URL configuration for the PostBoy Django application."""

from django.http import HttpResponseNotAllowed
from django.urls import path

from pypostboy.routes import auth, collections, imports, instances, proxy, requests, static


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
    path('api/auth/me', auth.current_user),
    path('api/auth/login', auth.login),
    path('api/auth/register', auth.register),
    path('api/auth/recover/verify', auth.recover_verify),
    path('api/auth/recover/reset', auth.recover_reset),
    path('api/auth/logout', auth.logout),
    path('api/collections', dispatch({'GET': collections.get_collections, 'POST': collections.create_collection})),
    path('api/collections/reorder', collections.reorder_collections),
    path('api/collections/<int:id>', dispatch({
        'GET': collections.get_collection,
        'PUT': collections.update_collection,
        'DELETE': collections.delete_collection,
    })),
    path('api/collections/<int:id>/duplicate', collections.duplicate_collection),
    path('api/collections/<int:id>/requests', requests.get_collection_requests),
    path('api/requests', dispatch({'POST': requests.create_request})),
    path('api/requests/reorder', requests.reorder_requests),
    path('api/requests/<int:id>', dispatch({
        'GET': requests.get_request,
        'PUT': requests.update_request,
        'DELETE': requests.delete_request,
    })),
    path('api/requests/<int:id>/duplicate', requests.duplicate_request),
    path('api/requests/<int:id>/move', requests.move_request),
    path('api/requests/<int:id>/instances', dispatch({
        'GET': instances.get_request_instances,
        'POST': instances.create_request_instance,
    })),
    path('api/request-instances/<int:instance_id>', dispatch({
        'GET': instances.get_request_instance,
        'PUT': instances.update_request_instance,
        'DELETE': instances.delete_request_instance,
    })),
    path('api/import', imports.import_data),
    path('api/proxy', proxy.proxy_request),
    path('favicon.ico', static.favicon),
    path('', static.index),
    path('<path:path>', static.serve_static),
]
