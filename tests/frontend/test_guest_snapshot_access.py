from pathlib import Path


def test_guest_snapshot_refresh_is_silent_until_save_attempt():
    source = Path("public/js/main.js").read_text()

    assert "function canUsePersistentSnapshots()" in source
    assert "return !!(user && !user.is_guest);" in source
    assert (
        "async function refreshInstancesForActiveTab() {\n"
        "        if (!canUsePersistentSnapshots()) {\n"
        "            renderInstancesBar([]);\n"
        "            return;\n"
        "        }"
    ) in source
    assert (
        "async function saveCurrentInstance() {\n"
        "        if (!canUsePersistentSnapshots()) {\n"
        "            showToast('Log in to save response snapshots.', 'error');\n"
        "            return;\n"
        "        }"
    ) in source
