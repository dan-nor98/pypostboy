from pathlib import Path

USER_STATE_JS = Path('public/js/state/user.js')


def test_continue_as_guest_sets_local_guest_user_without_network_roundtrip():
    source = USER_STATE_JS.read_text()
    start = source.index('export async function continueAsGuest()')
    end = source.index('export async function loginUser', start)
    fn_source = source[start:end]

    assert "setExplicitGuestChoice(true);" in fn_source
    assert "currentUser: { username: 'Guest', is_guest: true }" in fn_source
    assert "explicitGuest: true" in fn_source
    assert "apiClient.getCurrentUser()" not in fn_source
