"""Configuration objects for PostBoy Django environments."""

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DATABASE_PATH = os.path.abspath(
    os.path.join(BASE_DIR, 'postboy-data.db')
)
DEFAULT_DATABASE_URL = os.environ.get('POSTBOY_DATABASE_URL')


def get_database_backend(database_url=None, explicit_backend=None):
    """Return the configured database backend while defaulting to SQLite."""
    backend = (
        explicit_backend or os.environ.get('POSTBOY_DB_BACKEND') or ''
    ).strip().lower()
    if backend in {'postgres', 'postgresql'}:
        return 'postgresql'
    if backend == 'sqlite':
        return 'sqlite'

    url = database_url or os.environ.get('POSTBOY_DATABASE_URL') or ''
    if url.startswith(('postgres://', 'postgresql://')):
        return 'postgresql'
    return 'sqlite'


def normalize_runtime_stage(value=None):
    """Normalize the configured runtime stage and classify production use."""
    raw_stage = str(value or os.environ.get('POSTBOY_RUNTIME_STAGE') or '').strip()
    if not raw_stage:
        raw_stage = 'development'

    normalized_key = raw_stage.lower().replace('_', '-').replace(' ', '-')
    production_aliases = {'prod', 'production'}
    label_aliases = {
        'dev': 'Development',
        'development': 'Development',
        'local': 'Local',
        'test': 'Testing',
        'testing': 'Testing',
        'stage': 'Staging',
        'staging': 'Staging',
        'qa': 'QA',
        'prod': 'Production',
        'production': 'Production',
    }
    label = label_aliases.get(normalized_key) or raw_stage.replace('-', ' ').title()
    classification = 'production' if normalized_key in production_aliases else 'non-production'
    return {
        'name': label,
        'classification': classification,
        'isProduction': classification == 'production',
        'label': label if classification == 'production' else f'{label} (non-production)',
    }


def _redact_secret_url(value):
    """Return a URL-like value without embedded credentials."""
    from urllib.parse import urlsplit, urlunsplit

    if not value:
        return ''
    try:
        parsed = urlsplit(str(value))
    except ValueError:
        return '[invalid]'
    if not parsed.netloc:
        return str(value)
    host = parsed.hostname or ''
    if ':' in host and not host.startswith('['):
        host = f'[{host}]'
    netloc = host
    if parsed.port is not None:
        netloc = f'{netloc}:{parsed.port}'
    if parsed.username or parsed.password:
        netloc = f'[redacted]@{netloc}'
    return urlunsplit((parsed.scheme, netloc, parsed.path, parsed.query, parsed.fragment))


def get_proxy_settings():
    """Return explicit proxy configuration and safe runtime metadata."""
    target = (os.environ.get('POSTBOY_PROXY_TARGET') or os.environ.get('POSTBOY_PROXY_URL') or '').strip()
    transport = (os.environ.get('POSTBOY_PROXY_TRANSPORT') or 'http').strip().lower()
    auth_policy = (os.environ.get('POSTBOY_PROXY_AUTH_POLICY') or 'client-provided').strip().lower()
    enabled = _bool_from_env('POSTBOY_PROXY_ENABLED', True)
    configured = any([
        os.environ.get('POSTBOY_PROXY_ENABLED'),
        target,
        os.environ.get('POSTBOY_PROXY_TRANSPORT'),
        os.environ.get('POSTBOY_PROXY_AUTH_POLICY'),
    ])
    diagnostics = []
    if not enabled:
        diagnostics.append('Outbound proxying is disabled by backend configuration')
    if target:
        diagnostics.append(f'Proxy target configured: {_redact_secret_url(target)}')
    return {
        'enabled': enabled,
        'configured': configured,
        'mode': 'enabled' if enabled else 'disabled',
        'target': _redact_secret_url(target),
        'transport': transport,
        'authPolicy': auth_policy,
        'diagnostics': diagnostics,
    }

def _int_from_env(name, default):
    """Read an integer environment variable with a safe fallback."""
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


def _bool_from_env(name, default=False):
    """Read a boolean environment variable with common truthy values."""
    value = os.environ.get(name)
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


class BaseConfig:
    """Shared defaults for all PostBoy environments."""

    DATABASE_PATH = os.path.abspath(
        os.environ.get('POSTBOY_DB_PATH', DEFAULT_DATABASE_PATH)
    )
    DATABASE_URL = DEFAULT_DATABASE_URL
    DB_BACKEND = get_database_backend(DATABASE_URL)
    DEBUG = False
    MAX_CONTENT_LENGTH = _int_from_env('POSTBOY_MAX_CONTENT_LENGTH', 10 * 1024 * 1024)
    PROXY_TIMEOUT = _int_from_env('POSTBOY_PROXY_TIMEOUT', 30)
    PROXY_ENABLED = _bool_from_env('POSTBOY_PROXY_ENABLED', True)
    PROXY_TARGET = os.environ.get('POSTBOY_PROXY_TARGET') or os.environ.get('POSTBOY_PROXY_URL', '')
    PROXY_TRANSPORT = os.environ.get('POSTBOY_PROXY_TRANSPORT', 'http')
    PROXY_AUTH_POLICY = os.environ.get('POSTBOY_PROXY_AUTH_POLICY', 'client-provided')
    SECRET_KEY = os.environ.get('POSTBOY_SECRET_KEY', 'postboy-dev-secret-key')
    SESSION_COOKIE_SAMESITE = 'Lax'
    POSTBOY_API_TOKEN_MAX_AGE_SECONDS = _int_from_env(
        'POSTBOY_API_TOKEN_MAX_AGE_SECONDS',
        15 * 60,
    )
    RUNTIME_STAGE = normalize_runtime_stage(os.environ.get('POSTBOY_RUNTIME_STAGE'))
    TESTING = False


class DevelopmentConfig(BaseConfig):
    """Configuration for local development."""

    DEBUG = True


class TestingConfig(BaseConfig):
    """Configuration for automated tests."""

    TESTING = True
    DEBUG = False
    DATABASE_PATH = os.path.abspath(
        os.environ.get(
            'POSTBOY_TEST_DB_PATH',
            os.path.join(BASE_DIR, 'postboy-test.db'),
        )
    )


class ProductionConfig(BaseConfig):
    """Configuration for production deployments."""

    DEBUG = False
