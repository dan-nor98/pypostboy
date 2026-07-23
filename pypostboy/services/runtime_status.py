"""Runtime connection status contract for the frontend shell."""

import json
import os
from enum import Enum
from pathlib import Path

from django.conf import settings

from pypostboy.config import BaseConfig, get_proxy_settings, normalize_runtime_stage
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


def _read_build_metadata_file():
    metadata_path = Path(__file__).resolve().parents[1] / 'build_metadata.json'
    try:
        return json.loads(metadata_path.read_text(encoding='utf-8'))
    except (OSError, json.JSONDecodeError):
        return {}


def _package_version():
    package_path = Path(__file__).resolve().parents[2] / 'package.json'
    try:
        package = json.loads(package_path.read_text(encoding='utf-8'))
        return package.get('version') or '0.1.0'
    except (OSError, json.JSONDecodeError):
        return '0.1.0'


def build_version_metadata():
    """Return build-generated release metadata with environment overrides."""
    file_metadata = _read_build_metadata_file()
    version = os.environ.get('POSTBOY_BUILD_VERSION') or os.environ.get('BUILD_VERSION') or file_metadata.get('version') or _package_version()
    commit_sha = os.environ.get('POSTBOY_BUILD_COMMIT_SHA') or os.environ.get('GIT_COMMIT') or file_metadata.get('commitSha') or 'unknown'
    build_date = os.environ.get('POSTBOY_BUILD_DATE') or os.environ.get('BUILD_DATE') or file_metadata.get('buildDate') or 'unknown'
    release_channel = os.environ.get('POSTBOY_RELEASE_CHANNEL') or os.environ.get('RELEASE_CHANNEL') or file_metadata.get('releaseChannel') or 'development'

    return {
        'version': str(version),
        'commitSha': str(commit_sha),
        'buildDate': str(build_date),
        'releaseChannel': str(release_channel).lower(),
    }


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
    proxy_status = get_proxy_settings()
    verify_ssl = _as_bool(os.environ.get('POSTBOY_VERIFY_SSL'), default=True)
    configured_stage = stage or os.environ.get('POSTBOY_RUNTIME_STAGE') or getattr(settings, 'POSTBOY_RUNTIME_STAGE', None) or BaseConfig.RUNTIME_STAGE
    if isinstance(configured_stage, dict):
        active_stage = configured_stage
    else:
        active_stage = normalize_runtime_stage(configured_stage)
    retry_interval_ms = _as_positive_int(os.environ.get('POSTBOY_RUNTIME_RETRY_INTERVAL_MS'), 30_000)
    retry_backoff = max(1, _as_positive_int(os.environ.get('POSTBOY_RUNTIME_RETRY_BACKOFF'), 2))
    max_retry_interval_ms = max(retry_interval_ms, _as_positive_int(os.environ.get('POSTBOY_RUNTIME_MAX_RETRY_INTERVAL_MS'), 120_000))

    env_diagnostics = [item.strip() for item in os.environ.get('POSTBOY_CONNECTION_DIAGNOSTICS', '').split('|') if item.strip()]
    diagnostic_items = diagnostics if diagnostics is not None else env_diagnostics
    if not diagnostic_items and normalized_connection is not ConnectionStatus.CONNECTED:
        diagnostic_items = sync_status.get('diagnostics', [])

    version_metadata = build_version_metadata()

    return {
        'connectionStatus': normalized_connection.value,
        'connectionLabel': CONNECTION_LABELS[normalized_connection],
        'stage': active_stage['name'],
        'stageLabel': active_stage['label'],
        'stageClassification': active_stage['classification'],
        'isProductionStage': active_stage['isProduction'],
        'diagnostics': diagnostic_items,
        'retry': {
            'intervalMs': retry_interval_ms,
            'backoff': retry_backoff,
            'maxIntervalMs': max_retry_interval_ms,
            'retryable': normalized_connection in {ConnectionStatus.DISCONNECTED, ConnectionStatus.FAILED},
        },
        'syncStatus': sync_status,
        'proxy': {
            'enabled': proxy_status['enabled'],
            'configured': proxy_status['configured'],
            'mode': proxy_status['mode'],
            'target': proxy_status['target'],
            'transport': proxy_status['transport'],
            'authPolicy': proxy_status['authPolicy'],
            'diagnostics': proxy_status['diagnostics'],
        },
        'ssl': {
            'verify': verify_ssl,
            'label': 'Enabled' if verify_ssl else 'Disabled',
        },
        'encoding': os.environ.get('POSTBOY_DEFAULT_ENCODING', 'UTF-8'),
        'version': version_metadata['version'],
        'versionMetadata': version_metadata,
        'build': version_metadata,
        'diagnosticPayload': {
            'diagnostics': diagnostic_items,
            'build': version_metadata,
        },
        'server': {
            'debug': BaseConfig.DEBUG,
            'timeout': getattr(settings, 'PROXY_TIMEOUT', BaseConfig.PROXY_TIMEOUT) if settings.configured else BaseConfig.PROXY_TIMEOUT,
        },
    }
