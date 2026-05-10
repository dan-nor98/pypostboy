function buildJsonOptions(method, payload) {
    return {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
    };
}

function createApiError(message, status, payload) {
    var err = new Error(message || 'API request failed');
    err.name = 'ApiError';
    err.status = status || 0;
    err.payload = payload || null;
    err.success = false;
    return err;
}

async function request(path, options) {
    var response;
    var json;

    try {
        response = await fetch(path, options);
    } catch (err) {
        throw createApiError(err.message, 0, null);
    }

    try {
        json = await response.json();
    } catch (err) {
        throw createApiError('Invalid JSON response from server', response.status, null);
    }

    if (!response.ok || !json || json.success !== true) {
        throw createApiError(
            (json && (json.error || json.message)) || ('HTTP error! status: ' + response.status),
            response.status,
            json
        );
    }

    return json.data;
}

export const apiClient = {
    getCollections() { return request('/api/collections'); },
    getCollection(id) { return request('/api/collections/' + id); },
    reorderCollections(parentId, orderedIds) {
        return request('/api/collections/reorder', buildJsonOptions('PUT', { parent_id: parentId, ordered_ids: orderedIds }));
    },
    updateCollection(id, payload) { return request('/api/collections/' + id, buildJsonOptions('PUT', payload)); },
    createCollection(payload) { return request('/api/collections', buildJsonOptions('POST', payload)); },
    duplicateCollection(id) { return request('/api/collections/' + id + '/duplicate', { method: 'POST' }); },
    deleteCollection(id) { return request('/api/collections/' + id, { method: 'DELETE' }); },
    getCollectionRequests(id) { return request('/api/collections/' + id + '/requests'); },
    reorderRequests(collectionId, orderedIds) {
        return request('/api/requests/reorder', buildJsonOptions('PUT', { collection_id: collectionId, ordered_ids: orderedIds }));
    },
    getRequest(id) { return request('/api/requests/' + id); },
    updateRequest(id, payload) { return request('/api/requests/' + id, buildJsonOptions('PUT', payload)); },
    createRequest(payload) { return request('/api/requests', buildJsonOptions('POST', payload)); },
    duplicateRequest(id) { return request('/api/requests/' + id + '/duplicate', { method: 'POST' }); },
    deleteRequest(id) { return request('/api/requests/' + id, { method: 'DELETE' }); },
    getRequestInstances(requestId) { return request('/api/requests/' + requestId + '/instances'); },
    createRequestInstance(requestId, payload) {
        return request('/api/requests/' + requestId + '/instances', buildJsonOptions('POST', payload));
    },
    getRequestInstance(id) { return request('/api/request-instances/' + id); },
    updateRequestInstance(id, payload) { return request('/api/request-instances/' + id, buildJsonOptions('PUT', payload)); },
    deleteRequestInstance(id) { return request('/api/request-instances/' + id, { method: 'DELETE' }); },
    sendProxyRequest(payload) { return request('/api/proxy', buildJsonOptions('POST', payload)); },
    sendProxy(payload) { return this.sendProxyRequest(payload); },
    importData(payload) { return request('/api/import', buildJsonOptions('POST', payload)); }
};
