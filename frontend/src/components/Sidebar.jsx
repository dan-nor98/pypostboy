import React, {useEffect, useMemo, useRef, useState} from 'react';
import {AlertTriangle, MoreHorizontal, Plus, Search} from 'lucide-react';
import {IconButton} from './IconButton';
import {TreeNode} from './TreeNode';

const COLLECTION_EXPANSION_STORAGE_KEY = 'pypostboy.collections.expandedIds';
const DEFAULT_COLLECTIONS_EXPANDED = true;

function storageAvailable() {
  return typeof localStorage !== 'undefined';
}

function readStoredExpandedIds() {
  if (!storageAvailable()) return null;

  try {
    const stored = JSON.parse(localStorage.getItem(COLLECTION_EXPANSION_STORAGE_KEY));
    return Array.isArray(stored) ? new Set(stored.filter((id) => typeof id === 'string')) : null;
  } catch {
    return null;
  }
}

function writeStoredExpandedIds(expandedIds) {
  if (!storageAvailable()) return;
  localStorage.setItem(COLLECTION_EXPANSION_STORAGE_KEY, JSON.stringify([...expandedIds]));
}

function collectVisibleItems(nodes, expandedIds, depth = 0, parentId = null) {
  return nodes.flatMap((node) => {
    const nodeId = `collection-${node.id}`;
    const requests = node.requests || [];
    const children = node.children || [];
    const expanded = expandedIds.has(nodeId);
    const item = {type: 'collection', id: nodeId, rawId: node.id, node, depth, parentId, parentRawId: parentId?.replace('collection-', '') || null, expandable: true, expanded};

    if (!expanded) return [item];

    const childItems = [
      ...requests.map((request) => ({type: 'request', id: `request-${request.id}`, rawId: request.id, request, depth: depth + 1, parentId: nodeId, parentRawId: node.id})),
      ...collectVisibleItems(children, expandedIds, depth + 1, nodeId),
    ];

    return [
      item,
      ...(childItems.length > 0 ? childItems : [{type: 'empty', id: `empty-${node.id}`, depth: depth + 1, parentId: nodeId, parentRawId: node.id}]),
    ];
  });
}


function collectionIds(nodes) {
  return nodes.flatMap((node) => [`collection-${node.id}`, ...collectionIds(node.children || [])]);
}

export const MAX_COLLECTION_NESTING_DEPTH = Infinity;

function flattenCollectionOptions(nodes, depth = 0) {
  return nodes.flatMap((node) => [
    {id: node.id, name: `${'— '.repeat(depth)}${node.name}`, depth},
    ...flattenCollectionOptions(node.children || [], depth + 1),
  ]);
}

function normalizeFilter(value) {
  return value.trim().toLowerCase();
}

function requestMatchesFilter(request, normalizedFilter) {
  return [request.name, request.method].some((value) => String(value || '').toLowerCase().includes(normalizedFilter));
}

function collectionMatchesFilter(collection, normalizedFilter) {
  return String(collection.name || '').toLowerCase().includes(normalizedFilter);
}

function filterCollections(collections, filterValue) {
  const normalizedFilter = normalizeFilter(filterValue);
  if (!normalizedFilter) return collections;

  return collections.flatMap((collection) => {
    const matchingRequests = (collection.requests || []).filter((request) => requestMatchesFilter(request, normalizedFilter));
    const matchingChildren = filterCollections(collection.children || [], filterValue);
    const matched = collectionMatchesFilter(collection, normalizedFilter);

    if (!matched && matchingRequests.length === 0 && matchingChildren.length === 0) return [];

    return [{
      ...collection,
      requests: matched ? [...(collection.requests || [])] : matchingRequests,
      children: matchingChildren,
      filterMatched: matched,
      filterValue,
    }];
  });
}

export function Sidebar({collections = [], loading = false, error = '', activeRequestId, onSelectRequest, onImportCurl, onImportPostman, onMoveCollection, onMoveRequest, onCreateCollection, onCreateRequest, onRenameCollection, onDuplicateCollection, onDeleteCollection, onDuplicateRequest, onDeleteRequest, onMoveRequestToCollection, onExportCollection, onCopyRequestCurl}) {
  const treeRef = useRef(null);
  const initialExpandedIdsRef = useRef(readStoredExpandedIds());
  const knownCollectionIdsRef = useRef(null);
  const restoringStoredExpansionRef = useRef(Boolean(initialExpandedIdsRef.current));
  const [expandedIds, setExpandedIds] = useState(() => initialExpandedIdsRef.current || new Set());
  const [focusedItemId, setFocusedItemId] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [formValue, setFormValue] = useState('');
  const [targetCollectionId, setTargetCollectionId] = useState('');
  const [filterValue, setFilterValue] = useState('');
  const [validationError, setValidationError] = useState('');

  const normalizedFilter = normalizeFilter(filterValue);
  const filteredCollections = useMemo(() => filterCollections(collections, filterValue), [collections, filterValue]);
  const visibleExpandedIds = useMemo(() => (normalizedFilter ? new Set(collectionIds(filteredCollections)) : expandedIds), [expandedIds, filteredCollections, normalizedFilter]);
  const visibleItems = useMemo(() => collectVisibleItems(filteredCollections, visibleExpandedIds), [filteredCollections, visibleExpandedIds]);
  const collectionOptions = useMemo(() => flattenCollectionOptions(collections), [collections]);

  useEffect(() => {
    const nextCollectionIds = collectionIds(collections);
    if (restoringStoredExpansionRef.current) {
      if (nextCollectionIds.length === 0) return;
      knownCollectionIdsRef.current = new Set(nextCollectionIds);
      restoringStoredExpansionRef.current = false;
      return;
    }

    const knownCollectionIds = knownCollectionIdsRef.current;
    knownCollectionIdsRef.current = new Set(nextCollectionIds);

    if (!DEFAULT_COLLECTIONS_EXPANDED) return;

    setExpandedIds((current) => {
      const next = new Set(current);
      const idsToExpand = knownCollectionIds === null
        ? nextCollectionIds
        : nextCollectionIds.filter((id) => !knownCollectionIds.has(id));
      for (const id of idsToExpand) next.add(id);
      return next;
    });
  }, [collections]);


  const openDialog = (nextDialog) => {
    setDialog(nextDialog);
    setFormValue(nextDialog.defaultValue || '');
    setTargetCollectionId(nextDialog.collectionId || collectionOptions[0]?.id || '');
    setValidationError('');
  };

  const closeDialog = () => {
    setDialog(null);
    setValidationError('');
  };

  const submitDialog = async (event) => {
    event.preventDefault();
    if (!dialog) return;
    if (dialog.kind !== 'confirm' && dialog.kind !== 'move' && dialog.kind !== 'menu' && !formValue.trim()) {
      setValidationError(`${dialog.label || 'Name'} is required.`);
      return;
    }
    const value = formValue.trim();
    const targetId = targetCollectionId;
    closeDialog();
    if (dialog.action === 'createCollection') onCreateCollection?.({name: value});
    if (dialog.action === 'createFolder') onCreateCollection?.({name: value, parent_id: dialog.collection.id});
    if (dialog.action === 'createRequest') onCreateRequest?.({collection_id: dialog.collectionId || targetId, name: value});
    if (dialog.action === 'renameCollection') onRenameCollection?.(dialog.collection.id, {name: value});
    if (dialog.action === 'duplicateCollection') onDuplicateCollection?.(dialog.collection.id);
    if (dialog.action === 'exportCollection') onExportCollection?.(dialog.collection.id);
    if (dialog.action === 'deleteCollection') onDeleteCollection?.(dialog.collection.id);
    if (dialog.action === 'duplicateRequest') onDuplicateRequest?.(dialog.request.id);
    if (dialog.action === 'copyRequestCurl') onCopyRequestCurl?.(dialog.request.id);
    if (dialog.action === 'deleteRequest') onDeleteRequest?.(dialog.request.id);
    if (dialog.action === 'moveRequest') onMoveRequestToCollection?.(dialog.request.id, targetId);
  };

  const openCollectionActions = (collection) => openDialog({kind: 'menu', title: `Actions for ${collection.name}`, collection});
  const openRequestActions = (request, collectionId) => openDialog({kind: 'menu', title: `Actions for ${request.name}`, request, collectionId});

  const focusableItems = visibleItems.filter((item) => item.type !== 'empty');
  const activeItemId = focusableItems.find((item) => item.type === 'request' && item.rawId === activeRequestId)?.id;
  const tabStopId = focusedItemId || activeItemId || focusableItems[0]?.id;

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
      writeStoredExpandedIds(next);
      return next;
    });
  };

  const handleKeyDown = (event) => {
    const currentId = document.activeElement?.dataset?.treeId || tabStopId;
    const currentIndex = focusableItems.findIndex((item) => item.id === currentId);
    const current = focusableItems[currentIndex];
    if (!current) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      focusItem(focusableItems[Math.min(currentIndex + 1, focusableItems.length - 1)].id);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      focusItem(focusableItems[Math.max(currentIndex - 1, 0)].id);
    } else if (event.key === 'ArrowRight' && current.type === 'collection') {
      event.preventDefault();
      if (current.expandable && !current.expanded) toggleCollection(current.id, true);
      else if (focusableItems[currentIndex + 1]) focusItem(focusableItems[currentIndex + 1].id);
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
        <IconButton label="Import Postman collection" onClick={onImportPostman}><Plus size={15} /></IconButton>
        <IconButton label="Create collection" onClick={() => openDialog({action: 'createCollection', title: 'Create collection', label: 'Collection name'})}><Plus size={15} /></IconButton>
        <IconButton label="Create request" onClick={() => openDialog({action: 'createRequest', kind: 'createRequest', title: 'Create request', label: 'Request name'})}><MoreHorizontal size={15} /></IconButton>
      </div>
      <div className="filter"><Search size={14} /><input placeholder="Filter collections" value={filterValue} onChange={(event) => setFilterValue(event.target.value)} /></div>
      {error && <div className="banner error"><AlertTriangle size={14} /> {error}</div>}
      {!error && <div className="banner"><AlertTriangle size={14} /> Data synced from local API</div>}
      <div role="tree" aria-label="Collections" className="tree" ref={treeRef} onKeyDown={handleKeyDown}>
        {loading && <div className="empty-state">Loading collections…</div>}
        {!loading && !error && collections.length === 0 && <div className="empty-state">No collections yet.</div>}
        {!loading && !error && normalizedFilter && visibleItems.length === 0 && <div className="empty-state">No matching collections or requests.</div>}
        {!loading && visibleItems.map((item) => (
          <TreeNode
            item={item}
            key={item.id}
            activeRequestId={activeRequestId}
            onSelectRequest={onSelectRequest}
            onToggleCollection={toggleCollection}
            tabIndex={item.id === tabStopId ? 0 : -1}
            onFocus={() => setFocusedItemId(item.id)}
            onMoveCollection={onMoveCollection}
            onMoveRequest={onMoveRequest}
            onCollectionActions={openCollectionActions}
            onRequestActions={openRequestActions}
            filterValue={filterValue}
          />
        ))}
      </div>
      {dialog && (
        <div className="modal-backdrop" onClick={closeDialog}>
          <dialog open className="import-dialog" aria-modal="true" aria-label={dialog.title} onClick={(event) => event.stopPropagation()}>
            <form onSubmit={submitDialog}>
              <div className="section-head"><span>{dialog.title}</span><button type="button" onClick={closeDialog}>Close</button></div>
              {dialog.kind === 'menu' && dialog.collection && (
                <div className="action-list">
                  <button type="button" onClick={() => openDialog({action: 'createRequest', title: `Create request in ${dialog.collection.name}`, label: 'Request name', collectionId: dialog.collection.id})}>Create request</button>
                  <button type="button" onClick={() => openDialog({action: 'createFolder', title: `Create folder in ${dialog.collection.name}`, label: 'Folder name', collection: dialog.collection})}>Create folder</button>
                  <button type="button" onClick={() => openDialog({action: 'renameCollection', title: `Rename ${dialog.collection.name}`, label: 'Collection name', defaultValue: dialog.collection.name, collection: dialog.collection})}>Rename collection</button>
                  <button type="button" onClick={() => openDialog({action: 'duplicateCollection', kind: 'confirm', title: `Duplicate ${dialog.collection.name}?`, collection: dialog.collection})}>Duplicate collection</button>
                  <button type="button" onClick={() => openDialog({action: 'exportCollection', kind: 'confirm', title: `Export ${dialog.collection.name}?`, collection: dialog.collection})}>Export collection</button>
                  <button type="button" onClick={() => openDialog({action: 'deleteCollection', kind: 'confirm', title: `Delete ${dialog.collection.name}?`, collection: dialog.collection})}>Delete collection</button>
                </div>
              )}
              {dialog.kind === 'menu' && dialog.request && (
                <div className="action-list">
                  <button type="button" onClick={() => openDialog({action: 'duplicateRequest', kind: 'confirm', title: `Duplicate ${dialog.request.name}?`, request: dialog.request})}>Duplicate request</button>
                  <button type="button" onClick={() => openDialog({action: 'moveRequest', kind: 'move', title: `Move ${dialog.request.name}`, request: dialog.request, collectionId: dialog.collectionId})}>Move request</button>
                  <button type="button" onClick={() => openDialog({action: 'copyRequestCurl', kind: 'confirm', title: `Copy ${dialog.request.name} as cURL?`, request: dialog.request})}>Copy as cURL</button>
                  <button type="button" onClick={() => openDialog({action: 'deleteRequest', kind: 'confirm', title: `Delete ${dialog.request.name}?`, request: dialog.request})}>Delete request</button>
                </div>
              )}
              {dialog.action === 'createFolder' && (
                <>
                  <p className="hint">Destination: {dialog.collection.name}</p>
                  <p className="hint">Folder nesting: {Number.isFinite(MAX_COLLECTION_NESTING_DEPTH) ? `${MAX_COLLECTION_NESTING_DEPTH} levels maximum` : 'Unlimited'}</p>
                </>
              )}
              {dialog.kind !== 'menu' && dialog.kind !== 'confirm' && dialog.kind !== 'move' && (
                <label className="field-stack"><span>{dialog.label}</span><input aria-label={dialog.label} value={formValue} onChange={(event) => { setFormValue(event.target.value); if (validationError) setValidationError(''); }} autoFocus /></label>
              )}
              {validationError && <p role="alert" className="error">{validationError}</p>}
              {dialog.action === 'createRequest' && !dialog.collectionId && (
                <label className="field-stack"><span>Destination collection</span><select value={targetCollectionId} onChange={(event) => setTargetCollectionId(event.target.value)}>{collectionOptions.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label>
              )}
              {dialog.kind === 'move' && (
                <label className="field-stack"><span>Destination collection</span><select value={targetCollectionId} onChange={(event) => setTargetCollectionId(event.target.value)}>{collectionOptions.map((collection) => <option key={collection.id} value={collection.id}>{collection.name}</option>)}</select></label>
              )}
              {dialog.kind === 'confirm' && <p role="alert">This action changes your collection data. Confirm to continue.</p>}
              {dialog.kind !== 'menu' && <button className="button button-primary" type="submit">{dialog.kind === 'confirm' ? 'Confirm' : 'Save'}</button>}
            </form>
          </dialog>
        </div>
      )}
    </aside>
  );
}
