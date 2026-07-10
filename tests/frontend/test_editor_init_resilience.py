from pathlib import Path


REQUEST_EDITOR = Path("frontend/src/components/workspace/RequestEditor.js")
WORKSPACE_CONTROLLER = Path("frontend/src/pages/workspaceController.js")


def test_body_editor_uses_native_textarea_fallback_and_does_not_abort_app_boot():
    editor_source = REQUEST_EDITOR.read_text(encoding="utf-8")
    controller_source = WORKSPACE_CONTROLLER.read_text(encoding="utf-8")

    assert 'id="bodyContent"' in editor_source
    assert 'class="form-textarea code-input"' in editor_source
    assert "initAuthControls();" in controller_source
    assert "startAuthFlow();" in controller_source


def test_body_editor_visibility_is_controlled_by_hidden_attribute():
    source = WORKSPACE_CONTROLLER.read_text(encoding="utf-8")

    assert "function updateBodyEditorsVisibility()" in source
    assert "const showRaw = ['json', 'text', 'xml'].includes(bodyType);" in source
    assert "const showForm = ['form-urlencoded', 'form-data'].includes(bodyType);" in source
    assert "$('#bodyContentEditor').hidden = !showRaw;" in source
    assert "$('#formDataContainer').hidden = !showForm;" in source
