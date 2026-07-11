import {ChevronDown, Folder} from 'lucide-react';
import {Method} from './Method';

export function TreeNode({node, depth = 0, activeRequestId, onSelectRequest}) {
  const requests = node.requests || [];
  const children = node.children || [];

  return (
    <>
      <div className="tree-row folder" role="treeitem" aria-expanded="true" style={{'--depth': depth}}>
        <ChevronDown size={13} />
        <Folder size={14} />
        <span className="truncate">{node.name}</span>
      </div>
      {requests.map((request) => (
        <button
          className={`tree-row tree-button ${request.id === activeRequestId ? 'selected' : ''}`}
          key={request.id}
          role="treeitem"
          style={{'--depth': depth + 1}}
          onClick={() => onSelectRequest?.(request.id)}
        >
          <span />
          <Method m={request.method} />
          <span className="truncate">{request.name}</span>
          {request.id === activeRequestId && <span className="dirty">●</span>}
        </button>
      ))}
      {children.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} activeRequestId={activeRequestId} onSelectRequest={onSelectRequest} />
      ))}
    </>
  );
}
