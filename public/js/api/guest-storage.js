const STORAGE_KEY = 'postboy_guest_workspace_v1';
const REDACTED_VALUE = '[redacted]';
const SENSITIVE_HEADER_NAMES = new Set(['authorization', 'cookie', 'x-api-key', 'x-api-token', 'api-key', 'apikey', 'proxy-authorization']);
const SENSITIVE_AUTH_KEYS = new Set(['password', 'token', 'access_token', 'refresh_token', 'bearer_token', 'bearertoken', 'bearer-token', 'api_key', 'apikey', 'api-key', 'secret', 'client_secret', 'clientsecret']);

function nowIso() { return new Date().toISOString(); }
function clone(v) { return JSON.parse(JSON.stringify(v)); }

function defaultState() {
  return { nextCollectionId: 1, nextRequestId: 1, nextRequestInstanceId: 1, collections: [], requests: [], requestInstances: [] };
}

function load() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return defaultState();
    return Object.assign(defaultState(), parsed);
  } catch (_e) { return defaultState(); }
}
function save(state) { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

function isSensitiveHeaderName(name) {
  return SENSITIVE_HEADER_NAMES.has(String(name || '').trim().toLowerCase());
}

function sanitizeHeaders(headers) {
  if (Array.isArray(headers)) {
    return headers.map(header => {
      const copy = { ...header };
      const name = copy.key !== undefined ? copy.key : copy.name;
      if (isSensitiveHeaderName(name)) copy.value = REDACTED_VALUE;
      return copy;
    });
  }
  if (headers && typeof headers === 'object') {
    return Object.keys(headers).reduce((safe, name) => {
      safe[name] = isSensitiveHeaderName(name) ? REDACTED_VALUE : headers[name];
      return safe;
    }, {});
  }
  return headers || [];
}

function sanitizeAuthConfig(authConfig) {
  if (!authConfig || typeof authConfig !== 'object' || Array.isArray(authConfig)) return {};
  return Object.keys(authConfig).reduce((safe, key) => {
    safe[key] = SENSITIVE_AUTH_KEYS.has(String(key).trim().toLowerCase()) ? REDACTED_VALUE : authConfig[key];
    return safe;
  }, {});
}

function sanitizeRequestPayload(payload) {
  const request = { ...(payload || {}) };
  if (request.headers !== undefined) request.headers = sanitizeHeaders(request.headers);
  if (request.auth_config !== undefined) request.auth_config = sanitizeAuthConfig(request.auth_config);
  if (request.auth_data !== undefined) request.auth_data = sanitizeAuthConfig(request.auth_data);
  return request;
}

function buildTree(state, parentId) {
  const children = state.collections.filter(c => (c.parent_id || null) === (parentId || null)).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||a.id-b.id);
  return children.map(c => ({ ...c, requests: state.requests.filter(r => r.collection_id === c.id).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||a.id-b.id), children: buildTree(state, c.id) }));
}

function ensureCollection(state, id) {
  const found = state.collections.find(c => c.id === Number(id));
  if (!found) throw new Error('Collection not found');
  return found;
}
function ensureRequest(state, id) {
  const found = state.requests.find(r => r.id === Number(id));
  if (!found) throw new Error('Request not found');
  return found;
}

function deleteCollectionRecursive(state, id) {
  const childIds = state.collections.filter(c => c.parent_id === id).map(c => c.id);
  childIds.forEach(childId => deleteCollectionRecursive(state, childId));
  state.requests = state.requests.filter(r => r.collection_id !== id);
  state.collections = state.collections.filter(c => c.id !== id);
}

function duplicateCollectionRecursive(state, sourceId, targetParentId) {
  const source = ensureCollection(state, sourceId);
  const newId = state.nextCollectionId++;
  const createdAt = nowIso();
  const copy = { ...source, id: newId, parent_id: targetParentId, created_at: createdAt, updated_at: createdAt };
  state.collections.push(copy);
  const sourceRequests = state.requests.filter(r => r.collection_id === sourceId);
  sourceRequests.forEach(req => {
    const reqId = state.nextRequestId++;
    state.requests.push({ ...req, id: reqId, collection_id: newId, created_at: createdAt, updated_at: createdAt });
  });
  state.collections.filter(c => c.parent_id === sourceId).forEach(child => duplicateCollectionRecursive(state, child.id, newId));
  return copy;
}

export const guestStorageApi = {
  getCollections() { const s = load(); return clone(buildTree(s, null)); },
  getCollection(id) { const s = load(); const c = ensureCollection(s, id); return clone({ ...c, requests: s.requests.filter(r => r.collection_id === c.id), children: buildTree(s, c.id) }); },
  createCollection(payload) {
    const s = load();
    const id = s.nextCollectionId++;
    const t = nowIso();
    const parentId = payload.parent_id == null ? null : Number(payload.parent_id);
    const siblings = s.collections.filter(c => (c.parent_id || null) === parentId);
    const col = { id, user_id: null, name: payload.name, description: payload.description || '', parent_id: parentId, sort_order: siblings.length, created_at: t, updated_at: t };
    s.collections.push(col); save(s); return clone(col);
  },
  updateCollection(id, payload) {
    const s = load(); const c = ensureCollection(s,id);
    if (payload.name !== undefined) c.name = payload.name;
    if (payload.description !== undefined) c.description = payload.description;
    if (payload.parent_id !== undefined) c.parent_id = payload.parent_id == null ? null : Number(payload.parent_id);
    c.updated_at = nowIso(); save(s); return clone(c);
  },
  reorderCollections(parentId, orderedIds) { const s = load(); orderedIds.forEach((id,ix)=>{ const c=ensureCollection(s,id); c.parent_id = parentId == null ? null : Number(parentId); c.sort_order=ix; c.updated_at=nowIso();}); save(s); return {updated: orderedIds.length}; },
  deleteCollection(id) { const s = load(); deleteCollectionRecursive(s, Number(id)); save(s); return { deleted: 1 }; },
  duplicateCollection(id) { const s=load(); const source=ensureCollection(s,id); const dup=duplicateCollectionRecursive(s, source.id, source.parent_id || null); save(s); return clone(dup); },
  getCollectionRequests(id) { const s=load(); return clone(s.requests.filter(r => r.collection_id === Number(id)).sort((a,b)=>(a.sort_order||0)-(b.sort_order||0)||a.id-b.id)); },
  createRequest(payload) { const s=load(); ensureCollection(s, payload.collection_id); const id=s.nextRequestId++; const t=nowIso(); const siblings=s.requests.filter(r=>r.collection_id===Number(payload.collection_id)); const safePayload=sanitizeRequestPayload(payload); const req={id, user_id:null, name:safePayload.name, method:safePayload.method||'GET', url:safePayload.url||'', headers:safePayload.headers||[], params:safePayload.params||[], body:safePayload.body||'', auth_type:safePayload.auth_type||'none', auth_config:safePayload.auth_config||{}, collection_id:Number(safePayload.collection_id), sort_order:siblings.length, created_at:t, updated_at:t}; s.requests.push(req); save(s); return clone(req); },
  getRequest(id) { const s=load(); return clone(ensureRequest(s,id)); },
  updateRequest(id,payload){ const s=load(); const r=ensureRequest(s,id); const safePayload=sanitizeRequestPayload(payload); Object.keys(safePayload||{}).forEach(k=>{r[k]=safePayload[k];}); if (safePayload.collection_id!==undefined) r.collection_id = Number(safePayload.collection_id); r.updated_at=nowIso(); save(s); return clone(r); },
  deleteRequest(id){ const s=load(); s.requests=s.requests.filter(r=>r.id!==Number(id)); s.requestInstances=s.requestInstances.filter(i=>i.request_id!==Number(id)); save(s); return {deleted:1}; },
  duplicateRequest(id){ const s=load(); const r=ensureRequest(s,id); const newId=s.nextRequestId++; const t=nowIso(); const dup=sanitizeRequestPayload({...r,id:newId,name:r.name+' (copy)',created_at:t,updated_at:t}); s.requests.push(dup); save(s); return clone(dup); },
  moveRequest(id,collectionId){ return this.updateRequest(id,{collection_id:Number(collectionId)}); },
  reorderRequests(collectionId,orderedIds){ const s=load(); orderedIds.forEach((id,ix)=>{const r=ensureRequest(s,id); r.collection_id=Number(collectionId); r.sort_order=ix; r.updated_at=nowIso();}); save(s); return {updated:orderedIds.length}; },
};
