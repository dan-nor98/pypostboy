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
  auth_type: 'none',
  auth_data: {},
  pre_request_script: '',
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

function normalizeCollectionsPayload(payload) {
  if (Array.isArray(payload)) return {collections: payload, syncStatus: null};
  return {collections: payload?.collections || [], syncStatus: payload?.sync_status || null};
}

function updateRequestInCollections(collections, requestId, nextRequest) {
  return collections.map((collection) => ({
    ...collection,
    requests: (collection.requests || []).map((request) => (request.id === requestId ? {...request, ...nextRequest} : request)),
    children: updateRequestInCollections(collection.children || [], requestId, nextRequest),
  }));
}

function addRequestToCollection(collections, collectionId, request) {
  return collections.map((collection) => {
    if (collection.id === collectionId) {
      return {...collection, requests: [...(collection.requests || []), request]};
    }

    return {...collection, children: addRequestToCollection(collection.children || [], collectionId, request)};
  });
}

function replaceRequestInCollections(collections, requestId, nextRequest) {
  return collections.map((collection) => ({
    ...collection,
    requests: (collection.requests || []).map((request) => (request.id === requestId ? nextRequest : request)),
    children: replaceRequestInCollections(collection.children || [], requestId, nextRequest),
  }));
}

function isDraftRequestId(requestId) {
  return String(requestId || '').startsWith('draft-request-');
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


function siblingReorderToken(items) {
  return items.map((item) => `${item.id}:${item.updated_at || ''}`).join('|');
}

function collectionSiblings(collections, parentId) {
  if (parentId === null || parentId === undefined) return collections;
  for (const collection of collections) {
    if (collection.id === parentId) return collection.children || [];
    const match = collectionSiblings(collection.children || [], parentId);
    if (match) return match;
  }
  return null;
}

function requestSiblings(collections, collectionId) {
  for (const collection of collections) {
    if (collection.id === collectionId) return collection.requests || [];
    const match = requestSiblings(collection.children || [], collectionId);
    if (match) return match;
  }
  return null;
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

function normalizeQueryParams(rows = []) {
  return (rows || []).map(rowArrayToObject).filter((row) => row.key || row.value || row.description).map((row) => ({
    enabled: row.enabled !== false,
    key: row.key || '',
    value: row.value || '',
    description: row.description || '',
  }));
}

function queryParamsToGridRows(queryParams = []) {
  return normalizeQueryParams(queryParams).map(objectToGridRow);
}

function queryParamsEqual(left = [], right = []) {
  return JSON.stringify(normalizeQueryParams(left)) === JSON.stringify(normalizeQueryParams(right));
}

function hasStructuredQueryMetadata(rows = []) {
  return normalizeQueryParams(rows).some((row) => row.enabled === false || row.description);
}

function parseQueryParams(url) {
  if (!url) return [];
  const queryStart = url.indexOf('?');
  if (queryStart === -1) return [];
  const hashStart = url.indexOf('#', queryStart);
  const query = url.slice(queryStart + 1, hashStart === -1 ? undefined : hashStart);
  if (!query) return [];
  return [...new URLSearchParams(query).entries()].map(([key, value]) => ({enabled: true, key, value, description: ''}));
}

function trimUrlValue(url) {
  return String(url || '').trim();
}

function validateProxyUrl(url) {
  const trimmedUrl = trimUrlValue(url);
  if (!trimmedUrl) {
    throw new Error('Enter a URL before sending.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(trimmedUrl);
  } catch {
    throw new Error('Enter a valid absolute URL including http:// or https://.');
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('URL must use the http:// or https:// scheme.');
  }

  return trimmedUrl;
}

function updateUrlQueryParams(url, rows) {
  const enabledRows = normalizeQueryParams(rows).filter((row) => row.enabled !== false && row.key);
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


function normalizeRequestHeaders(headers = []) {
  return gridRowsToHeaders(headersToGridRows(headers));
}

function headersEqual(left = [], right = []) {
  return JSON.stringify(normalizeRequestHeaders(left)) === JSON.stringify(normalizeRequestHeaders(right));
}

function requestFieldValue(request = {}, field) {
  if (field === 'body_content') return request.body_content ?? request.body_raw ?? '';
  if (field === 'body_raw_type') return request.body_raw_type ?? 'application/json';
  if (field === 'headers') return request.headers ?? [];
  if (field === 'query_params') return request.query_params ?? [];
  if (field === 'auth_type') return request.auth_type ?? 'none';
  if (field === 'auth_data') return request.auth_data ?? {};
  if (field === 'pre_request_script') return request.pre_request_script ?? '';
  if (field === 'method') return request.method ?? 'GET';
  if (field === 'name') return request.name ?? 'Untitled Request';
  if (field === 'url') return request.url ?? '';
  return request[field];
}

function requestFieldEquals(field, value, sourceRequest = {}) {
  const sourceValue = requestFieldValue(sourceRequest, field);
  if (field === 'headers') return headersEqual(value, sourceValue);
  if (field === 'query_params') return queryParamsEqual(value, sourceValue);
  if (field === 'auth_data') return JSON.stringify(value || {}) === JSON.stringify(sourceValue || {});
  return (value ?? '') === (sourceValue ?? '');
}

function getRequestDirtyFields(requestId, draft = {}, bodyDraft, sourceRequest = {}) {
  if (!requestId) return {};
  const dirtyFields = {};
  ['name', 'method', 'url', 'query_params', 'headers', 'body_raw_type', 'auth_type', 'auth_data', 'pre_request_script'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(draft, field) && !requestFieldEquals(field, draft[field], sourceRequest)) {
      dirtyFields[field] = true;
    }
  });
  if (bodyDraft !== undefined && !requestFieldEquals('body_content', bodyDraft, sourceRequest)) {
    dirtyFields.body_content = true;
  }
  return dirtyFields;
}

function removeRequestDraftIfClean(drafts, draftBodies, requestId, sourceRequest) {
  const draft = drafts[requestId] || {};
  const bodyDraft = Object.prototype.hasOwnProperty.call(draftBodies, requestId) ? draftBodies[requestId] : undefined;
  if (Object.keys(getRequestDirtyFields(requestId, draft, bodyDraft, sourceRequest)).length) return drafts;
  const {[requestId]: _cleanDraft, ...remainingDrafts} = drafts;
  return remainingDrafts;
}

function removeRequestBodyDraftIfClean(draftBodies, requestId, sourceRequest) {
  if (!Object.prototype.hasOwnProperty.call(draftBodies, requestId)) return draftBodies;
  if (!requestFieldEquals('body_content', draftBodies[requestId], sourceRequest)) return draftBodies;
  const {[requestId]: _cleanBody, ...remainingBodies} = draftBodies;
  return remainingBodies;
}

function authDataValue(authData, field, fallback = '') {
  return authData && typeof authData === 'object' ? authData[field] ?? fallback : fallback;
}

function maskSecretValue(value) {
  const text = String(value ?? '');
  if (!text) return '';
  return text.length <= 4 ? '••••' : `${text.slice(0, 2)}••••${text.slice(-2)}`;
}

function maskHeaders(headers = {}) {
  return Object.entries(headers).reduce((masked, [key, value]) => {
    masked[key] = /authorization|api[-_]?key|token|secret|password/i.test(key) ? maskSecretValue(value) : value;
    return masked;
  }, {});
}

function applyAuthorization(request, authType = 'none', authData = {}) {
  const next = {...request, headers: {...(request.headers || {})}};
  const type = String(authType || 'none').toLowerCase();
  if (type === 'bearer' && authData.token) {
    next.headers.Authorization = `Bearer ${authData.token}`;
  } else if (type === 'basic' && (authData.username || authData.password)) {
    next.headers.Authorization = `Basic ${btoa(`${authData.username || ''}:${authData.password || ''}`)}`;
  } else if (type === 'api_key' && authData.key) {
    if (authData.in === 'query') {
      const url = new URL(next.url, window.location.origin);
      url.searchParams.set(authData.key, authData.value || '');
      next.url = url.href;
    } else {
      next.headers[authData.key] = authData.value || '';
    }
  }
  return next;
}

function runPreRequestScript(source, request) {
  if (!String(source || '').trim()) return request;
  const mutable = {...request, headers: {...(request.headers || {})}};
  const api = Object.freeze({
    setHeader: (key, value) => { if (key) mutable.headers[String(key)] = String(value ?? ''); },
    removeHeader: (key) => { delete mutable.headers[String(key)]; },
    setUrl: (url) => { mutable.url = String(url || ''); },
    setBody: (body) => { mutable.body = body == null ? '' : String(body); },
    setMethod: (method) => { mutable.method = String(method || 'GET').toUpperCase(); },
    addQueryParam: (key, value) => {
      if (!key) return;
      const url = new URL(mutable.url, window.location.origin);
      url.searchParams.set(String(key), String(value ?? ''));
      mutable.url = url.href;
    },
    get request() { return Object.freeze({...mutable, headers: Object.freeze({...mutable.headers})}); },
  });
  const runner = new Function('pb', '"use strict"; const window = undefined, document = undefined, localStorage = undefined, sessionStorage = undefined, fetch = undefined, XMLHttpRequest = undefined;\n' + String(source));
  runner(api);
  return mutable;
}

async function recordRequestHistory(requestId, payload) {
  if (!requestId || isDraftRequestId(requestId)) return;
  try {
    await apiClient.createRequestInstance?.(requestId, payload);
  } catch {
    // History writes are best-effort and should not mask the request result.
  }
}

function buildHistoryPayload({request, response, error}) {
  const bodyText = String(request.body ?? '');
  return {
    name: `${request.method || 'GET'} ${request.url} @ ${new Date().toISOString()}`,
    method: request.method || 'GET',
    url: request.url,
    headers: Object.entries(maskHeaders(request.headers || {})).map(([key, value]) => ({enabled: true, key, value})),
    body_content: bodyText ? `[${bodyText.length} bytes ${request.contentType || 'body'}]` : '',
    body_raw_type: request.contentType || 'application/json',
    response_status: response?.status ?? null,
    response_status_text: response?.statusText || (error ? 'Error' : ''),
    response_headers: response?.headers || {},
    response_body: response ? {metadata: {time_ms: response.time, size: response.size}} : {error: error?.message || 'Request failed'},
    response_time_ms: response?.time,
    response_size: response?.size ?? '',
  };
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



function shellQuote(value) {
  const text = String(value ?? '');
  if (!text) return "''";
  return `'${text.replace(/'/g, `'\\''`)}'`;
}

function requestToCurl(request = {}) {
  const parts = ['curl', '-X', request.method || 'GET'];
  Object.entries(headersArrayToObject(request.headers || [])).forEach(([key, value]) => {
    parts.push('-H', shellQuote(`${key}: ${value}`));
  });
  const body = request.body_content ?? request.body_raw ?? '';
  if (body) parts.push('--data-raw', shellQuote(body));
  parts.push(shellQuote(request.url || ''));
  return parts.join(' ');
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
  const [syncStatus, setSyncStatus] = useState({status: 'synchronized', label: 'Synchronized', diagnostics: [], conflicts: [], retryable: false});
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionsError, setCollectionsError] = useState('');
  const [authMode, setAuthMode] = useState('login');
  const [authOpen, setAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [openRequestIds, setOpenRequestIds] = useState([]);
  const [proxyResult, setProxyResult] = useState(null);
  const [proxyError, setProxyError] = useState('');
  const [draftBodies, setDraftBodies] = useState({});
  const [requestDrafts, setRequestDrafts] = useState({});
  const [requestDetails, setRequestDetails] = useState({});
  const [requestLoadErrors, setRequestLoadErrors] = useState({});
  const [savingRequest, setSavingRequest] = useState(false);
  const [pendingDirtyCloseRequestId, setPendingDirtyCloseRequestId] = useState(null);
  const [pendingDirtyAction, setPendingDirtyAction] = useState(null);
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
  const isRequestDirty = useCallback((requestId) => {
    if (!requestId) return false;
    const request = flattenRequests(collections).find((candidate) => candidate.id === requestId);
    const bodyDraft = Object.prototype.hasOwnProperty.call(draftBodies, requestId) ? draftBodies[requestId] : undefined;
    return Boolean(
      Object.keys(getRequestDirtyFields(requestId, requestDrafts[requestId] || {}, bodyDraft, request)).length
      || isDraftRequestId(requestId)
      || request?.is_draft
    );
  }, [collections, draftBodies, requestDrafts]);
  const dirtyRequestIds = useMemo(() => openRequestIds.filter(isRequestDirty), [isRequestDirty, openRequestIds]);
  const hasDirtyRequests = dirtyRequestIds.length > 0;

  useEffect(() => { localStorage.setItem('pypostboy.environments', JSON.stringify(environments)); }, [environments]);
  useEffect(() => { localStorage.setItem(PANEL_SPLIT_STORAGE_KEY, String(responsePaneRatio)); }, [responsePaneRatio]);
  useEffect(() => { localStorage.setItem('pypostboy.activeEnvironment', activeEnvironmentId); }, [activeEnvironmentId]);

  useEffect(() => {
    if (!hasDirtyRequests) return undefined;

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = '';
      return '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasDirtyRequests]);

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
      const [payload, fetchedSyncStatus] = await Promise.all([apiClient.listCollections(), apiClient.getSyncStatus?.()]);
      const {collections: data, syncStatus: nextSyncStatus} = normalizeCollectionsPayload(payload);
      setCollections(data);
      if (fetchedSyncStatus || nextSyncStatus) setSyncStatus(fetchedSyncStatus || nextSyncStatus);
      setRequestDetails((currentDetails) => {
        const refreshedRequests = flattenRequests(data);
        return refreshedRequests.reduce((details, request) => {
          const existing = currentDetails[request.id];
          if (existing && existing.sourceUpdatedAt === request.updated_at) details[request.id] = existing;
          return details;
        }, {});
      });
      const refreshedRequestIds = flattenRequests(data).map((request) => request.id);
      const nextRequestId = preferredRequestId || (activeRequestId && refreshedRequestIds.includes(activeRequestId) ? activeRequestId : refreshedRequestIds[0]) || null;
      setOpenRequestIds((currentIds) => {
        const retainedIds = currentIds.filter((requestId) => refreshedRequestIds.includes(requestId));
        const nextIds = nextRequestId && !retainedIds.includes(nextRequestId) ? [...retainedIds, nextRequestId] : retainedIds;
        return nextIds.length === currentIds.length && nextIds.every((requestId, index) => requestId === currentIds[index]) ? currentIds : nextIds;
      });
      setActiveRequestId(nextRequestId);
      return data;
    } catch (error) {
      setCollectionsError(error.message);
      return null;
    } finally {
      setCollectionsLoading(false);
    }
  }, [activeRequestId]);

  const retrySync = useCallback(async () => {
    try {
      const nextStatus = await apiClient.retrySync?.();
      if (nextStatus) setSyncStatus(nextStatus);
      await refreshCollections();
    } catch (error) {
      setSyncStatus({status: 'failed', label: 'Sync failed', diagnostics: [error.message], conflicts: [], retryable: true});
    }
  }, [refreshCollections]);

  const handleAuthenticated = useCallback((user, options = {}) => {
    setCurrentUser(user);
    if (!options.keepOpen) setAuthOpen(false);
    refreshCollections();
  }, [refreshCollections]);

  const executeLogout = useCallback(async () => {
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
    const previousSiblings = collectionSiblings(collections, parentId) || [];
    const previousIds = collectionSiblingIds(collections, parentId);
    const reorderToken = siblingReorderToken(previousSiblings);
    const nextCollections = reorderCollectionSiblings(collections, parentId, collectionId, direction);
    const nextIds = collectionSiblingIds(nextCollections, parentId);
    if (previousIds.join('\0') === nextIds.join('\0')) return;

    setCollections(nextCollections);
    try {
      await apiClient.reorderCollections({parent_id: parentId, ordered_ids: nextIds, reorder_token: reorderToken});
    } catch (error) {
      setCollections(previousCollections);
      if (error.status === 409) {
        setCollectionsError(error.message || 'Collection order changed elsewhere. Refreshed collections.');
        await refreshCollections();
      } else {
        setCollectionsError(error.message);
      }
    }
  }, [collections, refreshCollections]);

  const moveRequest = useCallback(async (requestId, direction, collectionId) => {
    if (!collectionId) return;
    const previousCollections = collections;
    const previousSiblings = requestSiblings(collections, collectionId) || [];
    const previousIds = requestSiblingIds(collections, collectionId);
    const reorderToken = siblingReorderToken(previousSiblings);
    const nextCollections = reorderRequestsInCollection(collections, collectionId, requestId, direction);
    const nextIds = requestSiblingIds(nextCollections, collectionId);
    if (previousIds.join('\0') === nextIds.join('\0')) return;

    setCollections(nextCollections);
    try {
      await apiClient.reorderRequests({collection_id: collectionId, ordered_ids: nextIds, reorder_token: reorderToken});
    } catch (error) {
      setCollections(previousCollections);
      if (error.status === 409) {
        setCollectionsError(error.message || 'Request order changed elsewhere. Refreshed collections.');
        await refreshCollections();
      } else {
        setCollectionsError(error.message);
      }
    }
  }, [collections, refreshCollections]);


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
  const createSidebarRequest = useCallback((data = {}) => {
    const destinationCollection = findCollectionById(collections, data.collection_id) || collections[0];
    if (!destinationCollection?.id) {
      setCollectionsError('Choose a destination collection before creating a request.');
      return null;
    }

    const draftRequest = {
      id: `draft-request-${Date.now()}`,
      collection_id: destinationCollection.id,
      workspace_id: destinationCollection.workspace_id || currentUser?.workspace_id || 'local',
      name: data.name?.trim() || 'Untitled Request',
      method: data.method || 'GET',
      url: data.url || '',
      headers: data.headers || [],
      body_content: data.body_content || '',
      body_raw_type: data.body_raw_type || 'application/json',
      auth_type: data.auth_type || 'none',
      auth_data: data.auth_data || {},
      pre_request_script: data.pre_request_script || '',
      is_draft: true,
    };

    setCollectionsError('');
    setCollections((currentCollections) => addRequestToCollection(currentCollections, destinationCollection.id, draftRequest));
    setOpenRequestIds((currentIds) => (currentIds.includes(draftRequest.id) ? currentIds : [...currentIds, draftRequest.id]));
    setRequestDrafts((drafts) => ({...drafts, [draftRequest.id]: {name: draftRequest.name, method: draftRequest.method}}));
    setDraftBodies((drafts) => ({...drafts, [draftRequest.id]: draftRequest.body_content}));
    setActiveRequestId(draftRequest.id);
    return draftRequest;
  }, [collections, currentUser]);
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
    if (importedRequest?.id) {
      setOpenRequestIds((currentIds) => (currentIds.includes(importedRequest.id) ? currentIds : [...currentIds, importedRequest.id]));
      setActiveRequestId(importedRequest.id);
    }
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
        const [payload, fetchedSyncStatus] = await Promise.all([apiClient.listCollections(), apiClient.getSyncStatus?.()]);
        const {collections: data, syncStatus: nextSyncStatus} = normalizeCollectionsPayload(payload);
        if (!cancelled) {
          setCollections(data);
          if (fetchedSyncStatus || nextSyncStatus) setSyncStatus(fetchedSyncStatus || nextSyncStatus);
          setRequestDetails((currentDetails) => {
            const refreshedRequests = flattenRequests(data);
            return refreshedRequests.reduce((details, request) => {
              const existing = currentDetails[request.id];
              if (existing && existing.sourceUpdatedAt === request.updated_at) details[request.id] = existing;
              return details;
            }, {});
          });
          const firstRequestId = flattenRequests(data)[0]?.id || null;
          setOpenRequestIds((currentIds) => (currentIds.length || !firstRequestId ? currentIds : [firstRequestId]));
          setActiveRequestId((current) => current || firstRequestId);
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


  const openRequest = useCallback(async (requestId) => {
    if (!requestId) return;

    setOpenRequestIds((currentIds) => (currentIds.includes(requestId) ? currentIds : [...currentIds, requestId]));
    setActiveRequestId(requestId);
    setRequestLoadErrors((errors) => {
      if (!errors[requestId]) return errors;
      const {[requestId]: _clearedError, ...remainingErrors} = errors;
      return remainingErrors;
    });

    const sourceRequest = flattenRequests(collections).find((request) => request.id === requestId);
    if (!sourceRequest || isDraftRequestId(requestId) || sourceRequest.is_draft) return;

    const cachedDetail = requestDetails[requestId];
    const isStale = cachedDetail?.sourceUpdatedAt !== sourceRequest.updated_at;
    const needsFullDetails = !cachedDetail || isStale;
    if (!needsFullDetails) return;

    try {
      const loadedRequest = await apiClient.getRequest(requestId);
      const nextRequest = {
        ...sourceRequest,
        ...(loadedRequest || {}),
        collection_id: loadedRequest?.collection_id ?? sourceRequest.collection_id,
      };
      setRequestDetails((details) => ({
        ...details,
        [requestId]: {data: nextRequest, sourceUpdatedAt: nextRequest.updated_at ?? sourceRequest.updated_at},
      }));
      setCollections((currentCollections) => updateRequestInCollections(currentCollections, requestId, nextRequest));
    } catch (error) {
      setRequestLoadErrors((errors) => ({...errors, [requestId]: error.message || 'Unable to load request details'}));
    }
  }, [collections, requestDetails]);


  const closeRequestTabImmediately = useCallback((requestId, additionalRequestIds = []) => {
    const requestIdsToClose = new Set([requestId, ...additionalRequestIds].filter(Boolean));
    if (!requestIdsToClose.size) return;

    setOpenRequestIds((currentIds) => {
      const closedIndex = currentIds.findIndex((openRequestId) => requestIdsToClose.has(openRequestId));
      if (closedIndex === -1) return currentIds;

      const nextIds = currentIds.filter((openRequestId) => !requestIdsToClose.has(openRequestId));
      if (requestIdsToClose.has(activeRequestId)) {
        setActiveRequestId(nextIds[closedIndex] || nextIds[closedIndex - 1] || null);
      }
      return nextIds;
    });
  }, [activeRequestId]);

  const closeRequestTab = useCallback((requestId) => {
    if (!requestId) return;
    if (isRequestDirty(requestId)) {
      setPendingDirtyCloseRequestId(requestId);
      return;
    }
    closeRequestTabImmediately(requestId);
  }, [closeRequestTabImmediately, isRequestDirty]);

  const requests = useMemo(() => flattenRequests(collections).map((request) => {
    const detail = requestDetails[request.id]?.data;
    if (!detail) return request;
    return {...request, ...detail, collection_id: detail.collection_id ?? request.collection_id};
  }), [collections, requestDetails]);
  const openedRequests = useMemo(() => openRequestIds
    .map((requestId) => requests.find((request) => request.id === requestId))
    .filter(Boolean), [openRequestIds, requests]);

  useEffect(() => {
    const availableRequestIds = requests.map((request) => request.id);
    setOpenRequestIds((currentIds) => {
      const nextIds = currentIds.filter((requestId) => availableRequestIds.includes(requestId));
      return nextIds.length === currentIds.length && nextIds.every((requestId, index) => requestId === currentIds[index]) ? currentIds : nextIds;
    });
    setActiveRequestId((currentId) => {
      if (currentId && availableRequestIds.includes(currentId) && openRequestIds.includes(currentId)) return currentId;
      return openRequestIds.find((requestId) => availableRequestIds.includes(requestId)) || null;
    });
  }, [openRequestIds, requests]);

  const activeRequest = requests.find((request) => request.id === activeRequestId) || openedRequests[0] || defaultRequest;
  const activeRequestDraft = requestDrafts[activeRequest.id] || {};
  const editableQueryParams = activeRequestDraft.query_params ?? activeRequest.query_params ?? parseQueryParams(activeRequestDraft.url ?? activeRequest.url ?? '');
  const editableUrl = updateUrlQueryParams(activeRequestDraft.url ?? activeRequest.url ?? '', editableQueryParams);
  const editableRequest = {
    ...activeRequest,
    name: activeRequestDraft.name ?? activeRequest.name ?? 'Untitled Request',
    method: activeRequestDraft.method ?? activeRequest.method ?? 'GET',
    url: editableUrl,
    query_params: editableQueryParams,
    headers: activeRequestDraft.headers ?? activeRequest.headers ?? [],
    body_raw_type: activeRequestDraft.body_raw_type ?? activeRequest.body_raw_type ?? 'application/json',
    auth_type: activeRequestDraft.auth_type ?? activeRequest.auth_type ?? 'none',
    auth_data: activeRequestDraft.auth_data ?? activeRequest.auth_data ?? {},
    pre_request_script: activeRequestDraft.pre_request_script ?? activeRequest.pre_request_script ?? '',
  };
  const requestBody = draftBodies[activeRequest.id] ?? activeRequest.body_content ?? activeRequest.body_raw ?? '';
  const requestLoadError = requestLoadErrors[activeRequest.id] || '';
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

  const parameterRows = useMemo(() => queryParamsToGridRows(editableRequest.query_params), [editableRequest.query_params]);
  const headerRows = useMemo(() => headersToGridRows(editableRequest.headers), [editableRequest.headers]);

  const setComparableRequestDraftField = useCallback((requestId, field, value, sourceRequest) => {
    setRequestDrafts((drafts) => {
      const nextDraft = {...drafts[requestId]};
      if (requestFieldEquals(field, value, sourceRequest)) delete nextDraft[field];
      else nextDraft[field] = value;

      const nextDrafts = Object.keys(nextDraft).length ? {...drafts, [requestId]: nextDraft} : (() => {
        const {[requestId]: _removedDraft, ...remainingDrafts} = drafts;
        return remainingDrafts;
      })();
      return removeRequestDraftIfClean(nextDrafts, draftBodies, requestId, sourceRequest);
    });
    setDraftBodies((drafts) => removeRequestBodyDraftIfClean(drafts, requestId, sourceRequest));
  }, [draftBodies]);

  const handleParameterRowsChange = useCallback((nextRows) => {
    const queryParams = normalizeQueryParams(nextRows);
    const url = updateUrlQueryParams(editableRequest.url, queryParams);
    setComparableRequestDraftField(activeRequest.id, 'query_params', queryParams, activeRequest);
    setComparableRequestDraftField(activeRequest.id, 'url', url, activeRequest);
  }, [activeRequest, editableRequest.url, setComparableRequestDraftField]);

  const handleUrlChange = useCallback((url) => {
    setComparableRequestDraftField(activeRequest.id, 'url', url, activeRequest);
    const existingParams = editableRequest.query_params || [];
    // URL text cannot represent disabled rows or descriptions. Preserve existing
    // structured metadata in that conflict case instead of silently discarding it.
    if (!hasStructuredQueryMetadata(existingParams)) {
      setComparableRequestDraftField(activeRequest.id, 'query_params', parseQueryParams(url), activeRequest);
    }
  }, [activeRequest, editableRequest.query_params, setComparableRequestDraftField]);

  const handleHeaderRowsChange = useCallback((nextRows) => {
    const headers = gridRowsToHeaders(nextRows);
    setComparableRequestDraftField(activeRequest.id, 'headers', headers, activeRequest);
  }, [activeRequest, setComparableRequestDraftField]);


  const updateAuthType = useCallback((authType) => {
    setComparableRequestDraftField(activeRequest.id, 'auth_type', authType, activeRequest);
  }, [activeRequest, setComparableRequestDraftField]);

  const updateAuthData = useCallback((field, value) => {
    const nextAuthData = {...(editableRequest.auth_data || {}), [field]: value};
    setComparableRequestDraftField(activeRequest.id, 'auth_data', nextAuthData, activeRequest);
  }, [activeRequest, editableRequest.auth_data, setComparableRequestDraftField]);

  const updatePreRequestScript = useCallback((script) => {
    setComparableRequestDraftField(activeRequest.id, 'pre_request_script', script, activeRequest);
  }, [activeRequest, setComparableRequestDraftField]);

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
      const baseRequest = {
        method: editableRequest.method || 'GET',
        url: resolvedRequest.url,
        headers: resolvedRequest.headers,
        body: resolvedRequest.body,
        contentType: editableRequest.body_raw_type || 'application/json',
      };
      const scriptedRequest = runPreRequestScript(editableRequest.pre_request_script, baseRequest);
      const outboundRequest = applyAuthorization(scriptedRequest, editableRequest.auth_type, editableRequest.auth_data);
      outboundRequest.url = validateProxyUrl(outboundRequest.url);
      let result;
      try {
        result = await apiClient.proxyRequest(outboundRequest);
        setProxyResult(result);
        return;
      } catch (requestError) {
        await recordRequestHistory(activeRequest.id, buildHistoryPayload({request: outboundRequest, error: requestError}));
        throw requestError;
      } finally {
        if (result) await recordRequestHistory(activeRequest.id, buildHistoryPayload({request: outboundRequest, response: result}));
      }
    } catch (error) {
      setProxyError(error.message);
    } finally {
      setSending(false);
    }
  }, [activeEnvironment, editableRequest, requestBody]);


  const updateRequestDraft = useCallback((field, value) => {
    setComparableRequestDraftField(activeRequest.id, field, value, activeRequest);
  }, [activeRequest, setComparableRequestDraftField]);

  const updateBodyDraft = useCallback((nextBody) => {
    setDraftBodies((drafts) => {
      if (requestFieldEquals('body_content', nextBody, activeRequest)) {
        const {[activeRequest.id]: _removedBody, ...remainingBodies} = drafts;
        return remainingBodies;
      }
      return {...drafts, [activeRequest.id]: nextBody};
    });
    setRequestDrafts((drafts) => removeRequestDraftIfClean(drafts, {
      ...draftBodies,
      [activeRequest.id]: nextBody,
    }, activeRequest.id, activeRequest));
  }, [activeRequest, draftBodies]);

  const saveRequestById = useCallback(async (requestId, {activateSavedDraft = true} = {}) => {
    const request = requests.find((candidate) => candidate.id === requestId);
    if (!request?.id) return null;

    setSavingRequest(true);
    setProxyError('');
    try {
      const requestDraft = requestDrafts[requestId] || {};
      const payload = {
        ...request,
        name: requestDraft.name ?? request.name ?? 'Untitled Request',
        method: requestDraft.method ?? request.method ?? 'GET',
        url: trimUrlValue(updateUrlQueryParams(requestDraft.url ?? request.url ?? '', requestDraft.query_params ?? request.query_params ?? [])),
        query_params: requestDraft.query_params ?? request.query_params ?? [],
        headers: requestDraft.headers ?? request.headers ?? [],
        body_content: draftBodies[requestId] ?? request.body_content ?? request.body_raw ?? '',
        body_raw_type: requestDraft.body_raw_type ?? request.body_raw_type ?? 'application/json',
        auth_type: requestDraft.auth_type ?? request.auth_type ?? 'none',
        auth_data: requestDraft.auth_data ?? request.auth_data ?? {},
        pre_request_script: requestDraft.pre_request_script ?? request.pre_request_script ?? '',
      };
      const saveDraft = isDraftRequestId(request.id) || request.is_draft;
      const {_temporaryId, id: _draftId, is_draft: _isDraft, ...createPayload} = payload;
      const updatePayload = saveDraft ? payload : {...payload, expected_updated_at: request.updated_at};
      const savedRequest = saveDraft
        ? await apiClient.createRequest({...createPayload, collection_id: request.collection_id})
        : await apiClient.updateRequest(request.id, updatePayload);
      const nextRequest = {...payload, ...(savedRequest || {}), is_draft: false};
      setCollections((currentCollections) => (saveDraft
        ? replaceRequestInCollections(currentCollections, request.id, nextRequest)
        : updateRequestInCollections(currentCollections, request.id, nextRequest)));
      if (saveDraft && nextRequest.id) {
        setOpenRequestIds((currentIds) => currentIds.map((openRequestId) => (openRequestId === request.id ? nextRequest.id : openRequestId)));
        if (activateSavedDraft) setActiveRequestId(nextRequest.id);
      }
      setRequestDrafts((drafts) => {
        const {[request.id]: _savedDraft, ...remainingDrafts} = drafts;
        return remainingDrafts;
      });
      setDraftBodies((drafts) => {
        const {[request.id]: _savedBody, ...remainingDrafts} = drafts;
        return remainingDrafts;
      });
      return nextRequest;
    } catch (error) {
      const isDraftSave = isDraftRequestId(request.id) || request.is_draft;
      const conflictMessage = 'Could not save request because it changed elsewhere. Your local edits are still here; refresh or resolve the conflict before saving again.';
      setProxyError(isDraftSave
        ? `Could not save draft request. ${error.message || 'Check the destination collection and try Save again.'}`
        : error.status === 409 ? conflictMessage : error.message);
      return null;
    } finally {
      setSavingRequest(false);
    }
  }, [draftBodies, requestDrafts, requests]);

  const saveRequest = useCallback(() => saveRequestById(activeRequest.id), [activeRequest.id, saveRequestById]);


  const activeRequestPayload = useCallback((overrides = {}) => ({
    ...activeRequest,
    name: editableRequest.name || 'Untitled Request',
    method: editableRequest.method || 'GET',
    url: trimUrlValue(updateUrlQueryParams(editableRequest.url || '', editableRequest.query_params || [])),
    query_params: editableRequest.query_params || [],
    headers: editableRequest.headers || [],
    body_content: requestBody || '',
    body_raw_type: editableRequest.body_raw_type || 'application/json',
    auth_type: editableRequest.auth_type || 'none',
    auth_data: editableRequest.auth_data || {},
    pre_request_script: editableRequest.pre_request_script || '',
    ...overrides,
  }), [activeRequest, editableRequest, requestBody]);

  const createRequestFromActiveDraft = useCallback((overrides = {}) => {
    if (!activeRequest.collection_id) {
      setCollectionsError('Choose a destination collection before saving this request.');
      return null;
    }
    const {id: _id, updated_at: _updatedAt, is_draft: _isDraft, ...payload} = activeRequestPayload(overrides);
    return runCollectionMutation(() => apiClient.createRequest({...payload, collection_id: overrides.collection_id || activeRequest.collection_id}));
  }, [activeRequest.collection_id, activeRequestPayload, runCollectionMutation]);

  const renameActiveRequest = useCallback(() => {
    const nextName = window.prompt('Request name', editableRequest.name || 'Untitled Request');
    if (!nextName?.trim()) return;
    updateRequestDraft('name', nextName.trim());
  }, [editableRequest.name, updateRequestDraft]);

  const saveActiveRequestAs = useCallback(() => {
    const nextName = window.prompt('Save request as', `${editableRequest.name || 'Untitled Request'} Copy`);
    if (!nextName?.trim()) return null;
    return createRequestFromActiveDraft({name: nextName.trim()});
  }, [createRequestFromActiveDraft, editableRequest.name]);

  const duplicateActiveRequest = useCallback(() => createRequestFromActiveDraft({name: `${editableRequest.name || 'Untitled Request'} Copy`}), [createRequestFromActiveDraft, editableRequest.name]);

  const moveActiveRequestToCollection = useCallback(() => {
    const options = flattenCollectionOptions(collections);
    const targetId = window.prompt('Move request to collection id', activeRequest.collection_id || options[0]?.id || '');
    if (!targetId || targetId === activeRequest.collection_id) return null;
    return moveSidebarRequest(activeRequest.id, targetId);
  }, [activeRequest.collection_id, activeRequest.id, collections, moveSidebarRequest]);

  const copyActiveRequestCurl = useCallback(async () => {
    setCollectionsError('');
    try {
      const curl = isRequestDirty(activeRequest.id)
        ? requestToCurl(activeRequestPayload())
        : (await apiClient.exportRequestCurl(activeRequest.id)).curl;
      await navigator.clipboard.writeText(curl);
    } catch (error) {
      setCollectionsError(error.message);
    }
  }, [activeRequest.id, activeRequestPayload, isRequestDirty]);

  const deleteActiveRequest = useCallback(() => deleteSidebarRequest(activeRequest.id), [activeRequest.id, deleteSidebarRequest]);

  const discardDirtyClose = useCallback(() => {
    const requestId = pendingDirtyCloseRequestId;
    if (!requestId) return;
    setRequestDrafts((drafts) => {
      const {[requestId]: _discardedDraft, ...remainingDrafts} = drafts;
      return remainingDrafts;
    });
    setDraftBodies((drafts) => {
      const {[requestId]: _discardedBody, ...remainingDrafts} = drafts;
      return remainingDrafts;
    });
    setPendingDirtyCloseRequestId(null);
    closeRequestTabImmediately(requestId);
  }, [closeRequestTabImmediately, pendingDirtyCloseRequestId]);

  const cancelDirtyClose = useCallback(() => setPendingDirtyCloseRequestId(null), []);

  const saveDirtyClose = useCallback(async () => {
    const requestId = pendingDirtyCloseRequestId;
    if (!requestId) return;
    const savedRequest = await saveRequestById(requestId, {activateSavedDraft: false});
    if (!savedRequest) return;
    setPendingDirtyCloseRequestId(null);
    closeRequestTabImmediately(requestId, [savedRequest.id]);
  }, [closeRequestTabImmediately, pendingDirtyCloseRequestId, saveRequestById]);

  const runPendingDirtyAction = useCallback((action) => {
    if (!action) return;
    if (action.type === 'logout') executeLogout();
    if (action.type === 'select-environment') setActiveEnvironmentId(action.environmentId);
  }, [executeLogout]);

  const requestDirtyAction = useCallback((action) => {
    if (hasDirtyRequests) {
      setPendingDirtyAction(action);
      return;
    }
    runPendingDirtyAction(action);
  }, [hasDirtyRequests, runPendingDirtyAction]);

  const handleLogout = useCallback(() => requestDirtyAction({type: 'logout'}), [requestDirtyAction]);

  const handleSelectEnvironment = useCallback((environmentId) => {
    if (!environmentId || environmentId === activeEnvironmentId) return;
    requestDirtyAction({type: 'select-environment', environmentId});
  }, [activeEnvironmentId, requestDirtyAction]);

  const cancelDirtyAction = useCallback(() => setPendingDirtyAction(null), []);

  const discardDirtyAction = useCallback(() => {
    const action = pendingDirtyAction;
    if (!action) return;
    setRequestDrafts({});
    setDraftBodies({});
    setPendingDirtyAction(null);
    runPendingDirtyAction(action);
  }, [pendingDirtyAction, runPendingDirtyAction]);

  const saveDirtyAction = useCallback(async () => {
    const action = pendingDirtyAction;
    if (!action) return;
    for (const requestId of dirtyRequestIds) {
      const savedRequest = await saveRequestById(requestId, {activateSavedDraft: false});
      if (!savedRequest) return;
    }
    setPendingDirtyAction(null);
    runPendingDirtyAction(action);
  }, [dirtyRequestIds, pendingDirtyAction, runPendingDirtyAction, saveRequestById]);


  useEffect(() => {
    if (!activeRequest.id || isDraftRequestId(activeRequest.id) || activeRequest.is_draft) {
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
    const restoredDraft = {
      method: snapshot.method || 'GET',
      url: snapshot.url || '',
      query_params: snapshot.query_params || [],
      headers: snapshot.headers || [],
      body_raw_type: snapshot.body_raw_type || 'application/json',
    };
    const restoredBody = snapshot.body_content ?? snapshot.body_raw ?? '';
    setRequestDrafts((drafts) => {
      const nextDraft = {...drafts[activeRequest.id]};
      Object.entries(restoredDraft).forEach(([field, value]) => {
        if (requestFieldEquals(field, value, activeRequest)) delete nextDraft[field];
        else nextDraft[field] = value;
      });
      const nextDrafts = Object.keys(nextDraft).length ? {...drafts, [activeRequest.id]: nextDraft} : (() => {
        const {[activeRequest.id]: _removedDraft, ...remainingDrafts} = drafts;
        return remainingDrafts;
      })();
      return removeRequestDraftIfClean(nextDrafts, {...draftBodies, [activeRequest.id]: restoredBody}, activeRequest.id, activeRequest);
    });
    setDraftBodies((drafts) => {
      if (requestFieldEquals('body_content', restoredBody, activeRequest)) {
        const {[activeRequest.id]: _removedBody, ...remainingBodies} = drafts;
        return remainingBodies;
      }
      return {...drafts, [activeRequest.id]: restoredBody};
    });
    selectConfigTab('body');
  }, [activeRequest, draftBodies, selectConfigTab]);

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
            onSelectEnvironment={handleSelectEnvironment}
            onUpdateEnvironment={updateEnvironment}
          />
        ) : (
        <Sidebar
          collections={collections}
          loading={collectionsLoading}
          error={collectionsError}
          syncStatus={syncStatus}
          onRetrySync={retrySync}
          activeRequestId={activeRequest.id}
          dirtyRequestIds={dirtyRequestIds}
          onSelectRequest={openRequest}
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
          <RequestTabs requests={openedRequests} activeRequestId={activeRequest.id} dirtyRequestIds={dirtyRequestIds} onSelectRequest={openRequest} onCloseRequest={closeRequestTab} loading={collectionsLoading} error={collectionsError} />
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
              onUrlChange={handleUrlChange}
              onSave={saveRequest}
              saving={savingRequest}
              saveDisabled={!activeRequest.id}
              onSaveAs={saveActiveRequestAs}
              onDuplicate={duplicateActiveRequest}
              onRename={renameActiveRequest}
              onMove={moveActiveRequestToCollection}
              onExport={copyActiveRequestCurl}
              onGenerateCode={copyActiveRequestCurl}
              onDelete={deleteActiveRequest}
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
                  onChange={updateBodyDraft}
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

            <div
              className="request-grid"
              id="request-config-panel-authorization"
              role="tabpanel"
              aria-labelledby="request-config-tab-authorization"
              hidden={activeConfigTab !== 'authorization'}
            >
              <section>
                <div className="section-head"><span>Authorization</span></div>
                <div className="form-stack">
                  <label>
                    <span>Type</span>
                    <select aria-label="Authorization type" value={editableRequest.auth_type || 'none'} onChange={(event) => updateAuthType(event.target.value)}>
                      <option value="none">No Auth</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                      <option value="api_key">API Key</option>
                    </select>
                  </label>
                  {editableRequest.auth_type === 'bearer' && (
                    <label>
                      <span>Token</span>
                      <input aria-label="Bearer token" type="password" value={authDataValue(editableRequest.auth_data, 'token')} onChange={(event) => updateAuthData('token', event.target.value)} />
                    </label>
                  )}
                  {editableRequest.auth_type === 'basic' && (
                    <>
                      <label><span>Username</span><input aria-label="Basic username" value={authDataValue(editableRequest.auth_data, 'username')} onChange={(event) => updateAuthData('username', event.target.value)} /></label>
                      <label><span>Password</span><input aria-label="Basic password" type="password" value={authDataValue(editableRequest.auth_data, 'password')} onChange={(event) => updateAuthData('password', event.target.value)} /></label>
                    </>
                  )}
                  {editableRequest.auth_type === 'api_key' && (
                    <>
                      <label><span>Key</span><input aria-label="API key name" value={authDataValue(editableRequest.auth_data, 'key')} onChange={(event) => updateAuthData('key', event.target.value)} /></label>
                      <label><span>Value</span><input aria-label="API key value" type="password" value={authDataValue(editableRequest.auth_data, 'value')} onChange={(event) => updateAuthData('value', event.target.value)} /></label>
                      <label><span>Add to</span><select aria-label="API key location" value={authDataValue(editableRequest.auth_data, 'in', 'header')} onChange={(event) => updateAuthData('in', event.target.value)}><option value="header">Header</option><option value="query">Query parameter</option></select></label>
                    </>
                  )}
                </div>
              </section>
              <aside className="inspector"><h3>Authorization</h3><p className="hint">Credentials are applied only to the outbound request and masked in history.</p></aside>
            </div>
            <div
              className="request-grid"
              id="request-config-panel-scripts"
              role="tabpanel"
              aria-labelledby="request-config-tab-scripts"
              hidden={activeConfigTab !== 'scripts'}
            >
              <section>
                <div className="section-head"><span>Pre-request Script</span></div>
                <CodeEditor value={editableRequest.pre_request_script || ''} onChange={updatePreRequestScript} wordWrap label="Pre-request script editor" />
              </section>
              <aside className="inspector"><h3>Script API</h3><p className="hint">Use pb.setHeader, pb.removeHeader, pb.addQueryParam, pb.setUrl, pb.setMethod, or pb.setBody. Browser globals and network APIs are unavailable.</p></aside>
            </div>
            {requestConfigTabs
              .filter((tab) => !['params', 'body', 'headers', 'authorization', 'scripts'].includes(tab.id))
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
          <ResponseViewer response={proxyResult} loading={sending} error={requestLoadError || proxyError} />
        </section>
      </main>

      <StatusBar />
      {palette && <CommandPalette onClose={closePalette} onImportCurl={() => { closePalette(); setImportCurlOpen(true); }} onImportPostman={() => { closePalette(); setImportPostmanOpen(true); }} />}
      {pendingDirtyCloseRequestId && (
        <div className="modal-backdrop" onClick={cancelDirtyClose}>
          <dialog open className="import-dialog" aria-modal="true" aria-label="Unsaved request changes" onClick={(event) => event.stopPropagation()}>
            <form method="dialog" onSubmit={(event) => event.preventDefault()}>
              <div className="section-head"><span>Unsaved changes</span><button type="button" onClick={cancelDirtyClose}>Close</button></div>
              <p role="alert">Save or discard this request before closing its tab.</p>
              <div className="dialog-actions">
                <button className="button button-primary" type="button" onClick={saveDirtyClose} disabled={savingRequest}>{savingRequest ? 'Saving…' : 'Save'}</button>
                <button className="button" type="button" onClick={discardDirtyClose} disabled={savingRequest}>Discard</button>
                <button className="button" type="button" onClick={cancelDirtyClose} disabled={savingRequest}>Cancel</button>
              </div>
            </form>
          </dialog>
        </div>
      )}
      {pendingDirtyAction && (
        <div className="modal-backdrop" onClick={cancelDirtyAction}>
          <dialog open className="import-dialog" aria-modal="true" aria-label="Unsaved request changes" onClick={(event) => event.stopPropagation()}>
            <form method="dialog" onSubmit={(event) => event.preventDefault()}>
              <div className="section-head"><span>Unsaved changes</span><button type="button" onClick={cancelDirtyAction}>Close</button></div>
              <p role="alert">Save or discard open request changes before changing context.</p>
              <div className="dialog-actions">
                <button className="button button-primary" type="button" onClick={saveDirtyAction} disabled={savingRequest}>{savingRequest ? 'Saving…' : 'Save'}</button>
                <button className="button" type="button" onClick={discardDirtyAction} disabled={savingRequest}>Discard</button>
                <button className="button" type="button" onClick={cancelDirtyAction} disabled={savingRequest}>Cancel</button>
              </div>
            </form>
          </dialog>
        </div>
      )}
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
