import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ChevronDown, Search, Settings} from 'lucide-react';
import {
  ActivityBar,
  Button,
  CodeEditor,
  CommandPalette,
  EditableGrid,
  EnvironmentPanel,
  IconButton,
  ImportCurlDialog,
  ImportPostmanDialog,
  RequestTabs,
  requestPanelId,
  requestTabId,
  RequestToolbar,
  ResponseViewer,
  Sidebar,
  SnapshotsPanel,
  StatusBar,
} from './components';
import {apiClient} from './api/client';
import {defaultEnvironments, environmentVariables, findVariableTokens, resolveRequestVariables} from './environment';
import './styles.css';


const PANEL_SPLIT_STORAGE_KEY = 'pypostboy.responsePaneRatio';
const DEFAULT_RESPONSE_PANE_RATIO = 40;
const MIN_RESPONSE_PANE_RATIO = 25;
const MAX_RESPONSE_PANE_RATIO = 75;
const PANEL_SPLIT_KEYBOARD_STEP = 5;

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function readStoredNumber(key, fallback, min, max) {
  const stored = Number(localStorage.getItem(key));
  return Number.isFinite(stored) ? clampNumber(stored, min, max) : fallback;
}

const defaultRequest = {
  method: 'GET',
  url: '',
  name: 'Untitled Request',
  headers: [],
  body_content: '',
  body_raw_type: 'application/json',
};


function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function safeFilename(name) {
  return `${String(name || 'collection').trim().replace(/[^a-z0-9_-]+/gi, '-').replace(/^-|-$/g, '').toLowerCase() || 'collection'}.postman_collection.json`;
}

function flattenRequests(collections) {
  return collections.flatMap((collection) => [
    ...(collection.requests || []),
    ...flattenRequests(collection.children || []),
  ]);
}

function updateRequestInCollections(collections, requestId, nextRequest) {
  return collections.map((collection) => ({
    ...collection,
    requests: (collection.requests || []).map((request) => (request.id === requestId ? {...request, ...nextRequest} : request)),
    children: updateRequestInCollections(collection.children || [], requestId, nextRequest),
  }));
}

function moveItemInArray(items, itemId, direction) {
  const index = items.findIndex((item) => item.id === itemId);
  if (index === -1) return items;
  const nextIndex = direction === 'up' ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= items.length) return items;
  const next = [...items];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

function reorderCollectionSiblings(collections, parentId, collectionId, direction) {
  if (!parentId) return moveItemInArray(collections, collectionId, direction);

  return collections.map((collection) => {
    if (collection.id === parentId) {
      return {...collection, children: moveItemInArray(collection.children || [], collectionId, direction)};
    }

    return {...collection, children: reorderCollectionSiblings(collection.children || [], parentId, collectionId, direction)};
  });
}

function reorderRequestsInCollection(collections, collectionId, requestId, direction) {
  return collections.map((collection) => {
    if (collection.id === collectionId) {
      return {...collection, requests: moveItemInArray(collection.requests || [], requestId, direction)};
    }

    return {...collection, children: reorderRequestsInCollection(collection.children || [], collectionId, requestId, direction)};
  });
}

function collectionSiblingIds(collections, parentId) {
  const siblings = parentId ? findCollectionById(collections, parentId)?.children || [] : collections;
  return siblings.map((collection) => collection.id);
}

function requestSiblingIds(collections, collectionId) {
  return (findCollectionById(collections, collectionId)?.requests || []).map((request) => request.id);
}

function findCollectionById(collections, collectionId) {
  for (const collection of collections) {
    if (collection.id === collectionId) return collection;
    const childMatch = findCollectionById(collection.children || [], collectionId);
    if (childMatch) return childMatch;
  }
  return null;
}

function firstRequestInCollection(collection) {
  if (!collection) return null;
  if (collection.requests?.[0]) return collection.requests[0];
  for (const child of collection.children || []) {
    const request = firstRequestInCollection(child);
    if (request) return request;
  }
  return null;
}
function rowArrayToObject(row = []) {
  if (Array.isArray(row)) {
    return {
      enabled: row[0] !== false && row[0] !== '',
      key: row[1] || '',
      value: row[2] || '',
      description: row[3] || '',
    };
  }
  return {
    enabled: row.enabled !== false,
    key: row.key || '',
    value: row.value || '',
    description: row.description || '',
  };
}

function objectToGridRow(row = {}) {
  return [row.enabled === false ? '' : '✓', row.key || '', row.value || '', row.description || ''];
}

function parseQueryParams(url) {
  if (!url) return [];
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return [];
  const hashStart = url.indexOf('#', queryStart);
  const query = url.slice(queryStart + 1, hashStart === -1 ? undefined : hashStart);
  if (!query) return [];
  return [...new URLSearchParams(query).entries()].map(([key, value]) => objectToGridRow({enabled: true, key, value}));
}

function updateUrlQueryParams(url, rows) {
  const enabledRows = rows.map(rowArrayToObject).filter((row) => row.enabled !== false && row.key);
  const urlText = String(url || '');
  const hashIndex = urlText.indexOf('#');
  const withoutHash = hashIndex === -1 ? urlText : urlText.slice(0, hashIndex);
  const hash = hashIndex === -1 ? '' : urlText.slice(hashIndex);
  const base = withoutHash.split('?')[0];
  const search = new URLSearchParams();
  enabledRows.forEach((row) => search.append(row.key, row.value));
  const query = search.toString();
  return `${base}${query ? `?${query}` : ''}${hash}`;
}

function headersToGridRows(headers = []) {
  return headers.map((header) => objectToGridRow(rowArrayToObject(header)));
}

function gridRowsToHeaders(rows = []) {
  return rows.map(rowArrayToObject).filter((row) => row.key).map((row) => ({
    enabled: row.enabled !== false,
    key: row.key,
    value: row.value,
    description: row.description || '',
  }));
}

function headersArrayToObject(headers = []) {
  return headers.reduce((result, header) => {
    if (Array.isArray(header)) {
      const [enabled, key, value] = header.length > 2 ? header : ['✓', header[0], header[1]];
      if (enabled && key) result[key] = value;
      return result;
    }
    if (header?.enabled !== false && header?.key) result[header.key] = header.value || '';
    return result;
  }, {});
}


function AuthPanel({mode, onModeChange, onAuthenticated, onClose}) {
  const [form, setForm] = useState({username: '', email: '', password: '', recovery_key: '', new_password: ''});
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const updateField = (field, value) => setForm((current) => ({...current, [field]: value}));

  const submitAuth = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      await apiClient.getCsrf?.();
      if (mode === 'login') {
        const user = await apiClient.login({username: form.username, password: form.password});
        onAuthenticated(user);
        return;
      }
      if (mode === 'signup') {
        const registration = await apiClient.register({username: form.username, email: form.email || undefined, password: form.password});
        onAuthenticated(registration.user, {keepOpen: true});
        setMessage(`Account created. Save this recovery key now: ${registration.recovery_key}`);
        return;
      }
      const payload = {
        username: form.username || undefined,
        email: form.email || undefined,
        recovery_key: form.recovery_key,
        new_password: form.new_password,
      };
      const reset = await apiClient.recoverReset(payload);
      setMessage(`Password reset. Save your new recovery key: ${reset.recovery_key}`);
      onModeChange('login');
    } catch (submitError) {
      setError(submitError.message || 'Authentication request failed');
    } finally {
      setSubmitting(false);
    }
  };

  const isRecovery = mode === 'forgot';
  const title = mode === 'signup' ? 'Create your PostBoy account' : isRecovery ? 'Reset your password' : 'Welcome back';
  const subtitle = mode === 'signup'
    ? 'Secure your local workspace and keep requests scoped to your account.'
    : isRecovery
      ? 'Use your saved recovery key to rotate your password and recovery key.'
      : 'Sign in to continue working with your local API collections.';

  return (
    <section className="auth-card" aria-labelledby="auth-title">
      <div className="auth-brand-mark">PB</div>
      <p className="auth-eyebrow">Local-first API client</p>
      <h1 id="auth-title">{title}</h1>
      <p className="auth-subtitle">{subtitle}</p>
      <form className="auth-form" onSubmit={submitAuth}>
        <label>
          <span>Username</span>
          <input value={form.username} onChange={(event) => updateField('username', event.target.value)} placeholder="workspace-user" autoComplete="username" />
        </label>
        {(mode === 'signup' || isRecovery) && (
          <label>
            <span>Email {isRecovery ? 'or username above' : '(optional)'}</span>
            <input type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} placeholder="you@example.com" autoComplete="email" />
          </label>
        )}
        {!isRecovery && (
          <label>
            <span>Password</span>
            <input type="password" value={form.password} onChange={(event) => updateField('password', event.target.value)} placeholder="At least 8 characters" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} required />
          </label>
        )}
        {isRecovery && (
          <>
            <label>
              <span>Recovery key</span>
              <input value={form.recovery_key} onChange={(event) => updateField('recovery_key', event.target.value)} placeholder="Paste your saved recovery key" required />
            </label>
            <label>
              <span>New password</span>
              <input type="password" value={form.new_password} onChange={(event) => updateField('new_password', event.target.value)} placeholder="At least 8 characters" autoComplete="new-password" required />
            </label>
          </>
        )}
        {error && <div className="auth-alert auth-alert-error" role="alert">{error}</div>}
        {message && <div className="auth-alert auth-alert-success" role="status">{message}</div>}
        {message && mode === 'signup' && <Button kind="secondary" type="button" onClick={onClose}>Continue to workspace</Button>}
        <Button kind="primary" type="submit" disabled={submitting}>{submitting ? 'Working…' : isRecovery ? 'Reset password' : mode === 'signup' ? 'Create account' : 'Sign in'}</Button>
      </form>
      <div className="auth-switcher">
        {mode !== 'login' && <button type="button" onClick={() => onModeChange('login')}>Back to login</button>}
        {mode !== 'signup' && <button type="button" onClick={() => onModeChange('signup')}>Create account</button>}
        {mode !== 'forgot' && <button type="button" onClick={() => onModeChange('forgot')}>Forgot password?</button>}
      </div>
    </section>
  );
}

export function App() {
  const [palette, setPalette] = useState(false);
  const [importCurlOpen, setImportCurlOpen] = useState(false);
  const [importPostmanOpen, setImportPostmanOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [sending, setSending] = useState(false);
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionsError, setCollectionsError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authOpen, setAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [proxyResult, setProxyResult] = useState(null);
  const [proxyError, setProxyError] = useState('');
  const [draftBodies, setDraftBodies] = useState({});
  const [requestDrafts, setRequestDrafts] = useState({});
  const [savingRequest, setSavingRequest] = useState(false);
  const [snapshots, setSnapshots] = useState([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState('');
  const [savingSnapshot, setSavingSnapshot] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState('params');
  const [activeSidePanel, setActiveSidePanel] = useState('collections');
  const [responsePaneRatio, setResponsePaneRatio] = useState(() => readStoredNumber(PANEL_SPLIT_STORAGE_KEY, DEFAULT_RESPONSE_PANE_RATIO, MIN_RESPONSE_PANE_RATIO, MAX_RESPONSE_PANE_RATIO));
  const [environments, setEnvironments] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pypostboy.environments')) || defaultEnvironments; } catch { return defaultEnvironments; }
  });
  const [activeEnvironmentId, setActiveEnvironmentId] = useState(() => localStorage.getItem('pypostboy.activeEnvironment') || defaultEnvironments[0].id);
  const [environmentWarnings, setEnvironmentWarnings] = useState([]);
  const mainPanelRef = useRef(null);
  const configTabRefs = useRef({});
  const paletteTriggerRef = useRef(null);
  const activeEnvironment = environments.find((environment) => environment.id === activeEnvironmentId) || environments[0] || defaultEnvironments[0];

  useEffect(() => { localStorage.setItem('pypostboy.environments', JSON.stringify(environments)); }, [environments]);
  useEffect(() => { localStorage.setItem(PANEL_SPLIT_STORAGE_KEY, String(responsePaneRatio)); }, [responsePaneRatio]);
  useEffect(() => { localStorage.setItem('pypostboy.activeEnvironment', activeEnvironmentId); }, [activeEnvironmentId]);

  useEffect(() => {
    let cancelled = false;
    async function loadCurrentUser() {
      if (!apiClient.currentUser) return;
      try {
        await apiClient.getCsrf?.();
        const user = await apiClient.currentUser();
        if (!cancelled) setCurrentUser(user);
      } catch {
        if (!cancelled) setAuthOpen(true);
      }
    }
    loadCurrentUser();
    return () => { cancelled = true; };
  }, []);


  const updateResponsePaneRatio = useCallback((nextRatio) => {
    setResponsePaneRatio(clampNumber(Math.round(nextRatio), MIN_RESPONSE_PANE_RATIO, MAX_RESPONSE_PANE_RATIO));
  }, []);

  const resizeResponsePaneFromClientY = useCallback((clientY) => {
    const bounds = mainPanelRef.current?.getBoundingClientRect();
    if (!bounds?.height) return;
    const dividerOffset = clientY - bounds.top;
    const nextResponseRatio = ((bounds.height - dividerOffset) / bounds.height) * 100;
    updateResponsePaneRatio(nextResponseRatio);
  }, [updateResponsePaneRatio]);

  const handleMainDividerPointerDown = useCallback((event) => {
    event.preventDefault();
    resizeResponsePaneFromClientY(event.clientY);
    const handlePointerMove = (moveEvent) => resizeResponsePaneFromClientY(moveEvent.clientY);
    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  }, [resizeResponsePaneFromClientY]);

  const handleMainDividerKeyDown = useCallback((event) => {
    const keySteps = {ArrowUp: -PANEL_SPLIT_KEYBOARD_STEP, ArrowDown: PANEL_SPLIT_KEYBOARD_STEP, Home: MIN_RESPONSE_PANE_RATIO - responsePaneRatio, End: MAX_RESPONSE_PANE_RATIO - responsePaneRatio};
    if (!(event.key in keySteps)) return;
    event.preventDefault();
    updateResponsePaneRatio(responsePaneRatio + keySteps[event.key]);
  }, [responsePaneRatio, updateResponsePaneRatio]);

  const updateEnvironment = useCallback((nextEnvironment) => {
    setEnvironments((current) => current.map((environment) => (environment.id === nextEnvironment.id ? nextEnvironment : environment)));
  }, []);

  const refreshCollections = useCallback(async (preferredRequestId = null) => {
    setCollectionsLoading(true);
    setCollectionsError('');
    try {
      const data = await apiClient.listCollections();
      setCollections(data);
      const nextRequestId = preferredRequestId || activeRequestId || flattenRequests(data)[0]?.id || null;
      setActiveRequestId(nextRequestId);
      return data;
    } catch (error) {
      setCollectionsError(error.message);
      return null;
    } finally {
      setCollectionsLoading(false);
    }
  }, [activeRequestId]);

  const handleAuthenticated = useCallback((user, options = {}) => {
    setCurrentUser(user);
    if (!options.keepOpen) setAuthOpen(false);
    refreshCollections();
  }, [refreshCollections]);

  const handleLogout = useCallback(async () => {
    try {
      await apiClient.logout?.();
      const user = await apiClient.currentUser?.();
      setCurrentUser(user || null);
    } catch {
      setCurrentUser(null);
      setAuthOpen(true);
    }
  }, []);

  const handleImportedRequestCreated = useCallback(async (createdRequest) => {
    await refreshCollections(createdRequest?.id || null);
  }, [refreshCollections]);

  const moveCollection = useCallback(async (collectionId, direction, parentId = null) => {
    const previousCollections = collections;
    const previousIds = collectionSiblingIds(collections, parentId);
    const nextCollections = reorderCollectionSiblings(collections, parentId, collectionId, direction);
    const nextIds = collectionSiblingIds(nextCollections, parentId);
    if (previousIds.join('\0') === nextIds.join('\0')) return;

    setCollections(nextCollections);
    try {
      await apiClient.reorderCollections({parent_id: parentId, ordered_ids: nextIds});
    } catch (error) {
      setCollections(previousCollections);
      setCollectionsError(error.message);
    }
  }, [collections]);

  const moveRequest = useCallback(async (requestId, direction, collectionId) => {
    if (!collectionId) return;
    const previousCollections = collections;
    const previousIds = requestSiblingIds(collections, collectionId);
    const nextCollections = reorderRequestsInCollection(collections, collectionId, requestId, direction);
    const nextIds = requestSiblingIds(nextCollections, collectionId);
    if (previousIds.join('\0') === nextIds.join('\0')) return;

    setCollections(nextCollections);
    try {
      await apiClient.reorderRequests({collection_id: collectionId, ordered_ids: nextIds});
    } catch (error) {
      setCollections(previousCollections);
      setCollectionsError(error.message);
    }
  }, [collections]);


  const runCollectionMutation = useCallback(async (mutation, preferredRequestId = undefined) => {
    setCollectionsError('');
    try {
      const result = await mutation();
      await refreshCollections(preferredRequestId === undefined ? result?.id || null : preferredRequestId);
      return result;
    } catch (error) {
      setCollectionsError(error.message);
      return null;
    }
  }, [refreshCollections]);

  const createCollection = useCallback((data) => runCollectionMutation(() => apiClient.createCollection(data), null), [runCollectionMutation]);
  const renameCollection = useCallback((collectionId, data) => runCollectionMutation(() => apiClient.updateCollection(collectionId, data), null), [runCollectionMutation]);
  const duplicateCollection = useCallback((collectionId) => runCollectionMutation(() => apiClient.duplicateCollection(collectionId), null), [runCollectionMutation]);
  const deleteCollection = useCallback((collectionId) => runCollectionMutation(() => apiClient.deleteCollection(collectionId), null), [runCollectionMutation]);
  const createSidebarRequest = useCallback((data) => runCollectionMutation(() => apiClient.createRequest({method: 'GET', url: '', headers: [], body_content: '', body_raw_type: 'application/json', ...data}), null), [runCollectionMutation]);
  const duplicateSidebarRequest = useCallback((requestId) => runCollectionMutation(() => apiClient.duplicateRequest(requestId)), [runCollectionMutation]);
  const deleteSidebarRequest = useCallback((requestId) => runCollectionMutation(() => apiClient.deleteRequest(requestId)), [runCollectionMutation]);
  const moveSidebarRequest = useCallback((requestId, collectionId) => runCollectionMutation(() => apiClient.moveRequest(requestId, collectionId), requestId), [runCollectionMutation]);

  const exportSidebarCollection = useCallback(async (collectionId) => {
    setCollectionsError('');
    try {
      const exportedCollection = await apiClient.exportCollection(collectionId);
      downloadJson(safeFilename(exportedCollection?.info?.name), exportedCollection);
    } catch (error) {
      setCollectionsError(error.message);
    }
  }, []);

  const copyRequestCurl = useCallback(async (requestId) => {
    setCollectionsError('');
    try {
      const exportedRequest = await apiClient.exportRequestCurl(requestId);
      await navigator.clipboard.writeText(exportedRequest.curl);
    } catch (error) {
      setCollectionsError(error.message);
    }
  }, []);

  const handlePostmanImported = useCallback(async (importedCollection) => {
    const refreshedCollections = await refreshCollections();
    const refreshedCollection = findCollectionById(refreshedCollections || [], importedCollection?.id);
    const importedRequest = firstRequestInCollection(refreshedCollection || importedCollection);
    if (importedRequest?.id) setActiveRequestId(importedRequest.id);
  }, [refreshCollections]);

  const closePalette = useCallback(() => {
    setPalette(false);
    requestAnimationFrame(() => paletteTriggerRef.current?.focus());
  }, []);

  const openPalette = useCallback(() => {
    paletteTriggerRef.current = document.activeElement;
    setPalette(true);
  }, []);

  const togglePalette = useCallback(() => {
    if (palette) {
      closePalette();
    } else {
      openPalette();
    }
  }, [closePalette, openPalette, palette]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCollections() {
      setCollectionsLoading(true);
      setCollectionsError('');
      try {
        const data = await apiClient.listCollections();
        if (!cancelled) {
          setCollections(data);
          setActiveRequestId((current) => current || flattenRequests(data)[0]?.id || null);
        }
      } catch (error) {
        if (!cancelled) setCollectionsError(error.message);
      } finally {
        if (!cancelled) setCollectionsLoading(false);
      }
    }
    loadCollections();
    return () => { cancelled = true; };
  }, []);

  const requests = useMemo(() => flattenRequests(collections), [collections]);
  const activeRequest = requests.find((request) => request.id === activeRequestId) || requests[0] || defaultRequest;
  const activeRequestDraft = requestDrafts[activeRequest.id] || {};
  const editableRequest = {
    ...activeRequest,
    method: activeRequestDraft.method ?? activeRequest.method ?? 'GET',
    url: activeRequestDraft.url ?? activeRequest.url ?? '',
    headers: activeRequestDraft.headers ?? activeRequest.headers ?? [],
    body_raw_type: activeRequestDraft.body_raw_type ?? activeRequest.body_raw_type ?? 'application/json',
  };
  const requestBody = draftBodies[activeRequest.id] ?? activeRequest.body_content ?? activeRequest.body_raw ?? '';
  const unresolvedVariableHints = useMemo(() => {
    const variables = environmentVariables(activeEnvironment);
    const names = [
      ...findVariableTokens(editableRequest.url).map((token) => token.name),
      ...Object.entries(headersArrayToObject(editableRequest.headers)).flatMap(([key, value]) => [
        ...findVariableTokens(key).map((token) => token.name),
        ...findVariableTokens(value).map((token) => token.name),
      ]),
      ...findVariableTokens(requestBody).map((token) => token.name),
    ];
    return [...new Set(names.filter((name) => !Object.prototype.hasOwnProperty.call(variables, name) || variables[name] === ''))];
  }, [activeEnvironment, editableRequest.headers, editableRequest.url, requestBody]);
  const requestConfigTabs = useMemo(() => [
    {id: 'params', label: 'Params'},
    {id: 'authorization', label: 'Authorization'},
    {id: 'headers', label: 'Headers'},
    {id: 'body', label: 'Body'},
    {id: 'scripts', label: 'Scripts'},
    {id: 'tests', label: 'Tests'},
  ], []);

  const parameterRows = useMemo(() => parseQueryParams(editableRequest.url), [editableRequest.url]);
  const headerRows = useMemo(() => headersToGridRows(editableRequest.headers), [editableRequest.headers]);

  const handleParameterRowsChange = useCallback((nextRows) => {
    const url = updateUrlQueryParams(editableRequest.url, nextRows);
    setRequestDrafts((drafts) => ({
      ...drafts,
      [activeRequest.id]: {
        ...drafts[activeRequest.id],
        url,
      },
    }));
  }, [activeRequest.id, editableRequest.url]);

  const handleHeaderRowsChange = useCallback((nextRows) => {
    const headers = gridRowsToHeaders(nextRows);
    setRequestDrafts((drafts) => ({
      ...drafts,
      [activeRequest.id]: {
        ...drafts[activeRequest.id],
        headers,
      },
    }));
  }, [activeRequest.id]);

  const selectConfigTab = useCallback((tabId, shouldFocus = false) => {
    setActiveConfigTab(tabId);
    if (shouldFocus) {
      requestAnimationFrame(() => configTabRefs.current[tabId]?.focus());
    }
  }, []);

  const handleConfigTabKeyDown = useCallback((event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = requestConfigTabs.findIndex((tab) => tab.id === activeConfigTab);
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + offset + requestConfigTabs.length) % requestConfigTabs.length;
    selectConfigTab(requestConfigTabs[nextIndex].id, true);
  }, [activeConfigTab, requestConfigTabs, selectConfigTab]);

  const sendRequest = useCallback(async () => {
    if (!editableRequest.url) {
      setProxyError('Select a request with a URL before sending.');
      return;
    }

    setSending(true);
    setProxyError('');
    setProxyResult(null);
    try {
      const resolvedRequest = resolveRequestVariables({
        url: editableRequest.url,
        headers: headersArrayToObject(editableRequest.headers),
        body: requestBody,
      }, activeEnvironment);
      if (resolvedRequest.unresolved.length) {
        const message = `Unresolved environment variables: ${resolvedRequest.unresolved.join(', ')}`;
        setEnvironmentWarnings(resolvedRequest.unresolved);
        setProxyError(message);
        return;
      }
      setEnvironmentWarnings([]);
      const result = await apiClient.proxyRequest({
        method: editableRequest.method || 'GET',
        url: resolvedRequest.url,
        headers: resolvedRequest.headers,
        body: resolvedRequest.body,
        contentType: editableRequest.body_raw_type || 'application/json',
      });
      setProxyResult(result);
    } catch (error) {
      setProxyError(error.message);
    } finally {
      setSending(false);
    }
  }, [activeEnvironment, editableRequest, requestBody]);


  const updateRequestDraft = useCallback((field, value) => {
    setRequestDrafts((drafts) => ({
      ...drafts,
      [activeRequest.id]: {
        ...drafts[activeRequest.id],
        [field]: value,
      },
    }));
  }, [activeRequest.id]);

  const saveRequest = useCallback(async () => {
    if (!activeRequest.id || !editableRequest.url) return;

    setSavingRequest(true);
    setProxyError('');
    try {
      const payload = {
        ...activeRequest,
        method: editableRequest.method || 'GET',
        url: editableRequest.url,
        headers: editableRequest.headers,
        body_content: requestBody,
        body_raw_type: editableRequest.body_raw_type || 'application/json',
      };
      const savedRequest = await apiClient.updateRequest(activeRequest.id, payload);
      const nextRequest = savedRequest || payload;
      setCollections((currentCollections) => updateRequestInCollections(currentCollections, activeRequest.id, nextRequest));
      setRequestDrafts((drafts) => {
        const {[activeRequest.id]: _savedDraft, ...remainingDrafts} = drafts;
        return remainingDrafts;
      });
      setDraftBodies((drafts) => {
        const {[activeRequest.id]: _savedBody, ...remainingDrafts} = drafts;
        return remainingDrafts;
      });
    } catch (error) {
      setProxyError(error.message);
    } finally {
      setSavingRequest(false);
    }
  }, [activeRequest, editableRequest, requestBody]);


  useEffect(() => {
    if (!activeRequest.id) {
      setSnapshots([]);
      return undefined;
    }

    let cancelled = false;
    async function loadSnapshots() {
      setSnapshotsLoading(true);
      setSnapshotsError('');
      try {
        const data = await apiClient.listRequestInstances(activeRequest.id);
        if (!cancelled) setSnapshots(data);
      } catch (error) {
        if (!cancelled) setSnapshotsError(error.message);
      } finally {
        if (!cancelled) setSnapshotsLoading(false);
      }
    }
    loadSnapshots();
    return () => { cancelled = true; };
  }, [activeRequest.id]);

  const saveSnapshot = useCallback(async () => {
    if (!activeRequest.id) return;

    const optimisticId = `pending-${Date.now()}`;
    const payload = {
      name: `${activeRequest.name || 'Request'} snapshot`,
      method: editableRequest.method || 'GET',
      url: editableRequest.url || '',
      headers: editableRequest.headers || [],
      body_content: requestBody,
      body_raw_type: editableRequest.body_raw_type || 'application/json',
      response_status: proxyResult?.status,
      response_status_text: proxyResult?.statusText,
      response_headers: proxyResult?.headers || {},
      response_body: proxyResult?.body ?? '',
      response_time_ms: proxyResult?.time,
      response_size: proxyResult?.size,
    };

    setSavingSnapshot(true);
    setSnapshotsError('');
    setSnapshots((current) => [{...payload, id: optimisticId, optimistic: true}, ...current]);
    try {
      const createdSnapshot = await apiClient.createRequestInstance(activeRequest.id, payload);
      setSnapshots((current) => current.map((snapshot) => (snapshot.id === optimisticId ? createdSnapshot : snapshot)));
    } catch (error) {
      setSnapshots((current) => current.filter((snapshot) => snapshot.id !== optimisticId));
      setSnapshotsError(error.message);
    } finally {
      setSavingSnapshot(false);
    }
  }, [activeRequest.id, activeRequest.name, editableRequest, proxyResult, requestBody]);

  const restoreSnapshot = useCallback((snapshot) => {
    if (!activeRequest.id) return;
    setRequestDrafts((drafts) => ({
      ...drafts,
      [activeRequest.id]: {
        ...drafts[activeRequest.id],
        method: snapshot.method || 'GET',
        url: snapshot.url || '',
        headers: snapshot.headers || [],
        body_raw_type: snapshot.body_raw_type || 'application/json',
      },
    }));
    setDraftBodies((drafts) => ({...drafts, [activeRequest.id]: snapshot.body_content ?? snapshot.body_raw ?? ''}));
    selectConfigTab('body');
  }, [activeRequest.id, selectConfigTab]);

  const renameSnapshot = useCallback(async (instanceId, name) => {
    const previous = snapshots;
    setSnapshots((current) => current.map((snapshot) => (snapshot.id === instanceId ? {...snapshot, name} : snapshot)));
    try {
      const updatedSnapshot = await apiClient.updateRequestInstance(instanceId, {name});
      setSnapshots((current) => current.map((snapshot) => (snapshot.id === instanceId ? updatedSnapshot : snapshot)));
    } catch (error) {
      setSnapshots(previous);
      setSnapshotsError(error.message);
    }
  }, [snapshots]);

  const deleteSnapshot = useCallback(async (instanceId) => {
    const previous = snapshots;
    setSnapshots((current) => current.filter((snapshot) => snapshot.id !== instanceId));
    try {
      await apiClient.deleteRequestInstance(instanceId);
    } catch (error) {
      setSnapshots(previous);
      setSnapshotsError(error.message);
    }
  }, [snapshots]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    const handleKeyDown = (event) => {
      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key === 'Enter') {
        event.preventDefault();
        sendRequest();
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        togglePalette();
      }

      if (meta && event.key === ',') {
        event.preventDefault();
        toggleTheme();
      }
    };

    addEventListener('keydown', handleKeyDown);
    return () => removeEventListener('keydown', handleKeyDown);
  }, [sendRequest, togglePalette, toggleTheme]);


  return (
    <div className="app-shell">
      <header className="header">
        <strong className="brand">PostBoy</strong>
        <button className="selector">Workspace: Local API <ChevronDown size={13} /></button>
        <button className="selector" onClick={() => setActiveSidePanel('environments')}>Environment: {activeEnvironment.name} <ChevronDown size={13} /></button>
        <div className="global-search"><Search size={14} /><input placeholder="Search requests, URLs, headers (Ctrl+Shift+F)" /></div>
        <Button kind="ghost" onClick={openPalette}>Command Palette <kbd>Ctrl⇧P</kbd></Button>
        <Button kind="secondary" onClick={() => setAuthOpen(true)}>{currentUser?.is_guest === false ? currentUser.username : 'Sign in'}</Button>
        {currentUser?.is_guest === false && <Button kind="ghost" onClick={handleLogout}>Logout</Button>}
        <IconButton
          label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme Ctrl+,`}
          aria-pressed={theme === 'light'}
          onClick={toggleTheme}
        >
          <Settings size={16} />
        </IconButton>
      </header>

      <main className="workspace">
        <ActivityBar activePanel={activeSidePanel} onSelectPanel={setActiveSidePanel} />
        {activeSidePanel === 'environments' ? (
          <EnvironmentPanel
            environments={environments}
            activeEnvironmentId={activeEnvironment.id}
            onSelectEnvironment={setActiveEnvironmentId}
            onUpdateEnvironment={updateEnvironment}
          />
        ) : (
        <Sidebar
          collections={collections}
          loading={collectionsLoading}
          error={collectionsError}
          activeRequestId={activeRequest.id}
          onSelectRequest={setActiveRequestId}
          onImportCurl={() => setImportCurlOpen(true)}
          onImportPostman={() => setImportPostmanOpen(true)}
          onMoveCollection={moveCollection}
          onMoveRequest={moveRequest}
          onCreateCollection={createCollection}
          onCreateRequest={createSidebarRequest}
          onRenameCollection={renameCollection}
          onDuplicateCollection={duplicateCollection}
          onDeleteCollection={deleteCollection}
          onDuplicateRequest={duplicateSidebarRequest}
          onDeleteRequest={deleteSidebarRequest}
          onMoveRequestToCollection={moveSidebarRequest}
          onExportCollection={exportSidebarCollection}
          onCopyRequestCurl={copyRequestCurl}
        />
        )}
        <section
          className="main"
          ref={mainPanelRef}
          style={{gridTemplateRows: `34px minmax(240px, ${100 - responsePaneRatio}fr) 5px minmax(220px, ${responsePaneRatio}fr)`}}
        >
          <RequestTabs requests={requests} activeRequestId={activeRequest.id} onSelectRequest={setActiveRequestId} loading={collectionsLoading} error={collectionsError} />
          <div
            id={requestPanelId(activeRequest.id)}
            role="tabpanel"
            aria-labelledby={requestTabId(activeRequest.id)}
            className="request-panel"
          >
            <RequestToolbar
              sending={sending}
              onSend={sendRequest}
              request={editableRequest}
              disabled={!editableRequest.url}
              onMethodChange={(method) => updateRequestDraft('method', method)}
              onUrlChange={(url) => updateRequestDraft('url', url)}
              onSave={saveRequest}
              saving={savingRequest}
              saveDisabled={!activeRequest.id || !editableRequest.url}
            />
            {(environmentWarnings.length > 0 || unresolvedVariableHints.length > 0 || findVariableTokens(editableRequest.url).length > 0) && (
              <div className={(environmentWarnings.length || unresolvedVariableHints.length) ? "environment-warning" : "environment-hint"}>
                {(environmentWarnings.length || unresolvedVariableHints.length) ? `Unresolved variables: ${(environmentWarnings.length ? environmentWarnings : unresolvedVariableHints).join(', ')}` : `Environment variables detected for ${activeEnvironment.name}.`}
              </div>
            )}
            <div className="panel-tabs" role="tablist" aria-label="Request configuration tabs" onKeyDown={handleConfigTabKeyDown}>
              {requestConfigTabs.map((tab) => {
                const selected = activeConfigTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`request-config-tab-${tab.id}`}
                    ref={(element) => { configTabRefs.current[tab.id] = element; }}
                    role="tab"
                    type="button"
                    aria-selected={selected}
                    aria-controls={`request-config-panel-${tab.id}`}
                    tabIndex={selected ? 0 : -1}
                    className={selected ? 'active' : undefined}
                    onClick={() => selectConfigTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                );
              })}
              {collectionsError && <span className="inline-error">{collectionsError}</span>}
            </div>
            <div
              className="request-grid"
              id="request-config-panel-params"
              role="tabpanel"
              aria-labelledby="request-config-tab-params"
              hidden={activeConfigTab !== 'params'}
            >
              <section>
                <div className="section-head"><span>Query Parameters</span><button>Bulk Edit</button></div>
                {requests.length ? <EditableGrid rows={parameterRows} onChange={handleParameterRowsChange} type="parameter" /> : <div className="empty-state">No requests yet. Create or import a request to begin.</div>}
              </section>
              <aside className="inspector">
                <h3>Request</h3>
                <p className="mono variable">{activeRequest.name}</p>
                <p>{editableRequest.method} {editableRequest.url || 'No URL configured'}</p>
                <h3>Headers</h3>
                {(editableRequest.headers || []).length ? <p>{editableRequest.headers.length} configured headers</p> : <p className="hint">No headers configured.</p>}
                <SnapshotsPanel
                  snapshots={snapshots}
                  loading={snapshotsLoading}
                  error={snapshotsError}
                  saving={savingSnapshot}
                  onSave={saveSnapshot}
                  onRestore={restoreSnapshot}
                  onRename={renameSnapshot}
                  onDelete={deleteSnapshot}
                />
              </aside>
            </div>
            <div
              className="request-grid"
              id="request-config-panel-body"
              role="tabpanel"
              aria-labelledby="request-config-tab-body"
              hidden={activeConfigTab !== 'body'}
            >
              <section>
                <div className="section-head"><span>Request Body</span></div>
                <CodeEditor
                  value={requestBody}
                  onChange={(nextBody) => setDraftBodies((drafts) => ({...drafts, [activeRequest.id]: nextBody}))}
                  wordWrap
                  label="Request JSON body editor"
                />
              </section>
              <aside className="inspector">
                <h3>Body</h3>
                <p className="hint">Editing {activeRequest.body_raw_type || 'application/json'} content for this request.</p>
              </aside>
            </div>
            <div
              className="request-grid"
              id="request-config-panel-headers"
              role="tabpanel"
              aria-labelledby="request-config-tab-headers"
              hidden={activeConfigTab !== 'headers'}
            >
              <section>
                <div className="section-head"><span>Request Headers</span><button>Bulk Edit</button></div>
                {requests.length ? <EditableGrid rows={headerRows} onChange={handleHeaderRowsChange} type="header" /> : <div className="empty-state">No requests yet. Create or import a request to begin.</div>}
              </section>
              <aside className="inspector">
                <h3>Headers</h3>
                {headerRows.length ? <p>{headerRows.length} configured headers</p> : <p className="hint">No headers configured.</p>}
              </aside>
            </div>
            {requestConfigTabs
              .filter((tab) => !['params', 'body', 'headers'].includes(tab.id))
              .map((tab) => (
                <div
                  key={tab.id}
                  id={`request-config-panel-${tab.id}`}
                  role="tabpanel"
                  aria-labelledby={`request-config-tab-${tab.id}`}
                  hidden={activeConfigTab !== tab.id}
                />
              ))}
          </div>
          <div
            className="divider"
            role="separator"
            aria-label="Resize request and response panels"
            aria-orientation="horizontal"
            aria-valuemin={MIN_RESPONSE_PANE_RATIO}
            aria-valuemax={MAX_RESPONSE_PANE_RATIO}
            aria-valuenow={responsePaneRatio}
            tabIndex={0}
            onPointerDown={handleMainDividerPointerDown}
            onKeyDown={handleMainDividerKeyDown}
          />
          <ResponseViewer response={proxyResult} loading={sending} error={proxyError} />
        </section>
      </main>

      <StatusBar />
      {palette && <CommandPalette onClose={closePalette} onImportCurl={() => { closePalette(); setImportCurlOpen(true); }} onImportPostman={() => { closePalette(); setImportPostmanOpen(true); }} />}
      {importCurlOpen && <ImportCurlDialog collections={collections} onClose={() => setImportCurlOpen(false)} onCreated={handleImportedRequestCreated} />}
      {importPostmanOpen && <ImportPostmanDialog onClose={() => setImportPostmanOpen(false)} onImported={handlePostmanImported} />}
      {authOpen && (
        <div className="auth-backdrop" role="dialog" aria-modal="true" aria-label="Authentication">
          <AuthPanel mode={authMode} onModeChange={setAuthMode} onAuthenticated={handleAuthenticated} onClose={() => setAuthOpen(false)} />
          <button className="auth-close" type="button" onClick={() => setAuthOpen(false)} aria-label="Close authentication dialog">×</button>
        </div>
      )}
      {proxyError && <div className="toast error" role="status">{proxyError}</div>}
    </div>
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(<App />);
}
