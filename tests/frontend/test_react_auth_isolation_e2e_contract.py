from pathlib import Path


DASHBOARD = Path("frontend/src/PostBoyDashboard.tsx")
CHECKLIST = Path("docs/manual-regression-checklist.md")


def _source() -> str:
    return DASHBOARD.read_text()


def test_auth_sensitive_react_ui_has_stable_e2e_selectors():
    source = _source()

    for selector in (
        'testId="auth-panel"',
        'data-testid="anonymous-auth-state"',
        'testId="logout-button"',
        'data-testid="signed-in-auth-state"',
        'testId="request-builder"',
        'testId="request-builder-empty"',
        'data-testid="request-url-input"',
        'data-testid="request-name-input"',
        'data-testid="pair-editor"',
        'data-testid="request-auth-type-select"',
        'data-testid="request-auth-data-input"',
        'data-testid="request-body-editor"',
        'testId="response-pane"',
        'data-testid="response-body"',
        'data-testid="response-headers"',
        'data-testid="collections-panel"',
        'data-testid="collection-row"',
        'data-testid="collection-request-row"',
        'data-testid="history-panel"',
        'data-testid="history-row"',
        'data-testid="environment-panel"',
        'data-testid="environment-variable-row"',
        'testId="snapshots-panel"',
        'data-testid="snapshot-row"',
    ):
        assert selector in source

    assert 'testId={`request-tab-${item}`}' in source
    assert 'testId={`sidebar-tab-${tab}`}' in source


def test_logout_and_user_switch_clear_user_a_state_before_loading_user_b_or_guest():
    source = _source()
    clear_start = source.index('function clearUserScopedDashboardState')
    refresh_start = source.index('async function refreshWorkspace', clear_start)
    clear_function = source[clear_start:refresh_start]

    for reset in (
        'setSelectedCollectionId(null);',
        "setResponseError('');",
        "setImportText('');",
        'setEnvVars({});',
        'collections: readyLoadable([]),',
        'selectedRequest: readyLoadable(null),',
        'responseHistory: readyLoadable([]),',
        'lastResponse: null,',
        'importOutcome: null,',
    ):
        assert reset in clear_function

    refresh_end = source.index('async function refreshCollections', refresh_start)
    refresh_function = source[refresh_start:refresh_end]
    assert 'clearUserScopedDashboardState();' in refresh_function
    assert 'collections: loadingLoadable([])' in refresh_function
    assert 'collections: errorLoadable([]' in refresh_function
    assert 'loadingLoadable(current.collections.data)' not in refresh_function

    for handler_name in ('authLogin', 'authRegister', 'authGuest'):
        start = source.index(f'async function {handler_name}')
        end = source.index('async function', start + 1) if 'async function' in source[start + 1:] else len(source)
        handler = source[start:end]
        assert 'clearUserScopedDashboardState();' in handler
        assert handler.index('clearUserScopedDashboardState();') < handler.index('await refreshWorkspace();')

    logout_start = source.index('async function authLogout')
    logout_end = source.index('return <div', logout_start)
    logout_handler = source[logout_start:logout_end]
    assert 'const workspace = await logout();' in logout_handler
    assert 'clearUserScopedDashboardState(workspace);' in logout_handler
    assert 'await refreshWorkspace(false);' in logout_handler
    assert logout_handler.index('const workspace = await logout();') < logout_handler.index('clearUserScopedDashboardState(workspace);')
    assert logout_handler.index('clearUserScopedDashboardState(workspace);') < logout_handler.index('await refreshWorkspace(false);')


def test_manual_checklist_points_to_automated_e2e_isolation_assertions():
    checklist = CHECKLIST.read_text()

    assert 'Automated coverage: `tests/frontend/test_react_auth_isolation_e2e_contract.py`' in checklist
    assert 'request tabs' in checklist.lower()
    assert 'environment-variable' in checklist
