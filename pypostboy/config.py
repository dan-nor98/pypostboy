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
    SECRET_KEY = os.environ.get('POSTBOY_SECRET_KEY', 'postboy-dev-secret-key')
    SESSION_COOKIE_SAMESITE = 'Lax'
    POSTBOY_API_TOKEN_MAX_AGE_SECONDS = _int_from_env(
        'POSTBOY_API_TOKEN_MAX_AGE_SECONDS',
        15 * 60,
    )
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
