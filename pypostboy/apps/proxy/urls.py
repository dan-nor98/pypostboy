"""URL routes for proxy API domain."""

from django.urls import path

from pypostboy.routes import proxy

urlpatterns = [
    path('', proxy.proxy_request),
]
