"""Tests for serving the built React frontend through Django."""

from pathlib import Path


def _write_dist_asset(dist_root, relative_path, content):
    asset_path = dist_root / relative_path
    asset_path.parent.mkdir(parents=True, exist_ok=True)
    asset_path.write_text(content, encoding='utf-8')
    return asset_path


def test_frontend_index_serves_built_dist(client, monkeypatch, tmp_path):
    from pypostboy import frontend

    dist_root = tmp_path / 'dist'
    index_path = _write_dist_asset(
        dist_root,
        'index.html',
        '<div id="root"></div><script type="module" src="/frontend/assets/app.js"></script>',
    )
    monkeypatch.setattr(frontend, 'DIST_ROOT', dist_root)

    response = client.get('/')

    assert response.status_code == 200
    assert response.mimetype == 'text/html'
    assert response.data == index_path.read_bytes()


def test_frontend_javascript_asset_serves_explicit_content_type(client, monkeypatch, tmp_path):
    from pypostboy import frontend

    dist_root = tmp_path / 'dist'
    asset_path = _write_dist_asset(dist_root, 'assets/app.js', 'console.log("ok");')
    monkeypatch.setattr(frontend, 'DIST_ROOT', dist_root)

    response = client.get('/frontend/assets/app.js')

    assert response.status_code == 200
    assert response.mimetype == 'text/javascript'
    assert response.data == asset_path.read_bytes()


def test_frontend_css_asset_serves_explicit_content_type(client, monkeypatch, tmp_path):
    from pypostboy import frontend

    dist_root = tmp_path / 'dist'
    asset_path = _write_dist_asset(dist_root, 'assets/app.css', 'body { color: #111; }')
    monkeypatch.setattr(frontend, 'DIST_ROOT', dist_root)

    response = client.get('/frontend/assets/app.css')

    assert response.status_code == 200
    assert response.mimetype == 'text/css'
    assert response.data == asset_path.read_bytes()


def test_frontend_asset_rejects_path_traversal(client, monkeypatch, tmp_path):
    from pypostboy import frontend

    dist_root = tmp_path / 'dist'
    dist_root.mkdir()
    (tmp_path / 'outside.js').write_text('console.log("outside");', encoding='utf-8')
    monkeypatch.setattr(frontend, 'DIST_ROOT', dist_root)

    response = client.get('/frontend/../outside.js')

    assert response.status_code == 404


def test_jsx_components_import_react_for_classic_runtime():
    """Ensure built JSX has a React binding when transformed by Vite."""
    src_root = Path(__file__).resolve().parents[2] / 'frontend' / 'src'
    missing_imports = [
        str(path.relative_to(src_root.parent))
        for path in sorted(src_root.rglob('*.jsx'))
        if '<' in path.read_text(encoding='utf-8')
        and 'import React' not in path.read_text(encoding='utf-8')
    ]

    assert missing_imports == []
