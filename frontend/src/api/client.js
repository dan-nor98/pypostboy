const JSON_HEADERS = {'Content-Type': 'application/json'};

function readCookie(name) {
  return document.cookie
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1) || '';
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? JSON_HEADERS : {}),
      ...(options.body ? {'X-CSRFToken': readCookie('csrftoken')} : {}),
      ...options.headers,
    },
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = payload && typeof payload === 'object' ? payload.error || payload.message : payload;
    const error = new Error(message || `Request failed with status ${response.status}`);
    if (payload && typeof payload === 'object') {
      error.errors = payload.errors || [];
      error.warnings = payload.warnings || [];
      error.conflict = payload.conflict;
      error.status = response.status;
    }
    throw error;
  }

  if (payload && typeof payload === 'object' && payload.success === true && 'data' in payload) {
    return payload.data;
  }

  return payload;
}

export const apiClient = {
  listCollections: () => request('/api/collections'),
  getSyncStatus: () => request('/api/sync/status'),
  getRuntimeStatus: () => request('/api/runtime/status'),
  retrySync: () => request('/api/sync/retry', {method: 'POST'}),
  getCollection: (id) => request(`/api/collections/${id}`),
  createCollection: (data) => request('/api/collections', {method: 'POST', body: JSON.stringify(data)}),
  updateCollection: (id, data) => request(`/api/collections/${id}`, {method: 'PUT', body: JSON.stringify(data)}),
  deleteCollection: (id) => request(`/api/collections/${id}`, {method: 'DELETE'}),
  duplicateCollection: (id) => request(`/api/collections/${id}/duplicate`, {method: 'POST'}),
  exportCollection: (id) => request(`/api/collections/${id}/export`),
  reorderCollections: (data) => request('/api/collections/reorder', {method: 'PUT', body: JSON.stringify(data)}),

  getCollectionRequests: (collectionId) => request(`/api/collections/${collectionId}/requests`),
  getRequest: (id) => request(`/api/requests/${id}`),
  createRequest: (data) => request('/api/requests', {method: 'POST', body: JSON.stringify(data)}),
  updateRequest: (id, data) => request(`/api/requests/${id}`, {method: 'PUT', body: JSON.stringify(data)}),
  deleteRequest: (id) => request(`/api/requests/${id}`, {method: 'DELETE'}),
  duplicateRequest: (id) => request(`/api/requests/${id}/duplicate`, {method: 'POST'}),
  exportRequestCurl: (id) => request(`/api/requests/${id}/export/curl`),
  moveRequest: (id, collectionId) => request(`/api/requests/${id}/move`, {method: 'PUT', body: JSON.stringify({collection_id: collectionId})}),
  reorderRequests: (data) => request('/api/requests/reorder', {method: 'PUT', body: JSON.stringify(data)}),

  listRequestInstances: (requestId) => request(`/api/requests/${requestId}/instances`),
  createRequestInstance: (requestId, data) => request(`/api/requests/${requestId}/instances`, {method: 'POST', body: JSON.stringify(data)}),
  getRequestInstance: (instanceId) => request(`/api/request-instances/${instanceId}`),
  updateRequestInstance: (instanceId, data) => request(`/api/request-instances/${instanceId}`, {method: 'PUT', body: JSON.stringify(data)}),
  deleteRequestInstance: (instanceId) => request(`/api/request-instances/${instanceId}`, {method: 'DELETE'}),

  importData: (type, data) => request('/api/import', {method: 'POST', body: JSON.stringify({type, data})}),
  proxyRequest: (data) => request('/api/proxy', {method: 'POST', body: JSON.stringify(data)}),

  getCsrf: () => request('/api/auth/csrf'),
  currentUser: () => request('/api/auth/me'),
  login: (data) => request('/api/auth/login', {method: 'POST', body: JSON.stringify(data)}),
  register: (data) => request('/api/auth/register', {method: 'POST', body: JSON.stringify(data)}),
  recoverVerify: (data) => request('/api/auth/recover/verify', {method: 'POST', body: JSON.stringify(data)}),
  recoverReset: (data) => request('/api/auth/recover/reset', {method: 'POST', body: JSON.stringify(data)}),
  logout: () => request('/api/auth/logout', {method: 'POST'}),
};
