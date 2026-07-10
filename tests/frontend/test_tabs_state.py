from pathlib import Path


WORKSPACE_CONTROLLER = Path("frontend/src/pages/workspaceController.js")


def test_request_tab_snapshots_are_scoped_to_current_user_or_guest_session():
    source = WORKSPACE_CONTROLLER.read_text(encoding="utf-8")

    assert "const REQUEST_TABS_STORAGE_KEY = 'postboy_request_tabs';" in source
    assert "const REQUEST_TABS_STORAGE_PREFIX = `${REQUEST_TABS_STORAGE_KEY}_user_`;" in source
    assert "const GUEST_REQUEST_TABS_STORAGE_KEY = `${REQUEST_TABS_STORAGE_KEY}_guest`;" in source
    assert "return { storage: sessionStorage, key: GUEST_REQUEST_TABS_STORAGE_KEY };" in source
    assert "return { storage: localStorage, key: REQUEST_TABS_STORAGE_PREFIX + String(user.id) };" in source
    assert "postboy_open_tabs" not in source


def test_request_tab_persistence_captures_active_editor_state_before_unload():
    source = WORKSPACE_CONTROLLER.read_text(encoding="utf-8")

    assert "function snapshotActiveTab()" in source
    assert "tab.state = collectEditorState();" in source
    assert "saveTabsToStorage();" in source
    assert "window.addEventListener('beforeunload'" in source
