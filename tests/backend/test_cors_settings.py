"""Tests for CORS behavior in middleware and settings overrides."""


def test_allows_configured_cors_origin(client, user_a_headers, monkeypatch):
    monkeypatch.setattr('django.conf.settings.CORS_ALLOW_ALL_ORIGINS', False, raising=False)
    monkeypatch.setattr(
        'django.conf.settings.CORS_ALLOWED_ORIGINS',
        ['http://localhost:3000'],
        raising=False,
    )

    response = client.get(
        '/api/collections',
        headers={**user_a_headers, 'Origin': 'http://localhost:3000'},
    )

    assert response.status_code == 200
    assert response.headers.get('Access-Control-Allow-Origin') == 'http://localhost:3000'
    assert response.headers.get('Access-Control-Allow-Credentials') == 'true'


def test_blocks_unconfigured_cors_origin(client, user_a_headers, monkeypatch):
    monkeypatch.setattr('django.conf.settings.CORS_ALLOW_ALL_ORIGINS', False, raising=False)
    monkeypatch.setattr(
        'django.conf.settings.CORS_ALLOWED_ORIGINS',
        ['http://localhost:3000'],
        raising=False,
    )

    response = client.get(
        '/api/collections',
        headers={**user_a_headers, 'Origin': 'https://evil.example'},
    )

    assert response.status_code == 200
    assert response.headers.get('Access-Control-Allow-Origin') is None
    assert response.headers.get('Access-Control-Allow-Credentials') is None


from django.conf import settings

from pypostboy.app import create_app
from pypostboy.config import ProductionConfig


def test_production_config_defaults_to_non_wildcard_hosts():
    create_app(ProductionConfig)

    assert settings.DEBUG is False
    assert settings.ALLOWED_HOSTS == []


def test_create_app_applies_csrf_trusted_origins_from_config():
    create_app({'CSRF_TRUSTED_ORIGINS': ['http://localhost:8080']})

    assert settings.CSRF_TRUSTED_ORIGINS == ['http://localhost:8080']


def test_security_headers_enabled_on_api_response(client, user_a_headers):
    response = client.get('/api/collections', headers=user_a_headers)

    assert response.status_code == 200
    assert response.headers.get('X-Content-Type-Options') == 'nosniff'
    assert response.headers.get('X-Frame-Options') == 'DENY'
    assert response.headers.get('Referrer-Policy') == 'same-origin'


def _reload_postboy_settings(monkeypatch, *, debug, session_secure=None, csrf_secure=None):
    import importlib

    import pypostboy.config as config_module
    import pypostboy.settings as settings_module

    monkeypatch.setattr(config_module.BaseConfig, 'DEBUG', debug)
    if session_secure is None:
        monkeypatch.delenv('SESSION_COOKIE_SECURE', raising=False)
    else:
        monkeypatch.setenv('SESSION_COOKIE_SECURE', session_secure)
    if csrf_secure is None:
        monkeypatch.delenv('CSRF_COOKIE_SECURE', raising=False)
    else:
        monkeypatch.setenv('CSRF_COOKIE_SECURE', csrf_secure)

    return importlib.reload(settings_module)


def test_cookie_security_defaults_to_secure_outside_debug(monkeypatch):
    settings_module = _reload_postboy_settings(monkeypatch, debug=False)

    assert settings_module.DEBUG is False
    assert settings_module.SESSION_COOKIE_SECURE is True
    assert settings_module.CSRF_COOKIE_SECURE is True
    assert settings_module.SESSION_COOKIE_HTTPONLY is True
    assert settings_module.CSRF_COOKIE_HTTPONLY is False


def test_cookie_security_defaults_to_local_development_friendly(monkeypatch):
    settings_module = _reload_postboy_settings(monkeypatch, debug=True)

    assert settings_module.DEBUG is True
    assert settings_module.SESSION_COOKIE_SECURE is False
    assert settings_module.CSRF_COOKIE_SECURE is False


def test_cookie_security_env_overrides(monkeypatch):
    settings_module = _reload_postboy_settings(
        monkeypatch,
        debug=False,
        session_secure='false',
        csrf_secure='0',
    )

    assert settings_module.SESSION_COOKIE_SECURE is False
    assert settings_module.CSRF_COOKIE_SECURE is False

    settings_module = _reload_postboy_settings(
        monkeypatch,
        debug=True,
        session_secure='yes',
        csrf_secure='on',
    )

    assert settings_module.SESSION_COOKIE_SECURE is True
    assert settings_module.CSRF_COOKIE_SECURE is True
