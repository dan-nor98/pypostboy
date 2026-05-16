"""Django settings for PostBoy.

The project keeps PostBoy's existing lightweight SQLite repository layer while
using Django for HTTP routing, middleware, sessions, static serving, and WSGI
integration.
"""

import os

from pypostboy.config import BaseConfig, DEFAULT_STATIC_FOLDER

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
    'django.contrib.contenttypes',
    'django.contrib.sessions',
]
MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
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
POSTBOY_ALLOW_USER_ID_HEADER = BaseConfig.POSTBOY_ALLOW_USER_ID_HEADER
PUBLIC_DIR = os.path.abspath(os.environ.get('POSTBOY_STATIC_FOLDER', DEFAULT_STATIC_FOLDER))
PROXY_TIMEOUT = BaseConfig.PROXY_TIMEOUT
DATA_UPLOAD_MAX_MEMORY_SIZE = BaseConfig.MAX_CONTENT_LENGTH
