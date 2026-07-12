import React from 'react';
import {ChevronDown, Folder} from 'lucide-react';
import {Method} from './Method';

export function TreeNode({item, activeRequestId, onSelectRequest, onToggleCollection, tabIndex, onFocus}) {
  if (item.type === 'collection') {
    return (
      <button
        className="tree-row tree-button folder"
        type="button"
        role="treeitem"
        aria-expanded={item.expandable ? item.expanded : undefined}
        data-tree-id={item.id}
        tabIndex={tabIndex}
        onFocus={onFocus}
        onClick={() => item.expandable && onToggleCollection?.(item.id, !item.expanded)}
        style={{'--depth': item.depth}}
      >
        <ChevronDown size={13} className={item.expanded ? '' : 'collapsed'} />
        <Folder size={14} />
        <span className="truncate">{item.node.name}</span>
      </button>
    );
  }

  const request = item.request;
  return (
    <button
      className={`tree-row tree-button ${request.id === activeRequestId ? 'selected' : ''}`}
      type="button"
      key={request.id}
      role="treeitem"
      aria-selected={request.id === activeRequestId}
      data-tree-id={item.id}
      tabIndex={tabIndex}
      onFocus={onFocus}
      style={{'--depth': item.depth}}
      onClick={() => onSelectRequest?.(request.id)}
    >
      <span />
      <Method m={request.method} />
      <span className="truncate">{request.name}</span>
      {request.id === activeRequestId && <span className="dirty">●</span>}
    </button>
  );
}
