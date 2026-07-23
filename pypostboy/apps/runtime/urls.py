"""URL routes for runtime metadata."""

from django.http import HttpResponseNotAllowed
from django.urls import path

from pypostboy.routes import runtime


def dispatch(method_map):
    allowed = sorted(method_map)

    def view(request, *args, **kwargs):
        handler = method_map.get(request.method)
        if handler is None:
            return HttpResponseNotAllowed(allowed)
        return handler(request, *args, **kwargs)

    return view


urlpatterns = [
    path('status', dispatch({'GET': runtime.get_runtime_status})),
]
