"""Django settings for PostBoy.

The project keeps PostBoy's existing lightweight SQLite repository layer while
using Django for HTTP routing, middleware, sessions, static serving, and WSGI
integration.
"""

import os

from pypostboy.config import BaseConfig, DEFAULT_STATIC_FOLDER


def _split_csv(value):
    return [item.strip() for item in (value or '').split(',') if item.strip()]


def _as_bool(value, default=False):
    if value is None:
        return default
    return value.strip().lower() in {'1', 'true', 'yes', 'on'}


BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SECRET_KEY = BaseConfig.SECRET_KEY
DEBUG = BaseConfig.DEBUG
ALLOWED_HOSTS = ['*']
ROOT_URLCONF = 'pypostboy.urls'
WSGI_APPLICATION = 'pypostboy.wsgi.application'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
USE_TZ = True
TIME_ZONE = 'UTC'
INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'pypostboy.djangoapp.middleware.PostBoyMiddleware',
]
# PostBoy owns its application schema through pypostboy.db migrations. Django's
# database setting is still required for framework internals, but sessions use
# signed cookies so no Django-managed tables are needed at runtime.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.environ.get('POSTBOY_DJANGO_DB_PATH', ':memory:'),
    }
}
SESSION_ENGINE = 'django.contrib.sessions.backends.signed_cookies'
SESSION_COOKIE_NAME = 'sessionid'
SESSION_COOKIE_PATH = '/'
SESSION_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SAMESITE = 'Lax'
CSRF_TRUSTED_ORIGINS = _split_csv(os.environ.get('CSRF_TRUSTED_ORIGINS'))
POSTBOY_ALLOW_USER_ID_HEADER = BaseConfig.POSTBOY_ALLOW_USER_ID_HEADER
PUBLIC_DIR = os.path.abspath(os.environ.get('POSTBOY_STATIC_FOLDER', DEFAULT_STATIC_FOLDER))
PROXY_TIMEOUT = BaseConfig.PROXY_TIMEOUT
DATA_UPLOAD_MAX_MEMORY_SIZE = BaseConfig.MAX_CONTENT_LENGTH

# CORS controls for browser clients (especially containerized local development).
# Use comma-separated env vars:
# - CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
# - CORS_ALLOWED_ORIGIN_REGEXES=^https://.*\\.example\\.com$
CORS_ALLOWED_ORIGINS = _split_csv(os.environ.get('CORS_ALLOWED_ORIGINS'))
CORS_ALLOWED_ORIGIN_REGEXES = _split_csv(os.environ.get('CORS_ALLOWED_ORIGIN_REGEXES'))
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
