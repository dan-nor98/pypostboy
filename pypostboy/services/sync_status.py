"""Synchronization status contract and conflict policy helpers."""

import os
from dataclasses import dataclass

SYNC_STATUSES = {"synchronized", "synchronizing", "offline", "failed"}
CONFLICT_POLICY = (
    "Local changes must never be overwritten silently. Clients must send expected_updated_at when updating an existing local record. "
    "When the stored updated_at differs, the API rejects the write with HTTP 409 "
    "and returns conflict metadata; callers must reload, merge intentionally, and retry."
)


@dataclass
class SyncConflictError(ValueError):
    """Raised when a local update would overwrite a newer record."""

    resource_type: str
    resource_id: int
    expected_updated_at: str
    actual_updated_at: str

    def __str__(self):
        return "Local changes conflict with a newer stored version"

    @property
    def metadata(self):
        return {
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "expected_updated_at": self.expected_updated_at,
            "actual_updated_at": self.actual_updated_at,
            "policy": CONFLICT_POLICY,
        }


def build_sync_status(status=None, diagnostics=None, conflicts=None):
    """Return the backend synchronization status contract."""
    normalized_status = status or os.environ.get("POSTBOY_SYNC_STATUS", "synchronized")
    if normalized_status not in SYNC_STATUSES:
        normalized_status = "failed"
        diagnostics = diagnostics or ["Unknown synchronization status configured"]

    env_diagnostics = os.environ.get("POSTBOY_SYNC_DIAGNOSTICS", "")
    diagnostic_items = diagnostics if diagnostics is not None else [
        item.strip() for item in env_diagnostics.split("|") if item.strip()
    ]
    return {
        "status": normalized_status,
        "label": {
            "synchronized": "Synchronized",
            "synchronizing": "Synchronizing",
            "offline": "Offline",
            "failed": "Sync failed",
        }[normalized_status],
        "diagnostics": diagnostic_items,
        "conflicts": conflicts or [],
        "conflict_policy": CONFLICT_POLICY,
        "retryable": normalized_status in {"offline", "failed"},
    }


def assert_expected_version(resource_type, resource, expected_updated_at):
    """Reject stale writes before they silently overwrite newer local changes."""
    if expected_updated_at is None:
        return
    actual_updated_at = resource.get("updated_at")
    if str(expected_updated_at) != str(actual_updated_at):
        raise SyncConflictError(
            resource_type=resource_type,
            resource_id=resource.get("id"),
            expected_updated_at=str(expected_updated_at),
            actual_updated_at=str(actual_updated_at),
        )
