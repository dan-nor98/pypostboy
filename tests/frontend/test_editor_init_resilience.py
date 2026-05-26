from pathlib import Path

MAIN_JS = Path('public/js/main.js')


def test_body_editor_init_has_fallback_and_does_not_abort_app_boot():
    source = MAIN_JS.read_text()

    assert 'function createBodyEditor()' in source
    assert "CodeMirror initialization failed; using textarea fallback." in source
    assert 'try {' in source[source.index('function createBodyEditor()'):source.index('// ─── Mobile Response Bottom Sheet')]
    assert 'initAuthControls();' in source
    assert 'startAuthFlow();' in source
