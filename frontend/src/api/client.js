const JSON_HEADERS = {'Content-Type': 'application/json'};

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? JSON_HEADERS : {}),
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
  getCollection: (id) => request(`/api/collections/${id}`),
  createCollection: (data) => request('/api/collections', {method: 'POST', body: JSON.stringify(data)}),
  updateCollection: (id, data) => request(`/api/collections/${id}`, {method: 'PUT', body: JSON.stringify(data)}),
  deleteCollection: (id) => request(`/api/collections/${id}`, {method: 'DELETE'}),
  duplicateCollection: (id) => request(`/api/collections/${id}/duplicate`, {method: 'POST'}),
  reorderCollections: (data) => request('/api/collections/reorder', {method: 'PUT', body: JSON.stringify(data)}),

  getCollectionRequests: (collectionId) => request(`/api/collections/${collectionId}/requests`),
  getRequest: (id) => request(`/api/requests/${id}`),
  createRequest: (data) => request('/api/requests', {method: 'POST', body: JSON.stringify(data)}),
  updateRequest: (id, data) => request(`/api/requests/${id}`, {method: 'PUT', body: JSON.stringify(data)}),
  deleteRequest: (id) => request(`/api/requests/${id}`, {method: 'DELETE'}),
  duplicateRequest: (id) => request(`/api/requests/${id}/duplicate`, {method: 'POST'}),
  moveRequest: (id, collectionId) => request(`/api/requests/${id}/move`, {method: 'PUT', body: JSON.stringify({collection_id: collectionId})}),
  reorderRequests: (data) => request('/api/requests/reorder', {method: 'PUT', body: JSON.stringify(data)}),

  listRequestInstances: (requestId) => request(`/api/requests/${requestId}/instances`),
  createRequestInstance: (requestId, data) => request(`/api/requests/${requestId}/instances`, {method: 'POST', body: JSON.stringify(data)}),
  getRequestInstance: (instanceId) => request(`/api/request-instances/${instanceId}`),
  updateRequestInstance: (instanceId, data) => request(`/api/request-instances/${instanceId}`, {method: 'PUT', body: JSON.stringify(data)}),
  deleteRequestInstance: (instanceId) => request(`/api/request-instances/${instanceId}`, {method: 'DELETE'}),

  importData: (type, data) => request('/api/import', {method: 'POST', body: JSON.stringify({type, data})}),
  proxyRequest: (data) => request('/api/proxy', {method: 'POST', body: JSON.stringify(data)}),
};
