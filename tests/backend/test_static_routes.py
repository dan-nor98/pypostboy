"""Tests for static asset routing."""


def test_index_serves_vite_application_entry(client):
    response = client.get("/")

    assert response.status_code == 200
    assert response.mimetype == "text/html"
    assert b'<div id="root"></div>' in response.data
    assert b'/assets/index-' in response.data
    assert b'/js/main.js' not in response.data


def test_missing_asset_does_not_fall_back_to_index_html(client):
    response = client.get("/missing-script.js")

    assert response.status_code == 404
    assert response.mimetype != "text/html" or b"PostBoy - API Testing Client" not in response.data


def test_extensionless_client_route_still_falls_back_to_index_html(client):
    response = client.get("/collections/active")

    assert response.status_code == 200
    assert b"PostBoy - API Testing Client" in response.data


def test_missing_api_endpoint_returns_json_404_not_spa_html(client, user_a_headers):
    response = client.get('/api/does-not-exist', headers=user_a_headers)

    assert response.status_code == 404
    assert response.mimetype == 'application/json'
    payload = response.get_json()
    assert payload['success'] is False
    assert 'not found' in payload['error'].lower()

