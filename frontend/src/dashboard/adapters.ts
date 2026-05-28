import type {
  AuthData,
  CollectionNode,
  HttpMethod,
  ImportOutcome,
  ImportPayload,
  KeyValuePair,
  PostBoyUser,
  ProxyRequestPayload,
  ProxyResponse,
  RequestDetails,
  RequestFormField,
  RequestIdentity,
  RequestInstance,
  WorkspaceUserState,
} from './viewModel';

const EXPLICIT_GUEST_STORAGE_KEY = 'postboy_explicit_guest';
const GUEST_WORKSPACE_KEY = 'postboy_guest_workspace_v1';
const THEME_STORAGE_KEY = 'postboy_theme';
const SIDEBAR_WIDTH_KEY = 'postboy_sidebar_width';
const RIGHT_SIDEBAR_WIDTH_KEY = 'postboy_right_sidebar_width';
const RESPONSE_HEIGHT_KEY = 'postboy_response_height';
const SIDEBAR_COLLAPSED_KEY = 'postboy_sidebar_collapsed';
const RIGHT_SIDEBAR_COLLAPSED_KEY = 'postboy_right_sidebar_collapsed';

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string; message?: string; warnings?: string[]; errors?: unknown };
type ApiRecord = Record<string, unknown>;
type GuestState = { nextCollectionId: number; nextRequestId: number; nextRequestInstanceId: number; collections: ApiRecord[]; requests: ApiRecord[]; requestInstances: ApiRecord[] };

class ApiError extends Error {
  status: number;
  payload: unknown;
  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

const isRecord = (value: unknown): value is ApiRecord => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const stringValue = (value: unknown, fallback = '') => (typeof value === 'string' ? value : fallback);
const optionalString = (value: unknown) => (typeof value === 'string' ? value : undefined);
const numberValue = (value: unknown, fallback = 0) => (typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) || fallback : fallback);
const nullableNumber = (value: unknown) => (typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) || null : null);
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const nowIso = () => new Date().toISOString();

export function useGuestStorage() {
  try { return window.sessionStorage.getItem(EXPLICIT_GUEST_STORAGE_KEY) === 'true'; } catch (_err) { return false; }
}

export function setExplicitGuestSession(enabled: boolean) {
  try {
    if (enabled) window.sessionStorage.setItem(EXPLICIT_GUEST_STORAGE_KEY, 'true');
    else window.sessionStorage.removeItem(EXPLICIT_GUEST_STORAGE_KEY);
  } catch (_err) { /* ignore restricted storage */ }
}

function getCsrfTokenFromCookie() {
  const match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

let csrfToken: string | null = null;
function isUnsafeMethod(method = 'GET') { return !/^(GET|HEAD|OPTIONS|TRACE)$/i.test(method); }

function buildJsonOptions(method: string, payload?: unknown): RequestInit {
  return { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload ?? {}) };
}

async function requestJson<T>(path: string, options?: RequestInit, allowRawSuccess = false): Promise<T> {
  const requestOptions: RequestInit = { ...(options ?? {}) };
  const method = requestOptions.method || 'GET';
  if (isUnsafeMethod(method)) {
    csrfToken = csrfToken || getCsrfTokenFromCookie();
    if (!csrfToken && path !== '/api/auth/csrf') {
      try { csrfToken = (await requestJson<{ csrf_token?: string }>('/api/auth/csrf')).csrf_token || getCsrfTokenFromCookie(); } catch (_err) { csrfToken = getCsrfTokenFromCookie(); }
    }
    if (csrfToken) requestOptions.headers = { ...(requestOptions.headers ?? {}), 'X-CSRFToken': csrfToken };
  }

  let response: Response;
  try { response = await fetch(path, { credentials: 'include', ...requestOptions }); }
  catch (err) { throw new ApiError(err instanceof Error ? err.message : 'API request failed', 0, null); }

  const rawText = await response.text();
  let json: ApiEnvelope<T> | T | null = null;
  try { json = rawText ? JSON.parse(rawText) : null; }
  catch (_err) { throw new ApiError('Invalid JSON response from server', response.status, rawText); }

  if (allowRawSuccess && response.ok && isRecord(json) && json.success === undefined) return json as T;
  if (!response.ok || !isRecord(json) || json.success !== true) {
    throw new ApiError((isRecord(json) && stringValue(json.error || json.message)) || `HTTP error! status: ${response.status}`, response.status, json);
  }
  return json.data as T;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> { return requestJson<T>(path, options, false); }

function defaultGuestState(): GuestState { return { nextCollectionId: 1, nextRequestId: 1, nextRequestInstanceId: 1, collections: [], requests: [], requestInstances: [] }; }
function loadGuestState(): GuestState {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUEST_WORKSPACE_KEY) || 'null');
    return isRecord(parsed) ? { ...defaultGuestState(), ...parsed, collections: Array.isArray(parsed.collections) ? parsed.collections as ApiRecord[] : [], requests: Array.isArray(parsed.requests) ? parsed.requests as ApiRecord[] : [], requestInstances: Array.isArray(parsed.requestInstances) ? parsed.requestInstances as ApiRecord[] : [] } : defaultGuestState();
  } catch (_err) { return defaultGuestState(); }
}
function saveGuestState(state: GuestState) { window.localStorage.setItem(GUEST_WORKSPACE_KEY, JSON.stringify(state)); }
function ensureCollection(state: GuestState, id: number) { const found = state.collections.find((c) => numberValue(c.id) === id); if (!found) throw new Error('Collection not found'); return found; }
function ensureRequest(state: GuestState, id: number) { const found = state.requests.find((r) => numberValue(r.id) === id); if (!found) throw new Error('Request not found'); return found; }

function buildGuestTree(parentId: number | null, state = loadGuestState()): ApiRecord[] {
  return state.collections
    .filter((collection) => (collection.parent_id ?? null) === parentId)
    .sort((a, b) => numberValue(a.sort_order) - numberValue(b.sort_order) || numberValue(a.id) - numberValue(b.id))
    .map((collection) => ({ ...collection, requests: state.requests.filter((request) => numberValue(request.collection_id) === numberValue(collection.id)).sort((a, b) => numberValue(a.sort_order) - numberValue(b.sort_order)), children: buildGuestTree(numberValue(collection.id), state) }));
}

function deleteGuestCollectionRecursive(state: GuestState, id: number) {
  state.collections.filter((collection) => numberValue(collection.parent_id) === id).forEach((child) => deleteGuestCollectionRecursive(state, numberValue(child.id)));
  const requestIds = state.requests.filter((requestItem) => numberValue(requestItem.collection_id) === id).map((requestItem) => numberValue(requestItem.id));
  state.requestInstances = state.requestInstances.filter((instance) => !requestIds.includes(numberValue(instance.request_id)));
  state.requests = state.requests.filter((requestItem) => numberValue(requestItem.collection_id) !== id);
  state.collections = state.collections.filter((collection) => numberValue(collection.id) !== id);
}

function duplicateGuestCollectionRecursive(state: GuestState, sourceId: number, targetParentId: number | null) {
  const source = ensureCollection(state, sourceId);
  const newId = state.nextCollectionId++;
  const timestamp = nowIso();
  const copy = { ...source, id: newId, parent_id: targetParentId, name: `${stringValue(source.name, 'Collection')} (copy)`, created_at: timestamp, updated_at: timestamp };
  state.collections.push(copy);
  state.requests.filter((requestItem) => numberValue(requestItem.collection_id) === sourceId).forEach((requestItem) => {
    state.requests.push({ ...requestItem, id: state.nextRequestId++, collection_id: newId, created_at: timestamp, updated_at: timestamp });
  });
  state.collections.filter((collection) => numberValue(collection.parent_id) === sourceId).forEach((child) => duplicateGuestCollectionRecursive(state, numberValue(child.id), newId));
  return copy;
}

const normalizePair = (item: unknown): KeyValuePair => {
  if (Array.isArray(item)) return { key: String(item[0] ?? ''), value: String(item[1] ?? ''), enabled: true, description: String(item[2] ?? '') };
  if (!isRecord(item)) return { key: '', value: '', enabled: true };
  return { key: String(item.key ?? item.name ?? ''), value: String(item.value ?? ''), enabled: item.enabled !== false && item.disabled !== true, description: item.description === undefined ? undefined : String(item.description) };
};
const normalizeFormField = (item: unknown): RequestFormField => isRecord(item) ? { ...normalizePair(item), type: item.type === 'file' ? 'file' : 'text', fileName: item.fileName === undefined ? undefined : String(item.fileName) } : normalizePair(item);
const normalizeAuthData = (value: unknown): AuthData => (isRecord(value) ? value as AuthData : {});

export function normalizeRequestIdentity(raw: unknown, fallbackCollectionId = 0): RequestIdentity {
  const record = isRecord(raw) ? raw : {};
  return { id: numberValue(record.id), collectionId: numberValue(record.collection_id, fallbackCollectionId), name: stringValue(record.name, 'Untitled request'), method: stringValue(record.method, 'GET').toUpperCase() as HttpMethod, url: stringValue(record.url), sortOrder: numberValue(record.sort_order), createdAt: optionalString(record.created_at), updatedAt: optionalString(record.updated_at) };
}

export function normalizeRequestDetails(raw: unknown): RequestDetails {
  const record = isRecord(raw) ? raw : {};
  return { ...normalizeRequestIdentity(record), headers: Array.isArray(record.headers) ? record.headers.map(normalizePair) : [], params: Array.isArray(record.params) ? record.params.map(normalizePair) : [], bodyType: stringValue(record.body_type, stringValue(record.bodyType, 'none')), bodyContent: stringValue(record.body_content, stringValue(record.body, '')), bodyRawType: stringValue(record.body_raw_type, 'application/json'), formData: Array.isArray(record.form_data) ? record.form_data.map(normalizeFormField) : [], authType: stringValue(record.auth_type, 'none'), authData: normalizeAuthData(record.auth_data ?? record.auth_config), instances: [] };
}

export function normalizeCollection(raw: unknown): CollectionNode {
  const record = isRecord(raw) ? raw : {};
  const id = numberValue(record.id);
  return { id, name: stringValue(record.name, 'Untitled collection'), description: stringValue(record.description), parentId: record.parent_id === null || record.parent_id === undefined ? null : numberValue(record.parent_id), sortOrder: numberValue(record.sort_order), requests: Array.isArray(record.requests) ? record.requests.map((r) => normalizeRequestIdentity(r, id)) : [], children: Array.isArray(record.children) ? record.children.map(normalizeCollection) : [], createdAt: optionalString(record.created_at), updatedAt: optionalString(record.updated_at) };
}

function normalizeInstance(raw: unknown): RequestInstance {
  const record = isRecord(raw) ? raw : {};
  const requestDetails = normalizeRequestDetails(record);
  return { ...requestDetails, requestId: numberValue(record.request_id, requestDetails.id), responseStatus: nullableNumber(record.response_status), responseStatusText: stringValue(record.response_status_text), responseHeaders: isRecord(record.response_headers) ? Object.fromEntries(Object.entries(record.response_headers).map(([key, value]) => [key, String(value)])) : stringValue(record.response_headers), responseBody: record.response_body ?? null, responseTimeMs: nullableNumber(record.response_time_ms), responseSize: typeof record.response_size === 'number' || typeof record.response_size === 'string' ? record.response_size : null };
}

function normalizeUser(raw: unknown): WorkspaceUserState {
  if (!isRecord(raw) || raw.id === null || raw.id === undefined) return { mode: useGuestStorage() ? 'guest' : 'anonymous', user: useGuestStorage() ? { id: null, username: 'Guest', email: null, authProvider: null, isGuest: true } : null, reason: 'No active user session' } as WorkspaceUserState;
  const user: PostBoyUser = { id: numberValue(raw.id, null as unknown as number), username: stringValue(raw.username, 'Guest'), email: raw.email == null ? null : String(raw.email), authProvider: raw.auth_provider == null ? null : String(raw.auth_provider), isGuest: raw.is_guest === true };
  return { mode: user.isGuest ? 'guest' : 'authenticated', user };
}

function normalizeProxyResponse(raw: unknown): ProxyResponse {
  const record = isRecord(raw) ? raw : {};
  return { status: numberValue(record.status), statusText: stringValue(record.statusText, stringValue(record.status_text)), headers: isRecord(record.headers) ? Object.fromEntries(Object.entries(record.headers).map(([key, value]) => [key, String(value)])) : {}, body: record.body ?? null, responseTimeMs: nullableNumber(record.responseTimeMs) ?? nullableNumber(record.response_time_ms) ?? nullableNumber(record.time) ?? undefined, responseSize: typeof record.responseSize === 'number' || typeof record.responseSize === 'string' ? record.responseSize : typeof record.response_size === 'number' || typeof record.response_size === 'string' ? record.response_size : undefined, error: record.error === undefined ? undefined : String(record.error) };
}

function normalizeImportOutcome(type: ImportPayload['type'], raw: unknown): ImportOutcome {
  if (type === 'postman') return { type, collection: normalizeCollection(raw), warnings: [] };
  if (type === 'curl') return { type, request: normalizeRequestDetails(raw), warnings: [] };
  return { type, raw, warnings: [] };
}

export async function login(payload: { username: string; password: string }): Promise<WorkspaceUserState> { setExplicitGuestSession(false); return normalizeUser(await request('/api/auth/login', buildJsonOptions('POST', payload))); }
export async function register(payload: { username: string; password: string; email?: string }): Promise<{ workspace: WorkspaceUserState; recoveryKey?: string }> {
  setExplicitGuestSession(false);
  const result = await request<unknown>('/api/auth/register', buildJsonOptions('POST', payload));
  const record = isRecord(result) ? result : {};
  return { workspace: normalizeUser(record.user), recoveryKey: stringValue(record.recovery_key) || undefined };
}
export async function logout(): Promise<WorkspaceUserState> { setExplicitGuestSession(false); try { await request('/api/auth/logout', { method: 'POST' }); } catch (_err) { /* still clear local state */ } return { mode: 'anonymous', user: null }; }
export async function continueAsGuest(): Promise<WorkspaceUserState> { setExplicitGuestSession(true); return { mode: 'guest', user: { id: null, username: 'Guest', email: null, authProvider: null, isGuest: true } }; }
export async function loadWorkspaceUser(): Promise<WorkspaceUserState> { try { return normalizeUser(await request('/api/auth/me')); } catch (err) { return { mode: useGuestStorage() ? 'guest' : 'anonymous', user: useGuestStorage() ? { id: null, username: 'Guest', email: null, authProvider: null, isGuest: true } : null, reason: err instanceof Error ? err.message : 'Unable to load current user' } as WorkspaceUserState; } }

export async function loadCollections(): Promise<CollectionNode[]> { const raw = useGuestStorage() ? buildGuestTree(null) : await request<unknown[]>('/api/collections'); return raw.map(normalizeCollection); }
export async function createCollection(payload: { name: string; description?: string; parent_id?: number | null }): Promise<CollectionNode> {
  if (!useGuestStorage()) return normalizeCollection(await request('/api/collections', buildJsonOptions('POST', payload)));
  const state = loadGuestState(); const id = state.nextCollectionId++; const timestamp = nowIso(); const parentId = payload.parent_id == null ? null : Number(payload.parent_id); const siblings = state.collections.filter((c) => (c.parent_id ?? null) === parentId);
  const collection = { id, user_id: null, name: payload.name, description: payload.description || '', parent_id: parentId, sort_order: siblings.length, created_at: timestamp, updated_at: timestamp };
  state.collections.push(collection); saveGuestState(state); return normalizeCollection({ ...collection, requests: [], children: [] });
}
export async function updateCollection(id: number, payload: { name?: string; description?: string; parent_id?: number | null }): Promise<CollectionNode> {
  if (!useGuestStorage()) return normalizeCollection(await request(`/api/collections/${id}`, buildJsonOptions('PUT', payload)));
  const state = loadGuestState(); const collection = ensureCollection(state, id); Object.assign(collection, payload, { updated_at: nowIso() }); if (payload.parent_id !== undefined) collection.parent_id = payload.parent_id == null ? null : Number(payload.parent_id); saveGuestState(state); return normalizeCollection(collection);
}
export async function duplicateCollection(id: number): Promise<CollectionNode> { if (!useGuestStorage()) return normalizeCollection(await request(`/api/collections/${id}/duplicate`, { method: 'POST' })); const state = loadGuestState(); const source = ensureCollection(state, id); const dup = duplicateGuestCollectionRecursive(state, id, source.parent_id == null ? null : numberValue(source.parent_id)); saveGuestState(state); return normalizeCollection(dup); }
export async function deleteCollection(id: number): Promise<void> { if (!useGuestStorage()) { await request(`/api/collections/${id}`, { method: 'DELETE' }); return; } const state = loadGuestState(); deleteGuestCollectionRecursive(state, id); saveGuestState(state); }
export async function reorderCollections(parentId: number | null, orderedIds: number[]): Promise<void> { if (!useGuestStorage()) { await request('/api/collections/reorder', buildJsonOptions('PUT', { parent_id: parentId, ordered_ids: orderedIds })); return; } const state = loadGuestState(); orderedIds.forEach((id, index) => { const c = ensureCollection(state, id); c.parent_id = parentId; c.sort_order = index; c.updated_at = nowIso(); }); saveGuestState(state); }

function requestPayloadFromDetails(details: RequestDetails) { return { name: details.name, method: details.method, url: details.url, headers: details.headers, params: details.params, body_type: details.bodyType, body_content: details.bodyContent, body_raw_type: details.bodyRawType, form_data: details.formData, auth_type: details.authType, auth_data: details.authData, collection_id: details.collectionId }; }
export async function createRequest(payload: Partial<RequestDetails> & { collectionId: number }): Promise<RequestDetails> {
  const apiPayload = { name: payload.name || 'Untitled request', method: payload.method || 'GET', url: payload.url || '', headers: payload.headers || [], params: payload.params || [], body_type: payload.bodyType || 'none', body_content: payload.bodyContent || '', body_raw_type: payload.bodyRawType || 'application/json', form_data: payload.formData || [], auth_type: payload.authType || 'none', auth_data: payload.authData || {}, collection_id: payload.collectionId };
  if (!useGuestStorage()) return normalizeRequestDetails(await request('/api/requests', buildJsonOptions('POST', apiPayload)));
  const state = loadGuestState(); ensureCollection(state, payload.collectionId); const id = state.nextRequestId++; const timestamp = nowIso(); const siblings = state.requests.filter((r) => numberValue(r.collection_id) === payload.collectionId); const created = { ...apiPayload, id, sort_order: siblings.length, created_at: timestamp, updated_at: timestamp };
  state.requests.push(created); saveGuestState(state); return normalizeRequestDetails(created);
}
export async function loadRequestDetails(requestId: number): Promise<RequestDetails> { const raw = useGuestStorage() ? ensureRequest(loadGuestState(), requestId) : await request(`/api/requests/${requestId}`); const details = normalizeRequestDetails(raw); details.instances = await loadResponseHistory(requestId); return details; }
export async function updateRequest(details: RequestDetails): Promise<RequestDetails> { if (!useGuestStorage()) return normalizeRequestDetails(await request(`/api/requests/${details.id}`, buildJsonOptions('PUT', requestPayloadFromDetails(details)))); const state = loadGuestState(); const requestItem = ensureRequest(state, details.id); Object.assign(requestItem, requestPayloadFromDetails(details), { collection_id: details.collectionId, updated_at: nowIso() }); saveGuestState(state); return normalizeRequestDetails(requestItem); }
export async function duplicateRequest(id: number): Promise<RequestDetails> { if (!useGuestStorage()) return normalizeRequestDetails(await request(`/api/requests/${id}/duplicate`, { method: 'POST' })); const state = loadGuestState(); const requestItem = ensureRequest(state, id); const timestamp = nowIso(); const duplicate = { ...requestItem, id: state.nextRequestId++, name: `${stringValue(requestItem.name, 'Request')} (copy)`, created_at: timestamp, updated_at: timestamp }; state.requests.push(duplicate); saveGuestState(state); return normalizeRequestDetails(duplicate); }
export async function deleteRequest(id: number): Promise<void> { if (!useGuestStorage()) { await request(`/api/requests/${id}`, { method: 'DELETE' }); return; } const state = loadGuestState(); state.requests = state.requests.filter((requestItem) => numberValue(requestItem.id) !== id); state.requestInstances = state.requestInstances.filter((instance) => numberValue(instance.request_id) !== id); saveGuestState(state); }
export async function reorderRequests(collectionId: number, orderedIds: number[]): Promise<void> { if (!useGuestStorage()) { await request('/api/requests/reorder', buildJsonOptions('PUT', { collection_id: collectionId, ordered_ids: orderedIds })); return; } const state = loadGuestState(); orderedIds.forEach((id, index) => { const r = ensureRequest(state, id); r.collection_id = collectionId; r.sort_order = index; r.updated_at = nowIso(); }); saveGuestState(state); }

export async function loadResponseHistory(requestId: number): Promise<RequestInstance[]> { if (useGuestStorage()) return []; return (await request<unknown[]>(`/api/requests/${requestId}/instances`)).map(normalizeInstance); }
export async function createRequestInstance(requestId: number, payload: Partial<RequestInstance>): Promise<RequestInstance> { return normalizeInstance(await request(`/api/requests/${requestId}/instances`, buildJsonOptions('POST', payload))); }
export async function deleteRequestInstance(id: number): Promise<void> { await request(`/api/request-instances/${id}`, { method: 'DELETE' }); }

export async function sendProxyRequest(payload: ProxyRequestPayload): Promise<ProxyResponse> {
  const desktopApi = (window as Window & { postboyDesktop?: { executeRequest?: (payload: ProxyRequestPayload) => Promise<unknown> } }).postboyDesktop;
  if (desktopApi && typeof desktopApi.executeRequest === 'function') return normalizeProxyResponse(await desktopApi.executeRequest(payload));
  return normalizeProxyResponse(await requestJson('/client-proxy', buildJsonOptions('POST', payload), true));
}
export async function importWorkspaceData(payload: ImportPayload): Promise<ImportOutcome> { return normalizeImportOutcome(payload.type, await request('/api/import', buildJsonOptions('POST', payload))); }

export function flattenCollections(collections: CollectionNode[]): CollectionNode[] { return collections.flatMap((collection) => [collection, ...flattenCollections(collection.children)]); }
export function firstRequestInCollections(collections: CollectionNode[]): RequestIdentity | null { for (const collection of collections) { if (collection.requests.length > 0) return collection.requests[0]; const child = firstRequestInCollections(collection.children); if (child) return child; } return null; }
export function headersToProxyMap(headers: KeyValuePair[]): Record<string, string> { return Object.fromEntries(headers.filter((header) => header.enabled && header.key).map((header) => [header.key, header.value])); }

export function loadThemePreference() { try { return localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : localStorage.getItem(THEME_STORAGE_KEY) === 'dark' ? 'dark' : (window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); } catch (_err) { return 'dark'; } }
export function saveThemePreference(theme: 'light' | 'dark') { localStorage.setItem(THEME_STORAGE_KEY, theme); }
export function loadPanelState() { return { sidebar: parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY) || '', 10), rightSidebar: parseInt(localStorage.getItem(RIGHT_SIDEBAR_WIDTH_KEY) || '', 10), response: parseInt(localStorage.getItem(RESPONSE_HEIGHT_KEY) || '', 10), sidebarCollapsed: localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true', rightSidebarCollapsed: localStorage.getItem(RIGHT_SIDEBAR_COLLAPSED_KEY) === 'true' }; }
export function savePanelSize(panel: 'sidebar' | 'rightSidebar' | 'response', value: number) { localStorage.setItem(panel === 'sidebar' ? SIDEBAR_WIDTH_KEY : panel === 'rightSidebar' ? RIGHT_SIDEBAR_WIDTH_KEY : RESPONSE_HEIGHT_KEY, String(Math.round(value))); }
export function savePanelCollapsedState(panel: 'sidebar' | 'rightSidebar', collapsed: boolean) { localStorage.setItem(panel === 'sidebar' ? SIDEBAR_COLLAPSED_KEY : RIGHT_SIDEBAR_COLLAPSED_KEY, collapsed ? 'true' : 'false'); }
