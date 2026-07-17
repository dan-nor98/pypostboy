# Synchronization status contract and conflict policy

The backend exposes `GET /api/sync/status` and includes the same contract in `GET /api/collections` responses as `sync_status`.

Statuses are:

- `synchronized`: local storage is current.
- `synchronizing`: a sync attempt is currently running or has been requested.
- `offline`: synchronization cannot reach its peer and may be retried.
- `failed`: synchronization ended with diagnostics that need attention.

The status payload includes `label`, `diagnostics`, `conflicts`, `conflict_policy`, and `retryable`. Retryable statuses can be retried with `POST /api/sync/retry`.

## Conflict policy

Local changes must never be overwritten silently. Update clients should submit `expected_updated_at` with collection and request updates. If the stored record has a different `updated_at`, the API returns HTTP 409 with conflict metadata (`resource_type`, `resource_id`, `expected_updated_at`, `actual_updated_at`, and policy text). The caller must reload the latest resource, merge intentionally, and retry with the new `expected_updated_at`.
