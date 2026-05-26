import { guestStorageApi } from './guest-storage.js';

const EXPLICIT_GUEST_STORAGE_KEY = 'postboy_explicit_guest';

function useGuestStorage() {
    try {
        return sessionStorage.getItem(EXPLICIT_GUEST_STORAGE_KEY) === 'true';
    } catch (_err) {
        return false;
    }
}

function buildJsonOptions(method, payload) {
    return {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
    };
}

function withCredentials(options) {
    return Object.assign({ credentials: 'include' }, options || {});
}


let csrfToken = null;

function getCsrfTokenFromCookie() {
    var match = document.cookie.match(/(?:^|; )csrftoken=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
}

function isUnsafeMethod(method) {
    return !/^(GET|HEAD|OPTIONS|TRACE)$/i.test(method || 'GET');
}

async function bootstrapCsrfToken() {
    var data = await request('/api/auth/csrf');
    csrfToken = (data && data.csrf_token) || getCsrfTokenFromCookie();
    return csrfToken;
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
    var requestOptions = Object.assign({}, options || {});
    var method = requestOptions.method || 'GET';
    if (isUnsafeMethod(method)) {
        if (!csrfToken) {
            csrfToken = getCsrfTokenFromCookie();
        }
        if (!csrfToken) {
            await bootstrapCsrfToken();
        }
        requestOptions.headers = Object.assign({}, requestOptions.headers || {}, { 'X-CSRFToken': csrfToken });
    }
    return requestJson(path, requestOptions, false);
}

async function requestJson(path, options, allowRawSuccess) {
    var response;
    var json;

    try {
        response = await fetch(path, withCredentials(options));
    } catch (err) {
        throw createApiError(err.message, 0, null);
    }

    try {
        json = await response.json();
    } catch (err) {
        throw createApiError('Invalid JSON response from server', response.status, null);
    }

    if (allowRawSuccess && response.ok && json && json.success === undefined) {
        return json;
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
    login(payload) { return request('/api/auth/login', buildJsonOptions('POST', payload)); },
    logout() { return request('/api/auth/logout', { method: 'POST' }); },
    register(payload) { return request('/api/auth/register', buildJsonOptions('POST', payload)); },
    verifyRecovery(payload) { return request('/api/auth/recover/verify', buildJsonOptions('POST', payload)); },
    resetRecovery(payload) { return request('/api/auth/recover/reset', buildJsonOptions('POST', payload)); },
    getCurrentUser() { return request('/api/auth/me'); },
    getCollections() { return useGuestStorage() ? Promise.resolve(guestStorageApi.getCollections()) : request('/api/collections'); },
    getCollection(id) { return useGuestStorage() ? Promise.resolve(guestStorageApi.getCollection(id)) : request('/api/collections/' + id); },
    reorderCollections(parentId, orderedIds) {
        return useGuestStorage() ? Promise.resolve(guestStorageApi.reorderCollections(parentId, orderedIds)) : request('/api/collections/reorder', buildJsonOptions('PUT', { parent_id: parentId, ordered_ids: orderedIds }));
    },
    updateCollection(id, payload) { return useGuestStorage() ? Promise.resolve(guestStorageApi.updateCollection(id, payload)) : request('/api/collections/' + id, buildJsonOptions('PUT', payload)); },
    createCollection(payload) { return useGuestStorage() ? Promise.resolve(guestStorageApi.createCollection(payload)) : request('/api/collections', buildJsonOptions('POST', payload)); },
    duplicateCollection(id) { return useGuestStorage() ? Promise.resolve(guestStorageApi.duplicateCollection(id)) : request('/api/collections/' + id + '/duplicate', { method: 'POST' }); },
    deleteCollection(id) { return useGuestStorage() ? Promise.resolve(guestStorageApi.deleteCollection(id)) : request('/api/collections/' + id, { method: 'DELETE' }); },
    getCollectionRequests(id) { return useGuestStorage() ? Promise.resolve(guestStorageApi.getCollectionRequests(id)) : request('/api/collections/' + id + '/requests'); },
    reorderRequests(collectionId, orderedIds) {
        return useGuestStorage() ? Promise.resolve(guestStorageApi.reorderRequests(collectionId, orderedIds)) : request('/api/requests/reorder', buildJsonOptions('PUT', { collection_id: collectionId, ordered_ids: orderedIds }));
    },
    moveRequest(id, collectionId) {
        return useGuestStorage() ? Promise.resolve(guestStorageApi.moveRequest(id, collectionId)) : request('/api/requests/' + id + '/move', buildJsonOptions('PUT', { collection_id: collectionId }));
    },
    getRequest(id) { return useGuestStorage() ? Promise.resolve(guestStorageApi.getRequest(id)) : request('/api/requests/' + id); },
    updateRequest(id, payload) { return useGuestStorage() ? Promise.resolve(guestStorageApi.updateRequest(id, payload)) : request('/api/requests/' + id, buildJsonOptions('PUT', payload)); },
    createRequest(payload) { return useGuestStorage() ? Promise.resolve(guestStorageApi.createRequest(payload)) : request('/api/requests', buildJsonOptions('POST', payload)); },
    duplicateRequest(id) { return useGuestStorage() ? Promise.resolve(guestStorageApi.duplicateRequest(id)) : request('/api/requests/' + id + '/duplicate', { method: 'POST' }); },
    deleteRequest(id) { return useGuestStorage() ? Promise.resolve(guestStorageApi.deleteRequest(id)) : request('/api/requests/' + id, { method: 'DELETE' }); },
    getRequestInstances(requestId) { return request('/api/requests/' + requestId + '/instances'); },
    createRequestInstance(requestId, payload) {
        return request('/api/requests/' + requestId + '/instances', buildJsonOptions('POST', payload));
    },
    getRequestInstance(id) { return request('/api/request-instances/' + id); },
    updateRequestInstance(id, payload) { return request('/api/request-instances/' + id, buildJsonOptions('PUT', payload)); },
    deleteRequestInstance(id) { return request('/api/request-instances/' + id, { method: 'DELETE' }); },
    sendProxyRequest(payload) { return requestJson('/api/proxy', buildJsonOptions('POST', payload), true); },
    sendProxy(payload) { return this.sendProxyRequest(payload); },
    importData(payload) { return request('/api/import', buildJsonOptions('POST', payload)); },
    bootstrapCsrfToken() { return bootstrapCsrfToken(); }
};
