"""Configuration objects for PostBoy Flask environments."""

import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_DATABASE_PATH = os.path.abspath(
    os.path.join(BASE_DIR, 'postboy-data.db')
)
DEFAULT_STATIC_FOLDER = os.path.join(BASE_DIR, 'public')


def _int_from_env(name, default):
    """Read an integer environment variable with a safe fallback."""
    try:
        return int(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


class BaseConfig:
    """Shared defaults for all PostBoy environments."""

    DATABASE_PATH = os.path.abspath(
        os.environ.get('POSTBOY_DB_PATH', DEFAULT_DATABASE_PATH)
    )
    DEBUG = False
    MAX_CONTENT_LENGTH = _int_from_env('POSTBOY_MAX_CONTENT_LENGTH', 10 * 1024 * 1024)
    PROXY_TIMEOUT = _int_from_env('POSTBOY_PROXY_TIMEOUT', 30)
    PUBLIC_DIR = os.path.abspath(
        os.environ.get('POSTBOY_STATIC_FOLDER', DEFAULT_STATIC_FOLDER)
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
