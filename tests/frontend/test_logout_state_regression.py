from pathlib import Path


MAIN_JS = Path("public/js/main.js")
CHECKLIST = Path("docs/manual-regression-checklist.md")


def test_logout_handler_clears_user_scoped_ui_before_hiding_app():
    source = MAIN_JS.read_text()
    logout_start = source.index("logoutBtn.addEventListener('click'")
    logout_end = source.index("[authUsername, authPassword]", logout_start)
    logout_handler = source[logout_start:logout_end]

    assert "await logoutUser();" in logout_handler
    assert "clearLogoutUiState();" in logout_handler
    assert "setAuthenticatedViewVisible(false);" in logout_handler
    assert logout_handler.index("await logoutUser();") < logout_handler.index("clearLogoutUiState();")
    assert logout_handler.index("clearLogoutUiState();") < logout_handler.index("setAuthenticatedViewVisible(false);")


def test_logout_clear_resets_hidden_workspace_state_and_next_initialization():
    source = MAIN_JS.read_text()
    clear_start = source.index("function clearUserScopedUiState")
    clear_end = source.index("async function reloadUserScopedData", clear_start)
    clear_functions = source[clear_start:clear_end]

    for reset in (
        "history = resetStorageBackedState ? []",
        "envVars = resetStorageBackedState ? {}",
        "collectionsData = [];",
        "activeRequestInstances = [];",
        "selectedSnapshotId = '';",
        "openTabs = [];",
        "activeTabId = null;",
        "loadStateIntoEditor(getBlankState(), 'GET');",
        "restoreResponsePane(getBlankState());",
        "workspaceInitialized = false;",
    ):
        assert reset in clear_functions


def test_manual_logout_regression_checklist_covers_cross_user_visibility():
    checklist = CHECKLIST.read_text()

    for required_phrase in (
        "Sign in as user A.",
        "Click **Logout**.",
        "Sign in as user B, or choose guest mode.",
        "does not see user A's tabs",
        "even briefly during startup",
    ):
        assert required_phrase in checklist
