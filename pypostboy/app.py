"""Django application factory and compatibility helpers for PostBoy."""

import json
import os

from django.conf import settings
from django.core.wsgi import get_wsgi_application
from django.test import Client as DjangoClient
from django.utils.module_loading import import_string

from pypostboy.config import DevelopmentConfig, ProductionConfig, TestingConfig
from pypostboy.db.connection import configure_database

CONFIG_BY_NAME = {
    'development': DevelopmentConfig,
    'dev': DevelopmentConfig,
    'testing': TestingConfig,
    'test': TestingConfig,
    'production': ProductionConfig,
    'prod': ProductionConfig,
}


class DjangoResponseAdapter:
    """Expose the small legacy response surface used by legacy tests."""

    def __init__(self, response):
        self._response = response

    def __getattr__(self, name):
        return getattr(self._response, name)

    @property
    def data(self):
        return self._response.content

    @property
    def mimetype(self):
        return (self._response.headers.get('Content-Type') or '').split(';', 1)[0]

    def get_json(self):
        return json.loads(self._response.content.decode(self._response.charset or 'utf-8'))


class LegacyDjangoClient:
    """Django test client with legacy json= convenience and responses."""

    def __init__(self):
        self._client = DjangoClient()

    def _request(self, method, path, **kwargs):
        if 'json' in kwargs:
            kwargs['data'] = json.dumps(kwargs.pop('json'))
            kwargs.setdefault('content_type', 'application/json')
        response = getattr(self._client, method)(path, **kwargs)
        return DjangoResponseAdapter(response)

    def get(self, path, **kwargs):
        return self._request('get', path, **kwargs)

    def post(self, path, **kwargs):
        return self._request('post', path, **kwargs)

    def put(self, path, **kwargs):
        return self._request('put', path, **kwargs)

    def delete(self, path, **kwargs):
        return self._request('delete', path, **kwargs)


class PostBoyDjangoApplication:
    """Small facade around Django's WSGI application for legacy entrypoints."""

    def __init__(self, wsgi_application, config):
        self.wsgi_application = wsgi_application
        self.config = config

    def __call__(self, environ, start_response):
        return self.wsgi_application(environ, start_response)

    def test_client(self):
        return LegacyDjangoClient()


def _config_to_dict(config_object):
    return {
        name: getattr(config_object, name)
        for name in dir(config_object)
        if name.isupper()
    }


def load_config(config=None):
    """Load application configuration from defaults, names, objects, or dicts."""
    config_dict = _config_to_dict(DevelopmentConfig)
    selected_config = config or os.environ.get('POSTBOY_CONFIG')

    if isinstance(selected_config, dict):
        config_dict.update(selected_config)
    elif isinstance(selected_config, str):
        config_object = CONFIG_BY_NAME.get(selected_config.lower())
        if config_object is None:
            config_object = import_string(selected_config)
        config_dict.update(_config_to_dict(config_object))
    elif selected_config:
        config_dict.update(_config_to_dict(selected_config))

    return config_dict


def _apply_django_settings(config_dict):
    """Apply mutable PostBoy settings after Django is configured."""
    settings.DEBUG = bool(config_dict.get('DEBUG', settings.DEBUG))
    settings.SECRET_KEY = config_dict.get('SECRET_KEY', settings.SECRET_KEY)
    settings.PUBLIC_DIR = config_dict.get('PUBLIC_DIR', settings.PUBLIC_DIR)
    settings.PROXY_TIMEOUT = config_dict.get('PROXY_TIMEOUT', settings.PROXY_TIMEOUT)
    settings.DATA_UPLOAD_MAX_MEMORY_SIZE = config_dict.get(
        'MAX_CONTENT_LENGTH', settings.DATA_UPLOAD_MAX_MEMORY_SIZE
    )


def create_app(config=None):
    """Create and configure the PostBoy Django app."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pypostboy.settings')
    config_dict = load_config(config)

    # Importing the WSGI application configures Django once. Runtime mutable
    # settings are then synchronized for tests and local entrypoints.
    wsgi_application = get_wsgi_application()
    _apply_django_settings(config_dict)
    configure_database(config_dict)

    return PostBoyDjangoApplication(wsgi_application, config_dict)
