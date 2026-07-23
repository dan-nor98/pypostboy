"""URL configuration for the PostBoy Django application."""

from django.urls import include, path

from pypostboy import frontend
from pypostboy.health import healthz


urlpatterns = [
    path('', frontend.index),
    path('healthz', healthz),
    path(
        '.well-known/appspecific/com.chrome.devtools.json',
        frontend.chrome_devtools_probe,
    ),
    path('frontend/<path:path>', frontend.asset),
    path('api/auth/', include('pypostboy.apps.auth.urls')),
    path('api/collections', include('pypostboy.apps.collections.urls')),
    path('api/collections/', include('pypostboy.apps.collections.urls')),
    path('api/', include('pypostboy.apps.instances.urls')),
    path('api/requests', include('pypostboy.apps.requests.urls')),
    path('api/requests/', include('pypostboy.apps.requests.urls')),
    path('api/import', include('pypostboy.apps.imports.urls')),
    path('api/proxy', include('pypostboy.apps.proxy.urls')),
    path('api/sync/', include('pypostboy.apps.sync.urls')),
    path('api/runtime/', include('pypostboy.apps.runtime.urls')),
]
