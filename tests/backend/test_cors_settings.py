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
