"""WSGI entrypoint for the PostBoy Django application."""

import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pypostboy.settings')

application = get_wsgi_application()
