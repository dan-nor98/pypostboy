import React, {useEffect, useMemo, useRef, useState} from 'react';
import {AlertTriangle, MoreHorizontal, Plus, Search} from 'lucide-react';
import {IconButton} from './IconButton';
import {TreeNode} from './TreeNode';

function collectVisibleItems(nodes, expandedIds, depth = 0, parentId = null) {
  return nodes.flatMap((node) => {
    const nodeId = `collection-${node.id}`;
    const requests = node.requests || [];
    const children = node.children || [];
    const expanded = expandedIds.has(nodeId);
    const item = {type: 'collection', id: nodeId, rawId: node.id, node, depth, parentId, expandable: requests.length > 0 || children.length > 0, expanded};

    if (!expanded) return [item];

    return [
      item,
      ...requests.map((request) => ({type: 'request', id: `request-${request.id}`, rawId: request.id, request, depth: depth + 1, parentId: nodeId})),
      ...collectVisibleItems(children, expandedIds, depth + 1, nodeId),
    ];
  });
}

function collectionIds(nodes) {
  return nodes.flatMap((node) => [`collection-${node.id}`, ...collectionIds(node.children || [])]);
}

export function Sidebar({collections = [], loading = false, error = '', activeRequestId, onSelectRequest, onImportCurl}) {
  const treeRef = useRef(null);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [focusedItemId, setFocusedItemId] = useState(null);

  const visibleItems = useMemo(() => collectVisibleItems(collections, expandedIds), [collections, expandedIds]);

  useEffect(() => {
    setExpandedIds((current) => {
      const next = new Set(current);
      for (const id of collectionIds(collections)) next.add(id);
      return next;
    });
  }, [collections]);

  const activeItemId = visibleItems.find((item) => item.type === 'request' && item.rawId === activeRequestId)?.id;
  const tabStopId = focusedItemId || activeItemId || visibleItems[0]?.id;

  const focusItem = (id) => {
    const escapedId = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(id) : id.replace(/"/g, '\\"');
    setFocusedItemId(id);
    requestAnimationFrame(() => treeRef.current?.querySelector(`[data-tree-id="${escapedId}"]`)?.focus());
  };

  const toggleCollection = (id, expanded) => {
    setExpandedIds((current) => {
      const next = new Set(current);
      if (expanded) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const handleKeyDown = (event) => {
    const currentId = document.activeElement?.dataset?.treeId || tabStopId;
    const currentIndex = visibleItems.findIndex((item) => item.id === currentId);
    const current = visibleItems[currentIndex];
    if (!current) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusItem(visibleItems[Math.min(currentIndex + 1, visibleItems.length - 1)].id);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusItem(visibleItems[Math.max(currentIndex - 1, 0)].id);
    } else if (event.key === 'ArrowRight' && current.type === 'collection') {
      event.preventDefault();
      if (current.expandable && !current.expanded) toggleCollection(current.id, true);
      else if (visibleItems[currentIndex + 1]) focusItem(visibleItems[currentIndex + 1].id);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      if (current.type === 'collection' && current.expandable && current.expanded) toggleCollection(current.id, false);
      else if (current.parentId) focusItem(current.parentId);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (current.type === 'collection' && current.expandable) toggleCollection(current.id, !current.expanded);
      if (current.type === 'request') onSelectRequest?.(current.rawId);
    }
  };

  return (
    <aside className="sidebar">
      <div className="side-title">
        <span>COLLECTIONS</span>
        <IconButton label="Import cURL" onClick={onImportCurl}><Plus size={15} /></IconButton>
        <IconButton label="Collection actions"><MoreHorizontal size={15} /></IconButton>
      </div>
      <div className="filter"><Search size={14} /><input placeholder="Filter collections" /></div>
      {error && <div className="banner error"><AlertTriangle size={14} /> {error}</div>}
      {!error && <div className="banner"><AlertTriangle size={14} /> Data synced from local API</div>}
      <div role="tree" aria-label="Collections" className="tree" ref={treeRef} onKeyDown={handleKeyDown}>
        {loading && <div className="empty-state">Loading collections…</div>}
        {!loading && !error && collections.length === 0 && <div className="empty-state">No collections yet.</div>}
        {!loading && visibleItems.map((item) => (
          <TreeNode
            item={item}
            key={item.id}
            activeRequestId={activeRequestId}
            onSelectRequest={onSelectRequest}
            onToggleCollection={toggleCollection}
            tabIndex={item.id === tabStopId ? 0 : -1}
            onFocus={() => setFocusedItemId(item.id)}
          />
        ))}
      </div>
    </aside>
  );
}
