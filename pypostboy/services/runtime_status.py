"""Runtime connection status contract for the frontend shell."""

import json
import os
from enum import Enum
from pathlib import Path

from django.conf import settings

from pypostboy.config import BaseConfig
from pypostboy.services.sync_status import build_sync_status


class ConnectionStatus(str, Enum):
    """First-class runtime connectivity states."""

    CONNECTING = 'connecting'
    CONNECTED = 'connected'
    DISCONNECTED = 'disconnected'
    FAILED = 'failed'


CONNECTION_LABELS = {
    ConnectionStatus.CONNECTING: 'Connecting',
    ConnectionStatus.CONNECTED: 'Connected',
    ConnectionStatus.DISCONNECTED: 'Disconnected',
    ConnectionStatus.FAILED: 'Connection failed',
}

SYNC_TO_CONNECTION_STATUS = {
    'synchronized': ConnectionStatus.CONNECTED,
    'synchronizing': ConnectionStatus.CONNECTING,
    'offline': ConnectionStatus.DISCONNECTED,
    'failed': ConnectionStatus.FAILED,
}

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


def _as_positive_int(value, default):
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return default
    return parsed if parsed > 0 else default


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


def normalize_connection_status(status=None, sync_status=None):
    """Normalize explicit runtime status or map synchronization state intentionally."""
    candidate = status or os.environ.get('POSTBOY_CONNECTION_STATUS')
    if not candidate and sync_status:
        candidate = SYNC_TO_CONNECTION_STATUS.get(sync_status.get('status'))
    if isinstance(candidate, ConnectionStatus):
        return candidate
    try:
        return ConnectionStatus(str(candidate))
    except (TypeError, ValueError):
        return ConnectionStatus.FAILED


def build_runtime_status(connection_status=None, stage=None, diagnostics=None, sync_status=None):
    """Return server-derived runtime metadata for the web client footer."""
    sync_status = sync_status if sync_status is not None else build_sync_status()
    normalized_connection = normalize_connection_status(connection_status, sync_status)
    configured_proxy_values = [os.environ.get(key) for key in _PROXY_ENV_KEYS]
    proxy_configured = any(value for value in configured_proxy_values)
    proxy_enabled = _as_bool(os.environ.get('POSTBOY_PROXY_ENABLED'), default=proxy_configured)
    verify_ssl = _as_bool(os.environ.get('POSTBOY_VERIFY_SSL'), default=True)
    active_stage = stage or os.environ.get('POSTBOY_STAGE') or ('Development' if BaseConfig.DEBUG else 'Production')
    retry_interval_ms = _as_positive_int(os.environ.get('POSTBOY_RUNTIME_RETRY_INTERVAL_MS'), 30_000)
    retry_backoff = max(1, _as_positive_int(os.environ.get('POSTBOY_RUNTIME_RETRY_BACKOFF'), 2))
    max_retry_interval_ms = max(retry_interval_ms, _as_positive_int(os.environ.get('POSTBOY_RUNTIME_MAX_RETRY_INTERVAL_MS'), 120_000))

    env_diagnostics = [item.strip() for item in os.environ.get('POSTBOY_CONNECTION_DIAGNOSTICS', '').split('|') if item.strip()]
    diagnostic_items = diagnostics if diagnostics is not None else env_diagnostics
    if not diagnostic_items and normalized_connection is not ConnectionStatus.CONNECTED:
        diagnostic_items = sync_status.get('diagnostics', [])

    return {
        'connectionStatus': normalized_connection.value,
        'connectionLabel': CONNECTION_LABELS[normalized_connection],
        'stage': active_stage,
        'diagnostics': diagnostic_items,
        'retry': {
            'intervalMs': retry_interval_ms,
            'backoff': retry_backoff,
            'maxIntervalMs': max_retry_interval_ms,
            'retryable': normalized_connection in {ConnectionStatus.DISCONNECTED, ConnectionStatus.FAILED},
        },
        'syncStatus': sync_status,
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
