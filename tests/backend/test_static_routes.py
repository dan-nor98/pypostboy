"""Tests for static asset routing."""


def test_legacy_script_path_serves_compatibility_loader(client):
    response = client.get("/script.js")

    assert response.status_code == 200
    assert response.mimetype == "text/javascript"
    assert b"import('/js/main.js')" in response.data
    assert not response.data.lstrip().startswith(b"<")


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
