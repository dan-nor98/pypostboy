"""URL routes for import API domain."""

from django.urls import path

from pypostboy.routes import imports

urlpatterns = [
    path('', imports.import_data),
]
