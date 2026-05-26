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


def test_security_headers_enabled_on_api_response(client, user_a_headers):
    response = client.get('/api/collections', headers=user_a_headers)

    assert response.status_code == 200
    assert response.headers.get('X-Content-Type-Options') == 'nosniff'
    assert response.headers.get('X-Frame-Options') == 'DENY'
    assert response.headers.get('Referrer-Policy') == 'same-origin'
