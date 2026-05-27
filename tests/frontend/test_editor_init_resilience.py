from pathlib import Path

MAIN_JS = Path('public/js/main.js')


def test_body_editor_init_has_fallback_and_does_not_abort_app_boot():
    source = MAIN_JS.read_text()

    assert 'function createBodyEditor()' in source
    assert "CodeMirror initialization failed; using textarea fallback." in source
    assert 'try {' in source[source.index('function createBodyEditor()'):source.index('// ─── Mobile Response Bottom Sheet')]
    assert 'initAuthControls();' in source
    assert 'startAuthFlow();' in source


def test_body_editor_uses_local_module_and_hidden_attribute_visibility():
    source = MAIN_JS.read_text()

    assert "import('./editor/body-codemirror.js')" in source
    assert 'function updateBodyEditorsVisibility(bodyType)' in source
    assert 'var showFallbackTextarea = showRawEditor && !isBodyCodeMirrorReady;' in source
    assert 'bodyContent.hidden = !showFallbackTextarea;' in source
    assert 'if (tabName === \'body\' && bodyContentCodeMirror) bodyContentCodeMirror.requestMeasure();' in source
