def test_runtime_status_is_public_and_reports_server_state(client, monkeypatch):
    monkeypatch.setenv('POSTBOY_STAGE', 'Test')
    monkeypatch.setenv('POSTBOY_PROXY_ENABLED', 'false')
    monkeypatch.setenv('POSTBOY_PROXY_URL', 'http://proxy.example.test:8080')
    monkeypatch.setenv('POSTBOY_VERIFY_SSL', 'false')
    monkeypatch.setenv('POSTBOY_DEFAULT_ENCODING', 'ISO-8859-1')
    monkeypatch.setenv('POSTBOY_BUILD_VERSION', '9.8.7')

    response = client.get('/api/runtime/status')

    assert response.status_code == 200
    payload = response.json()['data']
    assert payload['connectionStatus'] == 'connected'
    assert payload['stage'] == 'Test'
    assert payload['proxy'] == {'enabled': False, 'configured': True}
    assert payload['ssl'] == {'verify': False, 'label': 'Disabled'}
    assert payload['encoding'] == 'ISO-8859-1'
    assert payload['version'] == '9.8.7'
