"""Runtime status contract for the frontend status bar."""

import json
import os
from pathlib import Path

from django.conf import settings

from pypostboy.config import BaseConfig


_PROXY_ENV_KEYS = (
    'POSTBOY_PROXY_ENABLED',
    'POSTBOY_PROXY_URL',
    'HTTPS_PROXY',
    'HTTP_PROXY',
    'https_proxy',
    'http_proxy',
)


def _as_bool(value, default=False):
    if value is None:
        return default
    return str(value).strip().lower() in {'1', 'true', 'yes', 'on'}


def _build_version():
    explicit = os.environ.get('POSTBOY_BUILD_VERSION') or os.environ.get('BUILD_VERSION')
    if explicit:
        return explicit

    package_path = Path(__file__).resolve().parents[2] / 'package.json'
    try:
        package = json.loads(package_path.read_text(encoding='utf-8'))
        return package.get('version') or '0.1.0'
    except (OSError, json.JSONDecodeError):
        return '0.1.0'


def build_runtime_status(connection_status='connected', stage=None):
    """Return server-derived runtime metadata for the web client footer."""
    configured_proxy_values = [os.environ.get(key) for key in _PROXY_ENV_KEYS]
    proxy_configured = any(value for value in configured_proxy_values)
    proxy_enabled = _as_bool(os.environ.get('POSTBOY_PROXY_ENABLED'), default=proxy_configured)
    verify_ssl = _as_bool(os.environ.get('POSTBOY_VERIFY_SSL'), default=True)
    active_stage = stage or os.environ.get('POSTBOY_STAGE') or ('Development' if BaseConfig.DEBUG else 'Production')

    return {
        'connectionStatus': connection_status,
        'stage': active_stage,
        'proxy': {
            'enabled': proxy_enabled,
            'configured': proxy_configured,
        },
        'ssl': {
            'verify': verify_ssl,
            'label': 'Enabled' if verify_ssl else 'Disabled',
        },
        'encoding': os.environ.get('POSTBOY_DEFAULT_ENCODING', 'UTF-8'),
        'version': _build_version(),
        'server': {
            'debug': BaseConfig.DEBUG,
            'timeout': getattr(settings, 'PROXY_TIMEOUT', BaseConfig.PROXY_TIMEOUT) if settings.configured else BaseConfig.PROXY_TIMEOUT,
        },
    }
