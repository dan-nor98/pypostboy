"""Django settings for PostBoy.

The project keeps PostBoy's existing lightweight SQLite repository layer while
using Django for HTTP routing, middleware, sessions, static serving, and WSGI
integration.
"""

import os
from urllib.parse import parse_qs, unquote, urlparse

from pypostboy.config import BaseConfig, DEFAULT_DATABASE_PATH, DEFAULT_STATIC_FOLDER


def _split_csv(value):
    return [item.strip() for item in (value or '').split(',') if item.strip()]


def _as_bool(value, default=False):
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


def _django_sqlite_name(database_url=None):
    """Resolve Django's SQLite path to the same SQLite DB used by repositories."""
    explicit = os.environ.get('POSTBOY_DJANGO_DB_PATH')
    if explicit:
        return explicit

    if database_url and database_url.startswith('sqlite://'):
        parsed = urlparse(database_url)
        if database_url == 'sqlite:///:memory:' or parsed.path == '/:memory:':
            return ':memory:'
        if parsed.netloc and parsed.netloc not in {'', 'localhost'}:
            return os.path.abspath(unquote(f'//{parsed.netloc}{parsed.path}'))
        return os.path.abspath(unquote(parsed.path or DEFAULT_DATABASE_PATH))

    return os.path.abspath(os.environ.get('POSTBOY_DB_PATH', DEFAULT_DATABASE_PATH))


def _django_database_config():
    """Return Django's database config aligned with PostBoy's repository DB."""
    database_url = (
        os.environ.get('POSTBOY_DJANGO_DATABASE_URL')
        or os.environ.get('POSTBOY_DATABASE_URL')
    )
    if database_url and database_url.startswith(('postgres://', 'postgresql://')):
        parsed = urlparse(database_url)
        query = parse_qs(parsed.query)
        options = {}
        if query.get('sslmode'):
            options['sslmode'] = query['sslmode'][-1]

        config = {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': unquote(parsed.path.lstrip('/')),
            'USER': unquote(parsed.username or ''),
            'PASSWORD': unquote(parsed.password or ''),
            'HOST': parsed.hostname or '',
            'PORT': str(parsed.port or ''),
        }
        if options:
            config['OPTIONS'] = options
        return config

    return {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': _django_sqlite_name(database_url),
    }


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRET_KEY = BaseConfig.SECRET_KEY
DEBUG = BaseConfig.DEBUG
ALLOWED_HOSTS = _split_csv(os.environ.get('ALLOWED_HOSTS'))
if not ALLOWED_HOSTS and DEBUG:
    ALLOWED_HOSTS = ['localhost', '127.0.0.1', '[::1]']
ROOT_URLCONF = 'pypostboy.urls'
WSGI_APPLICATION = 'pypostboy.wsgi.application'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
USE_TZ = True
TIME_ZONE = 'UTC'
INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'pypostboy.apps.core',
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'pypostboy.djangoapp.csrf.PostBoyTokenCsrfExemptMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'pypostboy.djangoapp.middleware.PostBoyMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]
# PostBoy owns its application schema through pypostboy.db migrations. Django's
# database setting is still required for framework internals. Browser sessions
# are stored server-side so individual session rows can be invalidated for
# logout, password resets, and account changes.
DATABASES = {'default': _django_database_config()}
SESSION_ENGINE = 'django.contrib.sessions.backends.db'
SESSION_COOKIE_NAME = 'sessionid'
SESSION_COOKIE_PATH = '/'
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = _as_bool(
    os.environ.get('SESSION_COOKIE_SECURE'),
    default=not DEBUG,
)
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_COOKIE_SECURE = _as_bool(
    os.environ.get('CSRF_COOKIE_SECURE'),
    default=not DEBUG,
)
# The frontend reads csrftoken from document.cookie for API requests.
CSRF_COOKIE_HTTPONLY = False
CSRF_TRUSTED_ORIGINS = _split_csv(os.environ.get('CSRF_TRUSTED_ORIGINS'))
POSTBOY_API_TOKEN_MAX_AGE_SECONDS = BaseConfig.POSTBOY_API_TOKEN_MAX_AGE_SECONDS
PUBLIC_DIR = os.path.abspath(os.environ.get('POSTBOY_STATIC_FOLDER', DEFAULT_STATIC_FOLDER))
PROXY_TIMEOUT = BaseConfig.PROXY_TIMEOUT
DATA_UPLOAD_MAX_MEMORY_SIZE = BaseConfig.MAX_CONTENT_LENGTH

SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = os.environ.get('X_FRAME_OPTIONS', 'DENY')
SECURE_REFERRER_POLICY = os.environ.get('SECURE_REFERRER_POLICY', 'same-origin')
SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '0'))
SECURE_HSTS_INCLUDE_SUBDOMAINS = _as_bool(
    os.environ.get('SECURE_HSTS_INCLUDE_SUBDOMAINS'),
    default=False,
)
SECURE_HSTS_PRELOAD = _as_bool(os.environ.get('SECURE_HSTS_PRELOAD'), default=False)

# CORS controls for browser clients (especially containerized local development).
# Use comma-separated env vars:
# - CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
# - CORS_ALLOWED_ORIGIN_REGEXES=^https://.*\\.example\\.com$
CORS_ALLOWED_ORIGINS = _split_csv(os.environ.get('CORS_ALLOWED_ORIGINS'))
CORS_ALLOWED_ORIGIN_REGEXES = _split_csv(os.environ.get('CORS_ALLOWED_ORIGIN_REGEXES'))
CORS_ALLOW_CREDENTIALS = _as_bool(
    os.environ.get('CORS_ALLOW_CREDENTIALS'),
    default=True,
)
# Dev-friendly default: allow all origins only in DEBUG unless overridden.
CORS_ALLOW_ALL_ORIGINS = _as_bool(
    os.environ.get('CORS_ALLOW_ALL_ORIGINS'),
    default=DEBUG,
)

LOG_LEVEL = os.environ.get('POSTBOY_LOG_LEVEL', 'INFO').upper()
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '%(asctime)s %(levelname)s [%(name)s] %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
            'level': LOG_LEVEL,
        },
    },
    'loggers': {
        'pypostboy': {
            'handlers': ['console'],
            'level': LOG_LEVEL,
            'propagate': False,
        },
    },
}

AUTHENTICATION_BACKENDS = ['pypostboy.djangoapp.auth_backend.PostBoyAuthBackend']

AUTH_USER_MODEL = 'core.User'
