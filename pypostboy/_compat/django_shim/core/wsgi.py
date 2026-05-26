"""Minimal WSGI application factory."""

import importlib

from pypostboy._compat.django_shim.conf import settings
from pypostboy._compat.django_shim.core.handlers import WSGIApplication


def get_wsgi_application():
    settings._setup()
    return WSGIApplication()
