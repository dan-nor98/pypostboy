import React, {useState} from 'react';
import {Button} from './Button.jsx';

function snapshotLabel(snapshot) {
  const method = snapshot.method || 'GET';
  const url = snapshot.url || 'No URL saved';
  return `${method} ${url}`;
}

export function SnapshotsPanel({
  snapshots,
  loading,
  error,
  saving,
  onSave,
  onRestore,
  onRename,
  onDelete,
}) {
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');

  const startRename = (snapshot) => {
    setEditingId(snapshot.id);
    setEditingName(snapshot.name || 'Untitled snapshot');
  };

  const submitRename = async (event) => {
    event.preventDefault();
    if (!editingId || !editingName.trim()) return;
    await onRename(editingId, editingName.trim());
    setEditingId(null);
    setEditingName('');
  };

  return (
    <section className="snapshots-panel" aria-label="Snapshots">
      <div className="section-head snapshots-head">
        <span>Snapshots</span>
        <Button kind="secondary" onClick={onSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save snapshot'}
        </Button>
      </div>
      {loading && <p className="hint">Loading snapshots…</p>}
      {error && <p className="error" role="status">{error}</p>}
      {!loading && !snapshots.length && <p className="hint">No snapshots saved for this request.</p>}
      <ul className="snapshots-list">
        {snapshots.map((snapshot) => (
          <li key={snapshot.id} className={snapshot.optimistic ? 'optimistic' : undefined}>
            {editingId === snapshot.id ? (
              <form className="snapshot-rename" onSubmit={submitRename}>
                <input
                  aria-label="Snapshot name"
                  value={editingName}
                  onChange={(event) => setEditingName(event.target.value)}
                />
                <button type="submit">Save</button>
                <button type="button" onClick={() => setEditingId(null)}>Cancel</button>
              </form>
            ) : (
              <>
                <div>
                  <strong>{snapshot.name || 'Untitled snapshot'}</strong>
                  <p className="mono hint">{snapshotLabel(snapshot)}</p>
                  {snapshot.response_status && (
                    <p className="hint">Response {snapshot.response_status} {snapshot.response_status_text || ''}</p>
                  )}
                </div>
                <div className="snapshot-actions">
                  <button type="button" onClick={() => onRestore(snapshot)}>Restore snapshot</button>
                  <button type="button" onClick={() => startRename(snapshot)}>Rename</button>
                  <button type="button" onClick={() => onDelete(snapshot.id)}>Delete</button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
