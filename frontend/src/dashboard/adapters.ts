import {
  type AuthData,
  type CollectionNode,
  type HttpMethod,
  type ImportOutcome,
  type ImportPayload,
  type KeyValuePair,
  type PostBoyUser,
  type ProxyRequestPayload,
  type ProxyResponse,
  type RequestDetails,
  type RequestFormField,
  type RequestIdentity,
  type RequestInstance,
  type WorkspaceUserState,
} from './viewModel';

const EXPLICIT_GUEST_STORAGE_KEY = 'postboy_explicit_guest';

type ApiEnvelope<T> = { success?: boolean; data?: T; error?: string; message?: string; warnings?: string[]; errors?: unknown };
type ApiRecord = Record<string, unknown>;

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
const numberValue = (value: unknown, fallback = 0) => (typeof value === 'number' ? value : fallback);
const nullableNumber = (value: unknown) => (typeof value === 'number' ? value : null);

function useGuestStorage() {
  try {
    return window.sessionStorage.getItem(EXPLICIT_GUEST_STORAGE_KEY) === 'true';
  } catch (_err) {
    return false;
  }
}

function buildJsonOptions(method: string, payload?: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  };
}

async function requestJson<T>(path: string, options?: RequestInit, allowRawSuccess = false): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, { credentials: 'include', ...(options ?? {}) });
  } catch (err) {
    throw new ApiError(err instanceof Error ? err.message : 'API request failed', 0, null);
  }

  const rawText = await response.text();
  let json: ApiEnvelope<T> | T | null = null;
  try {
    json = rawText ? JSON.parse(rawText) : null;
  } catch (_err) {
    throw new ApiError('Invalid JSON response from server', response.status, rawText);
  }

  if (allowRawSuccess && response.ok && isRecord(json) && json.success === undefined) {
    return json as T;
  }

  if (!response.ok || !isRecord(json) || json.success !== true) {
    throw new ApiError(
      (isRecord(json) && stringValue(json.error || json.message)) || `HTTP error! status: ${response.status}`,
      response.status,
      json,
    );
  }

  return json.data as T;
}

function guestStorageState() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem('postboy_guest_workspace_v1') || 'null');
    return isRecord(parsed)
      ? { collections: Array.isArray(parsed.collections) ? parsed.collections : [], requests: Array.isArray(parsed.requests) ? parsed.requests : [] }
      : { collections: [], requests: [] };
  } catch (_err) {
    return { collections: [], requests: [] };
  }
}

function buildGuestTree(parentId: number | null): ApiRecord[] {
  const state = guestStorageState();
  return state.collections
    .filter((collection) => isRecord(collection) && (collection.parent_id ?? null) === parentId)
    .sort((a, b) => numberValue((a as ApiRecord).sort_order) - numberValue((b as ApiRecord).sort_order))
    .map((collection) => {
      const record = collection as ApiRecord;
      const id = numberValue(record.id);
      return {
        ...record,
        requests: state.requests.filter((request) => isRecord(request) && request.collection_id === id),
        children: buildGuestTree(id),
      };
    });
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  return requestJson<T>(path, options, false);
}

async function getCollectionsRaw(): Promise<unknown[]> {
  if (useGuestStorage()) return buildGuestTree(null);
  return request<unknown[]>('/api/collections');
}

const normalizePair = (item: unknown): KeyValuePair => {
  if (Array.isArray(item)) {
    return { key: String(item[0] ?? ''), value: String(item[1] ?? ''), enabled: true, description: String(item[2] ?? '') };
  }
  if (!isRecord(item)) return { key: '', value: '', enabled: true };
  return {
    key: String(item.key ?? item.name ?? ''),
    value: String(item.value ?? ''),
    enabled: item.enabled !== false && item.disabled !== true,
    description: item.description === undefined ? undefined : String(item.description),
  };
};

const normalizeFormField = (item: unknown): RequestFormField => {
  const pair = normalizePair(item);
  return isRecord(item)
    ? { ...pair, type: item.type === 'file' ? 'file' : 'text', fileName: item.fileName === undefined ? undefined : String(item.fileName) }
    : pair;
};

const normalizeAuthData = (value: unknown): AuthData => (isRecord(value) ? (value as AuthData) : {});

function normalizeRequestIdentity(raw: unknown, fallbackCollectionId = 0): RequestIdentity {
  const record = isRecord(raw) ? raw : {};
  return {
    id: numberValue(record.id),
    collectionId: numberValue(record.collection_id, fallbackCollectionId),
    name: stringValue(record.name, 'Untitled request'),
    method: stringValue(record.method, 'GET').toUpperCase() as HttpMethod,
    url: stringValue(record.url),
    sortOrder: numberValue(record.sort_order),
    createdAt: optionalString(record.created_at),
    updatedAt: optionalString(record.updated_at),
  };
}

function normalizeRequestDetails(raw: unknown): RequestDetails {
  const record = isRecord(raw) ? raw : {};
  return {
    ...normalizeRequestIdentity(record),
    headers: Array.isArray(record.headers) ? record.headers.map(normalizePair) : [],
    params: Array.isArray(record.params) ? record.params.map(normalizePair) : [],
    bodyType: stringValue(record.body_type, stringValue(record.bodyType, 'none')),
    bodyContent: stringValue(record.body_content, stringValue(record.body, '')),
    bodyRawType: stringValue(record.body_raw_type, 'application/json'),
    formData: Array.isArray(record.form_data) ? record.form_data.map(normalizeFormField) : [],
    authType: stringValue(record.auth_type, 'none'),
    authData: normalizeAuthData(record.auth_data),
    instances: [],
  };
}

function normalizeCollection(raw: unknown): CollectionNode {
  const record = isRecord(raw) ? raw : {};
  const id = numberValue(record.id);
  return {
    id,
    name: stringValue(record.name, 'Untitled collection'),
    description: stringValue(record.description),
    parentId: record.parent_id === null || record.parent_id === undefined ? null : numberValue(record.parent_id),
    sortOrder: numberValue(record.sort_order),
    requests: Array.isArray(record.requests) ? record.requests.map((request) => normalizeRequestIdentity(request, id)) : [],
    children: Array.isArray(record.children) ? record.children.map(normalizeCollection) : [],
    createdAt: optionalString(record.created_at),
    updatedAt: optionalString(record.updated_at),
  };
}

function normalizeInstance(raw: unknown): RequestInstance {
  const record = isRecord(raw) ? raw : {};
  const request = normalizeRequestDetails(record);
  return {
    ...request,
    requestId: numberValue(record.request_id, request.id),
    responseStatus: nullableNumber(record.response_status),
    responseStatusText: stringValue(record.response_status_text),
    responseHeaders: isRecord(record.response_headers) ? Object.fromEntries(Object.entries(record.response_headers).map(([key, value]) => [key, String(value)])) : stringValue(record.response_headers),
    responseBody: record.response_body ?? null,
    responseTimeMs: nullableNumber(record.response_time_ms),
    responseSize: typeof record.response_size === 'number' || typeof record.response_size === 'string' ? record.response_size : null,
  };
}

function normalizeUser(raw: unknown): WorkspaceUserState {
  if (!isRecord(raw) || raw.id === null || raw.id === undefined) {
    return { mode: useGuestStorage() ? 'guest' : 'anonymous', user: null, reason: 'No active user session' };
  }
  const user: PostBoyUser = {
    id: numberValue(raw.id, null as unknown as number),
    username: stringValue(raw.username, 'Guest'),
    email: raw.email === null || raw.email === undefined ? null : String(raw.email),
    authProvider: raw.auth_provider === null || raw.auth_provider === undefined ? null : String(raw.auth_provider),
    isGuest: raw.is_guest === true,
  };
  return { mode: user.isGuest ? 'guest' : 'authenticated', user };
}

function normalizeProxyResponse(raw: unknown): ProxyResponse {
  const record = isRecord(raw) ? raw : {};
  return {
    status: numberValue(record.status),
    statusText: stringValue(record.statusText),
    headers: isRecord(record.headers) ? Object.fromEntries(Object.entries(record.headers).map(([key, value]) => [key, String(value)])) : {},
    body: record.body ?? null,
    responseTimeMs: nullableNumber(record.responseTimeMs) ?? nullableNumber(record.time) ?? undefined,
    responseSize: typeof record.responseSize === 'number' || typeof record.responseSize === 'string' ? record.responseSize : undefined,
    error: record.error === undefined ? undefined : String(record.error),
  };
}

function normalizeImportOutcome(type: ImportPayload['type'], raw: unknown): ImportOutcome {
  if (type === 'postman') return { type, collection: normalizeCollection(raw), warnings: [] };
  if (type === 'curl') return { type, request: normalizeRequestDetails(raw), warnings: [] };
  return { type, raw, warnings: [] };
}

export async function loadWorkspaceUser(): Promise<WorkspaceUserState> {
  try {
    return normalizeUser(await request('/api/auth/me'));
  } catch (err) {
    return { mode: useGuestStorage() ? 'guest' : 'anonymous', user: null, reason: err instanceof Error ? err.message : 'Unable to load current user' };
  }
}

export async function loadCollections(): Promise<CollectionNode[]> {
  return (await getCollectionsRaw()).map(normalizeCollection);
}

export async function loadRequestDetails(requestId: number): Promise<RequestDetails> {
  const raw = useGuestStorage() ? guestStorageState().requests.find((request) => isRecord(request) && request.id === requestId) : await request(`/api/requests/${requestId}`);
  const details = normalizeRequestDetails(raw);
  details.instances = await loadResponseHistory(requestId);
  return details;
}

export async function loadResponseHistory(requestId: number): Promise<RequestInstance[]> {
  if (useGuestStorage()) return [];
  return (await request<unknown[]>(`/api/requests/${requestId}/instances`)).map(normalizeInstance);
}

export async function sendProxyRequest(payload: ProxyRequestPayload): Promise<ProxyResponse> {
  return normalizeProxyResponse(await requestJson('/client-proxy', buildJsonOptions('POST', payload), true));
}

export async function importWorkspaceData(payload: ImportPayload): Promise<ImportOutcome> {
  return normalizeImportOutcome(payload.type, await request('/api/import', buildJsonOptions('POST', payload)));
}

export function flattenCollections(collections: CollectionNode[]): CollectionNode[] {
  return collections.flatMap((collection) => [collection, ...flattenCollections(collection.children)]);
}

export function firstRequestInCollections(collections: CollectionNode[]): RequestIdentity | null {
  for (const collection of collections) {
    if (collection.requests.length > 0) return collection.requests[0];
    const childRequest = firstRequestInCollections(collection.children);
    if (childRequest) return childRequest;
  }
  return null;
}

export function headersToProxyMap(headers: KeyValuePair[]): Record<string, string> {
  return Object.fromEntries(headers.filter((header) => header.enabled && header.key).map((header) => [header.key, header.value]));
}
