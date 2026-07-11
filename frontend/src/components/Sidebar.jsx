import {AlertTriangle, MoreHorizontal, Plus, Search} from 'lucide-react';
import {IconButton} from './IconButton';
import {TreeNode} from './TreeNode';

export function Sidebar({collections = [], loading = false, error = '', activeRequestId, onSelectRequest}) {
  return (
    <aside className="sidebar">
      <div className="side-title">
        <span>COLLECTIONS</span>
        <IconButton label="Create request Ctrl+N"><Plus size={15} /></IconButton>
        <IconButton label="Collection actions"><MoreHorizontal size={15} /></IconButton>
      </div>
      <div className="filter"><Search size={14} /><input placeholder="Filter collections" /></div>
      {error && <div className="banner error"><AlertTriangle size={14} /> {error}</div>}
      {!error && <div className="banner"><AlertTriangle size={14} /> Data synced from local API</div>}
      <div role="tree" className="tree">
        {loading && <div className="empty-state">Loading collections…</div>}
        {!loading && !error && collections.length === 0 && <div className="empty-state">No collections yet.</div>}
        {!loading && collections.map((node) => (
          <TreeNode node={node} key={node.id} activeRequestId={activeRequestId} onSelectRequest={onSelectRequest} />
        ))}
      </div>
    </aside>
  );
}
