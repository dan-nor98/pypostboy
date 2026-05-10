function request(path, options) {
    return fetch(path, options);
}

export const apiClient = {
    getCollections() { return request('/api/collections'); },
    reorderCollections(parentId, orderedIds) {
        return request('/api/collections/reorder', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ parent_id: parentId, ordered_ids: orderedIds })
        });
    },
    updateCollection(id, payload) {
        return request('/api/collections/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },
    createCollection(payload) {
        return request('/api/collections', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },
    duplicateCollection(id) { return request('/api/collections/' + id + '/duplicate', { method: 'POST' }); },
    deleteCollection(id) { return request('/api/collections/' + id, { method: 'DELETE' }); },
    reorderRequests(collectionId, orderedIds) {
        return request('/api/requests/reorder', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collection_id: collectionId, ordered_ids: orderedIds })
        });
    },
    updateRequest(id, payload) {
        return request('/api/requests/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },
    createRequest(payload) {
        return request('/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },
    duplicateRequest(id) { return request('/api/requests/' + id + '/duplicate', { method: 'POST' }); },
    deleteRequest(id) { return request('/api/requests/' + id, { method: 'DELETE' }); },
    getRequestInstances(requestId) { return request('/api/requests/' + requestId + '/instances'); },
    createRequestInstance(requestId, payload) {
        return request('/api/requests/' + requestId + '/instances', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },
    getRequestInstance(id) { return request('/api/request-instances/' + id); },
    updateRequestInstance(id, payload) {
        return request('/api/request-instances/' + id, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },
    deleteRequestInstance(id) { return request('/api/request-instances/' + id, { method: 'DELETE' }); },
    sendProxy(payload) {
        return request('/api/proxy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    },
    importData(payload) {
        return request('/api/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
    }
};
