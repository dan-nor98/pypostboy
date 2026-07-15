import React from 'react';
import {ChevronDown, Folder, GripVertical} from 'lucide-react';
import {Method} from './Method';

function MoveControls({label, onMoveUp, onMoveDown}) {
  return (
    <span className="tree-move-controls" aria-label={`${label} reorder controls`}>
      <GripVertical size={13} aria-hidden="true" />
      <button
        className="tree-move-button"
        type="button"
        aria-label={`Move ${label} up`}
        onClick={(event) => {
          event.stopPropagation();
          onMoveUp?.();
        }}
      >
        ↑
      </button>
      <button
        className="tree-move-button"
        type="button"
        aria-label={`Move ${label} down`}
        onClick={(event) => {
          event.stopPropagation();
          onMoveDown?.();
        }}
      >
        ↓
      </button>
    </span>
  );
}

export function TreeNode({item, activeRequestId, onSelectRequest, onToggleCollection, tabIndex, onFocus, onMoveCollection, onMoveRequest}) {
  if (item.type === 'collection') {
    return (
      <div
        className="tree-row tree-button folder"
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
        <MoveControls
          label="collection"
          onMoveUp={() => onMoveCollection?.(item.rawId, 'up', item.parentRawId)}
          onMoveDown={() => onMoveCollection?.(item.rawId, 'down', item.parentRawId)}
        />
      </div>
    );
  }

  const request = item.request;
  return (
    <div
      className={`tree-row tree-button ${request.id === activeRequestId ? 'selected' : ''}`}
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
      <MoveControls
        label="request"
        onMoveUp={() => onMoveRequest?.(request.id, 'up', item.parentRawId)}
        onMoveDown={() => onMoveRequest?.(request.id, 'down', item.parentRawId)}
      />
    </div>
  );
}
