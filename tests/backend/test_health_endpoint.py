"""Health endpoint tests."""

from django.test import Client as DjangoClient


def test_healthz_is_public(app):
    """The health endpoint should not require an authenticated API session."""
    response = DjangoClient().get('/healthz')

    assert response.status_code == 200
    assert response.json() == {'success': True, 'data': {'status': 'ok'}}
