from pathlib import Path


WORKSPACE_CONTROLLER = Path("frontend/src/pages/workspaceController.js")


def test_response_snapshots_are_local_ui_state_without_guest_network_requirement():
    source = WORKSPACE_CONTROLLER.read_text(encoding="utf-8")
    snapshot_start = source.index("function saveCurrentSnapshot()")
    snapshot_block = source[snapshot_start:source.index("function initModalCloseHandlers", snapshot_start)]

    assert "if (!latestResponse)" in snapshot_block
    assert "$('#snapshotList').prepend(item);" in snapshot_block
    assert "item.addEventListener('click', () => renderResponse(latestResponse));" in snapshot_block
    assert "apiClient.createRequestInstance" not in snapshot_block
