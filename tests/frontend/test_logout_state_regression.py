from pathlib import Path


WORKSPACE_CONTROLLER = Path("frontend/src/pages/workspaceController.js")
CHECKLIST = Path("docs/manual-regression-checklist.md")


def test_logout_handler_clears_user_scoped_ui_before_hiding_app():
    source = WORKSPACE_CONTROLLER.read_text(encoding="utf-8")
    logout_start = source.index("$('#logoutBtn')?.addEventListener('click'")
    logout_end = source.index("$('#registerRecoveryAcknowledge')", logout_start)
    logout_handler = source[logout_start:logout_end]

    assert "await logoutUser();" in logout_handler
    assert "clearUserScopedUiState();" in logout_handler
    assert "setAuthenticatedViewVisible(false);" in logout_handler
    assert logout_handler.index("await logoutUser();") < logout_handler.index("clearUserScopedUiState();")
    assert logout_handler.index("clearUserScopedUiState();") < logout_handler.index("setAuthenticatedViewVisible(false);")


def test_logout_clear_resets_hidden_workspace_state_and_next_initialization():
    source = WORKSPACE_CONTROLLER.read_text(encoding="utf-8")
    clear_start = source.index("function clearUserScopedUiState")
    clear_end = source.index("async function reloadUserScopedData", clear_start)
    clear_function = source[clear_start:clear_end]

    for reset in (
        "history = resetStorageBackedState ? []",
        "envVars = resetStorageBackedState ? {}",
        "collectionsData = [];",
        "activeCollectionId = null;",
        "selectedRequestId = null;",
        "latestResponse = null;",
        "activeRequest = blankRequest();",
        "requestTabs = [];",
        "activeTabId = null;",
        "nextTabNumber = 1;",
        "loadRequestIntoEditor(activeRequest);",
        "renderResponsePlaceholder();",
        "renderRequestTabs();",
    ):
        assert reset in clear_function


def test_manual_logout_regression_checklist_covers_cross_user_visibility():
    checklist = CHECKLIST.read_text(encoding="utf-8")

    for required_phrase in (
        "Sign in as user A.",
        "Click **Logout**.",
        "Sign in as user B, or choose guest mode.",
        "does not see user A's tabs",
        "even briefly during startup",
    ):
        assert required_phrase in checklist
