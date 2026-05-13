"""Minimal WSGI application factory."""

import importlib

from django.conf import settings
from django.core.handlers import WSGIApplication


def get_wsgi_application():
    settings._setup()
    return WSGIApplication()
