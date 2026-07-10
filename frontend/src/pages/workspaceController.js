import { apiClient } from '../services/apiClient.js';
import { executeDesktopNativeRequest, isDesktopNativeAvailable } from '../services/desktopBridge.js';
import {
  canUseWorkspace,
  continueAsGuest,
  initializeCurrentUser,
  isExplicitGuestSession,
  loginUser,
  logoutUser,
  registerUser,
  userState,
} from '../state/user.js';
import { loadEnvVars, loadHistory, saveEnvVarsToStorage, saveHistoryToStorage } from '../state/environment.js';
import { applyParsedImportPayload, normalizeParsedImportPayload, parseCurlFallback } from '../utils/importExport.js';
import { escapeHtml, formatByteCount } from '../utils/format.js';
import { initResizablePanels } from '../utils/resizablePanels.js';
import { buildUrlWithParams, parseQueryParamsFromUrl } from '../utils/urlParams.js';
import { buildClientFetchOptions, buildServerProxyPayload } from '../features/requests/requestPayload.js';
import { renderResponseBody, renderResponseIssue, toggleJsonTreeNode } from '../ui/responseViewer.js';
import { initThemeToggle } from '../state/theme.js';

const blankRequest = () => ({
  name: 'Untitled Request',
  method: 'GET',
  url: '',
  params: [],
  headers: [],
  body_type: 'none',
  body_content: '',
  form_data: [],
  auth_type: 'none',
  auth_config: {},
});

let collectionsData = [];
let activeCollectionId = null;
let selectedRequestId = null;
let activeRequest = blankRequest();
let requestTabs = [];
let activeTabId = null;
let envVars = {};
let history = [];
let latestResponse = null;
let contextCollectionId = null;
let contextRequestId = null;
let loopTimer = null;
let loopRemaining = 0;
let nextTabNumber = 1;
let persistTabsTimer = null;
let collectionsLoading = false;
let collectionsError = '';
const collapsedCollectionIds = new Set();
const REQUEST_TABS_STORAGE_KEY = 'postboy_request_tabs';
const REQUEST_TABS_STORAGE_PREFIX = `${REQUEST_TABS_STORAGE_KEY}_user_`;
const GUEST_REQUEST_TABS_STORAGE_KEY = `${REQUEST_TABS_STORAGE_KEY}_guest`;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('active', 'show');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('active', 'show');
  modal.setAttribute('aria-hidden', 'true');
}

function setStatus(element, message, isError = false) {
  if (!element) return;
  element.textContent = message || '';
  element.classList.toggle('auth-error', isError);
}

function replaceEnvVars(value) {
  return String(value || '').replace(/\{\{\s*([^}]+?)\s*\}\}/g, (_match, key) => {
    const normalized = String(key || '').trim();
    return Object.prototype.hasOwnProperty.call(envVars, normalized) ? envVars[normalized] : '';
  });
}

function getTabStorageTarget() {
  if (isExplicitGuestSession(userState)) {
    return { storage: sessionStorage, key: GUEST_REQUEST_TABS_STORAGE_KEY };
  }
  const user = userState.currentUser;
  if (user && user.id !== undefined && user.id !== null && user.is_guest !== true) {
    return { storage: localStorage, key: REQUEST_TABS_STORAGE_PREFIX + String(user.id) };
  }
  return null;
}

function saveTabsToStorage() {
  const target = getTabStorageTarget();
  if (!target) return;
  try {
    target.storage.setItem(target.key, JSON.stringify({
      tabs: requestTabs,
      activeTabId,
      nextTabNumber,
    }));
  } catch (_err) {
    // Ignore storage failures so the workspace still functions.
  }
}

function scheduleTabPersistence() {
  if (persistTabsTimer) clearTimeout(persistTabsTimer);
  persistTabsTimer = setTimeout(() => {
    persistTabsTimer = null;
    if (!canUseWorkspace(userState) || !requestTabs.length) return;
    snapshotActiveTab();
  }, 150);
}

function loadTabsFromStorage() {
  const target = getTabStorageTarget();
  if (!target) return false;
  try {
    const parsed = JSON.parse(target.storage.getItem(target.key) || 'null');
    if (!parsed || !Array.isArray(parsed.tabs) || !parsed.tabs.length) return false;
    requestTabs = parsed.tabs.map((tab, index) => ({
      id: tab.id || `restored_tab_${index + 1}`,
      requestId: tab.requestId ?? null,
      collectionId: tab.collectionId ?? null,
      title: tab.title || `Unsaved Request ${index + 1}`,
      state: {
        ...blankRequest(),
        ...(tab.state || {}),
      },
    }));
    activeTabId = requestTabs.some((tab) => tab.id === parsed.activeTabId)
      ? parsed.activeTabId
      : requestTabs[0].id;
    nextTabNumber = Number.isFinite(parsed.nextTabNumber) && parsed.nextTabNumber > 0
      ? parsed.nextTabNumber
      : requestTabs.length + 1;
    syncTabGlobals(getActiveTab());
    return true;
  } catch (_err) {
    return false;
  }
}

function clearUserScopedUiState({ resetStorageBackedState = true } = {}) {
  history = resetStorageBackedState ? [] : history;
  envVars = resetStorageBackedState ? {} : envVars;
  collectionsData = [];
  activeCollectionId = null;
  selectedRequestId = null;
  latestResponse = null;
  activeRequest = blankRequest();
  requestTabs = [];
  activeTabId = null;
  nextTabNumber = 1;
  renderCollections();
  renderHistory();
  renderEnvVars();
  loadRequestIntoEditor(activeRequest);
  renderResponsePlaceholder();
  renderRequestTabs();
}

async function reloadUserScopedData() {
  if (!canUseWorkspace(userState)) return;
  envVars = loadEnvVars(userState.currentUser);
  history = loadHistory(userState.currentUser);
  await loadCollections();
  if (!loadTabsFromStorage()) ensureTabsInitialized();
  syncTabGlobals(getActiveTab());
  loadRequestIntoEditor(activeRequest);
  renderRequestTabs();
  renderEnvVars();
  renderHistory();
}

function setAuthenticatedViewVisible(visible) {
  $('#loginScreen').hidden = visible;
  $('#appContainer').hidden = !visible;
}

function updateAuthUi() {
  if (canUseWorkspace(userState)) {
    const name = isExplicitGuestSession(userState) ? 'Guest workspace' : userState.currentUser.username;
    setStatus($('#appAuthStatus'), `Signed in as ${name}`);
    setAuthenticatedViewVisible(true);
  } else {
    setStatus($('#authStatus'), userState.loading ? 'Checking account...' : 'Sign in or continue as guest.');
    setAuthenticatedViewVisible(false);
  }
}

async function submitAuth(mode) {
  const username = $('#authUsername').value.trim();
  const password = $('#authPassword').value;
  if (!username || !password) {
    setStatus($('#authStatus'), 'Enter a username and password.', true);
    return;
  }

  try {
    const result = mode === 'register'
      ? await registerUser({ username, password })
      : await loginUser({ username, password });
    updateAuthUi();
    await reloadUserScopedData();
    if (mode === 'register' && result.recovery_key) {
      $('#registerRecoveryKey').value = result.recovery_key;
      $('#registerRecoveryAcknowledge').checked = false;
      $('#registerRecoveryCloseBtn').disabled = true;
      openModal('registerSuccessModal');
    }
  } catch (err) {
    setStatus($('#authStatus'), err.message, true);
  }
}

async function startAuthFlow() {
  await initializeCurrentUser();
  updateAuthUi();
  if (canUseWorkspace(userState)) await reloadUserScopedData();
}

function initAuthControls() {
  $('#loginBtn')?.addEventListener('click', () => submitAuth('login'));
  $('#registerBtn')?.addEventListener('click', () => submitAuth('register'));
  $('#guestLoginBtn')?.addEventListener('click', async () => {
    await continueAsGuest();
    updateAuthUi();
    await reloadUserScopedData();
  });
  $('#logoutBtn')?.addEventListener('click', async () => {
    try {
      await logoutUser();
    } finally {
      clearUserScopedUiState();
      setAuthenticatedViewVisible(false);
      setStatus($('#authStatus'), 'Signed out.');
      $('#authPassword').value = '';
    }
  });
  $('#registerRecoveryAcknowledge')?.addEventListener('change', (event) => {
    $('#registerRecoveryCloseBtn').disabled = !event.target.checked;
  });
  $('#registerRecoveryCloseBtn')?.addEventListener('click', () => closeModal('registerSuccessModal'));
  $('#copyRecoveryKeyBtn')?.addEventListener('click', async () => {
    await navigator.clipboard?.writeText($('#registerRecoveryKey').value);
  });
  [$('#authUsername'), $('#authPassword')].forEach((input) => {
    input?.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') submitAuth('login');
    });
  });
}

async function loadCollections() {
  collectionsLoading = true;
  collectionsError = '';
  renderCollections();
  try {
    collectionsData = await apiClient.getCollections();
  } catch (err) {
    collectionsData = [];
    collectionsError = err.message || 'Collections could not be loaded.';
    setStatus($('#appAuthStatus'), err.message, true);
  } finally {
    collectionsLoading = false;
  }
  renderCollections();
}

function flattenCollections(collections = [], output = []) {
  collections.forEach((collection) => {
    output.push(collection);
    flattenCollections(collection.children || [], output);
  });
  return output;
}

function findCollection(id, collections = collectionsData) {
  for (const collection of collections) {
    if (String(collection.id) === String(id)) return collection;
    const child = findCollection(id, collection.children || []);
    if (child) return child;
  }
  return null;
}

function renderCollections() {
  const list = $('#collectionList');
  if (!list) return;
  if (collectionsLoading) {
    list.innerHTML = '<p class="empty-state">Loading collections...</p>';
    return;
  }
  if (collectionsError) {
    list.innerHTML = `<div class="panel-state panel-state-error"><strong>Collections unavailable</strong><span>${escapeHtml(collectionsError)}</span></div>`;
    return;
  }
  if (!collectionsData.length) {
    list.innerHTML = '<div class="panel-state"><strong>No collections yet</strong><span>Create a collection or import a Postman collection to start organizing requests.</span></div>';
    return;
  }
  list.innerHTML = collectionsData.map((collection) => renderCollectionNode(collection, 0)).join('');
}

function renderCollectionNode(collection, depth = 0) {
  const isCollapsed = collapsedCollectionIds.has(String(collection.id));
  const childCollections = (collection.children || []).map((child) => renderCollectionNode(child, depth + 1)).join('');
  const requests = (collection.requests || []).map((request) => `
    <button class="request-item ${String(request.id) === String(selectedRequestId) ? 'active' : ''}" type="button" data-id="${request.id}" data-collection-id="${collection.id}" style="--tree-depth: ${depth + 1}">
      <span class="request-method">${escapeHtml(request.method || 'GET')}</span>
      <span class="request-item-name">${escapeHtml(request.name || 'Untitled Request')}</span>
    </button>
  `).join('');
  const childCount = (collection.children || []).length + (collection.requests || []).length;
  return `
    <div class="collection-folder ${String(collection.id) === String(activeCollectionId) ? 'active' : ''}" data-id="${collection.id}">
      <button class="folder-header" type="button" data-id="${collection.id}" aria-expanded="${String(!isCollapsed)}" style="--tree-depth: ${depth}">
        <span class="folder-arrow" aria-hidden="true">${isCollapsed ? '>' : 'v'}</span>
        <span class="folder-icon" aria-hidden="true">[]</span>
        <span class="folder-name">${escapeHtml(collection.name)}</span>
        <span class="folder-count">${childCount}</span>
      </button>
      <div class="folder-items" data-parent-id="${collection.id}" ${isCollapsed ? 'hidden' : ''}>
        ${childCollections}
        ${requests}
      </div>
    </div>
  `;
}

function applyCollectionSearch(term) {
  const query = term.trim().toLowerCase();
  $$('#collectionList .collection-folder, #collectionList .request-item').forEach((item) => {
    item.hidden = false;
  });
  if (!query) return;
  $$('#collectionList .request-item').forEach((item) => {
    item.hidden = !item.textContent.toLowerCase().includes(query);
  });
  $$('#collectionList .collection-folder').forEach((folder) => {
    const ownMatch = folder.querySelector('.folder-name')?.textContent.toLowerCase().includes(query);
    const childMatch = Array.from(folder.querySelectorAll('.request-item:not([hidden]), .collection-folder:not([hidden])')).some((el) => el !== folder);
    folder.hidden = !(ownMatch || childMatch);
  });
}

function makeTabId() {
  return `tab_${Date.now()}_${nextTabNumber++}`;
}

function buildUnsavedTab() {
  return {
    id: makeTabId(),
    requestId: null,
    collectionId: activeCollectionId,
    title: `Unsaved Request ${nextTabNumber - 1}`,
    state: blankRequest(),
  };
}

function ensureTabsInitialized() {
  if (!requestTabs.length) {
    const tab = buildUnsavedTab();
    requestTabs = [tab];
    activeTabId = tab.id;
    saveTabsToStorage();
  }
}

function getActiveTab() {
  ensureTabsInitialized();
  return requestTabs.find((tab) => tab.id === activeTabId) || requestTabs[0];
}

function syncTabGlobals(tab) {
  activeTabId = tab.id;
  selectedRequestId = tab.requestId;
  activeCollectionId = tab.collectionId || activeCollectionId;
  activeRequest = {
    ...blankRequest(),
    ...(tab.state || {}),
  };
}

function snapshotActiveTab() {
  const tab = getActiveTab();
  if (!tab) return;
  tab.state = collectEditorState();
  tab.requestId = selectedRequestId;
  tab.collectionId = activeCollectionId;
  tab.title = tab.requestId ? (tab.state.name || activeRequest.name || 'Untitled Request') : (tab.title || 'Unsaved Request');
  activeRequest = {
    ...blankRequest(),
    ...tab.state,
  };
  saveTabsToStorage();
}

function replaceActiveTabWithBlank() {
  const tab = getActiveTab();
  const blank = blankRequest();
  if (tab) {
    tab.requestId = null;
    tab.collectionId = activeCollectionId;
    tab.state = blank;
    tab.title = tab.title || `Unsaved Request ${nextTabNumber}`;
  }
  selectedRequestId = null;
  activeRequest = blank;
  loadRequestIntoEditor(activeRequest);
  renderRequestTabs();
  renderCollections();
  saveTabsToStorage();
}

function activateWorkspaceTab(tabId) {
  ensureTabsInitialized();
  if (activeTabId === tabId) return;
  snapshotActiveTab();
  const nextTab = requestTabs.find((tab) => tab.id === tabId);
  if (!nextTab) return;
  syncTabGlobals(nextTab);
  loadRequestIntoEditor(activeRequest);
  renderRequestTabs();
  renderCollections();
  saveTabsToStorage();
}

function openNewTab() {
  ensureTabsInitialized();
  snapshotActiveTab();
  const tab = buildUnsavedTab();
  requestTabs.push(tab);
  syncTabGlobals(tab);
  loadRequestIntoEditor(activeRequest);
  renderRequestTabs();
  renderCollections();
  saveTabsToStorage();
}

function closeWorkspaceTab(tabId) {
  ensureTabsInitialized();
  if (requestTabs.length === 1) {
    requestTabs = [buildUnsavedTab()];
    syncTabGlobals(requestTabs[0]);
    loadRequestIntoEditor(activeRequest);
    renderRequestTabs();
    renderCollections();
    saveTabsToStorage();
    return;
  }
  const index = requestTabs.findIndex((tab) => tab.id === tabId);
  if (index === -1) return;
  const wasActive = activeTabId === tabId;
  requestTabs.splice(index, 1);
  if (wasActive) {
    const fallback = requestTabs[Math.max(0, index - 1)] || requestTabs[0];
    syncTabGlobals(fallback);
    loadRequestIntoEditor(activeRequest);
  }
  renderRequestTabs();
  renderCollections();
  saveTabsToStorage();
}

async function openRequest(id) {
  ensureTabsInitialized();
  const existingTab = requestTabs.find((tab) => String(tab.requestId) === String(id));
  if (existingTab) {
    activateWorkspaceTab(existingTab.id);
    return;
  }
  const request = await apiClient.getRequest(id);
  snapshotActiveTab();
  const tab = {
    id: makeTabId(),
    requestId: request.id,
    collectionId: request.collection_id,
    title: request.name || 'Untitled Request',
    state: {
      ...blankRequest(),
      ...request,
      body_type: request.body_type || (request.body ? 'text' : 'none'),
      body_content: request.body_content ?? request.body ?? '',
      form_data: request.form_data || [],
      auth_config: request.auth_config || {},
    },
  };
  requestTabs.push(tab);
  syncTabGlobals(tab);
  loadRequestIntoEditor(activeRequest);
  renderCollections();
  renderRequestTabs();
  saveTabsToStorage();
}

function renderRequestTabs() {
  ensureTabsInitialized();
  const tabs = $('#requestTabs');
  if (!tabs) return;
  tabs.innerHTML = requestTabs.map((tab) => {
    const name = tab.requestId
      ? (tab.state?.name || tab.title || 'Untitled Request')
      : (tab.title || 'Unsaved Request');
    const isActive = tab.id === activeTabId;
    const showClose = requestTabs.length > 1;
    return `
      <div class="request-tab-item${isActive ? ' active' : ''}" data-tab-id="${escapeHtml(tab.id)}">
        <button class="request-tab-trigger" type="button" data-tab-id="${escapeHtml(tab.id)}">${escapeHtml(name)}</button>
        ${showClose ? `<button class="request-tab-close" type="button" data-close-tab="${escapeHtml(tab.id)}" aria-label="Close ${escapeHtml(name)}">×</button>` : ''}
      </div>
    `;
  }).join('');
}

function initCollections() {
  $('#newCollectionBtn')?.addEventListener('click', () => {
    $('#collectionModalTitle').textContent = 'New Collection';
    $('#editCollectionId').value = '';
    $('#newColName').value = '';
    $('#newColDesc').value = '';
    openModal('newCollectionModal');
  });
  $('#newColModalClose')?.addEventListener('click', () => closeModal('newCollectionModal'));
  $('#newColCancelBtn')?.addEventListener('click', () => closeModal('newCollectionModal'));
  $('#newColSaveBtn')?.addEventListener('click', saveCollectionFromModal);
  $('#collectionSearchInput')?.addEventListener('input', (event) => applyCollectionSearch(event.target.value));
  $('#collectionList')?.addEventListener('click', (event) => {
    const requestItem = event.target.closest('.request-item');
    if (requestItem) {
      openRequest(requestItem.dataset.id);
      return;
    }
    const folderHeader = event.target.closest('.folder-header');
    if (folderHeader) {
      activeCollectionId = folderHeader.dataset.id;
      if (event.target.closest('.folder-arrow')) {
        const key = String(activeCollectionId);
        if (collapsedCollectionIds.has(key)) collapsedCollectionIds.delete(key);
        else collapsedCollectionIds.add(key);
      }
      renderCollections();
    }
  });
  $('#collectionList')?.addEventListener('contextmenu', (event) => {
    const folderHeader = event.target.closest('.folder-header');
    const requestItem = event.target.closest('.request-item');
    if (!folderHeader && !requestItem) return;
    event.preventDefault();
    contextCollectionId = folderHeader?.dataset.id || requestItem?.dataset.collectionId || null;
    contextRequestId = requestItem?.dataset.id || null;
    const menu = requestItem ? $('#requestContextMenu') : $('#contextMenu');
    showContextMenu(menu, event.clientX, event.clientY);
  });
  $('#contextMenu')?.addEventListener('click', handleCollectionContextAction);
  $('#requestContextMenu')?.addEventListener('click', handleRequestContextAction);
  document.addEventListener('click', (event) => {
    if (!event.target.closest('.context-menu')) hideContextMenus();
  });
}

async function saveCollectionFromModal() {
  const name = $('#newColName').value.trim();
  if (!name) return;
  const id = $('#editCollectionId').value;
  if (id) {
    await apiClient.updateCollection(id, { name, description: $('#newColDesc').value });
  } else {
    await apiClient.createCollection({ name, description: $('#newColDesc').value });
  }
  closeModal('newCollectionModal');
  await loadCollections();
}

function showContextMenu(menu, x, y) {
  hideContextMenus();
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  menu.classList.add('active');
}

function hideContextMenus() {
  $$('.context-menu').forEach((menu) => menu.classList.remove('active'));
}

async function handleCollectionContextAction(event) {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action || !contextCollectionId) return;
  hideContextMenus();
  if (action === 'add-request') {
    openRequestModal({ collectionId: contextCollectionId });
  } else if (action === 'edit') {
    const collection = findCollection(contextCollectionId);
    if (!collection) return;
    $('#collectionModalTitle').textContent = 'Rename Collection';
    $('#editCollectionId').value = collection.id;
    $('#newColName').value = collection.name || '';
    $('#newColDesc').value = collection.description || '';
    openModal('newCollectionModal');
  } else if (action === 'duplicate') {
    await apiClient.duplicateCollection(contextCollectionId);
    await loadCollections();
  } else if (action === 'delete' && confirm('Delete this collection and its requests?')) {
    await apiClient.deleteCollection(contextCollectionId);
    await loadCollections();
  }
}

async function handleRequestContextAction(event) {
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (!action || !contextRequestId) return;
  hideContextMenus();
  if (action === 'edit') {
    const request = await apiClient.getRequest(contextRequestId);
    openRequestModal({ collectionId: request.collection_id, request });
  } else if (action === 'duplicate') {
    await apiClient.duplicateRequest(contextRequestId);
    await loadCollections();
  } else if (action === 'delete' && confirm('Delete this request?')) {
    await apiClient.deleteRequest(contextRequestId);
    requestTabs = requestTabs.filter((tab) => String(tab.requestId) !== String(contextRequestId));
    if (!requestTabs.length) {
      requestTabs = [buildUnsavedTab()];
      syncTabGlobals(requestTabs[0]);
      loadRequestIntoEditor(activeRequest);
    } else if (String(selectedRequestId) === String(contextRequestId)) {
      syncTabGlobals(requestTabs[0]);
      loadRequestIntoEditor(activeRequest);
    }
    renderRequestTabs();
    saveTabsToStorage();
    await loadCollections();
  }
}

function openRequestModal({ collectionId, request = null }) {
  $('#requestModalTitle').textContent = request ? 'Rename Request' : 'New Request';
  $('#editRequestId').value = request?.id || '';
  $('#editRequestCollectionId').value = collectionId || activeCollectionId || '';
  $('#reqNameInput').value = request?.name || '';
  openModal('requestModal');
  $('#reqNameInput').focus();
}

function initRequestModal() {
  $('#reqModalClose')?.addEventListener('click', () => closeModal('requestModal'));
  $('#reqCancelBtn')?.addEventListener('click', () => closeModal('requestModal'));
  $('#reqSaveBtn')?.addEventListener('click', async () => {
    const name = $('#reqNameInput').value.trim();
    const id = $('#editRequestId').value;
    const collectionId = $('#editRequestCollectionId').value || activeCollectionId || flattenCollections(collectionsData)[0]?.id;
    if (!name || !collectionId) return;
    if (id) {
      await apiClient.updateRequest(id, { name });
      requestTabs.forEach((tab) => {
        if (String(tab.requestId) === String(id)) {
          tab.title = name;
          tab.state = {
            ...blankRequest(),
            ...(tab.state || {}),
            name,
          };
        }
      });
    } else {
      const created = await apiClient.createRequest({ ...blankRequest(), name, collection_id: Number(collectionId) });
      const activeTab = getActiveTab();
      if (activeTab) {
        activeTab.requestId = created.id;
        activeTab.collectionId = Number(collectionId);
        activeTab.title = name;
        activeTab.state = {
          ...blankRequest(),
          ...(activeTab.state || {}),
          name,
          collection_id: Number(collectionId),
        };
      }
      selectedRequestId = created.id;
    }
    saveTabsToStorage();
    closeModal('requestModal');
    await loadCollections();
    renderRequestTabs();
  });
}

function createInput(className, placeholder, value = '') {
  const input = document.createElement('input');
  input.type = 'text';
  input.className = `form-input ${className}`;
  input.placeholder = placeholder;
  input.value = value || '';
  return input;
}

function addHeaderRow(key = '', value = '') {
  const row = document.createElement('div');
  row.className = 'key-value-row header-row';
  row.append(createInput('header-key', 'Header name', key), createInput('header-value', 'Header value', value));
  const remove = document.createElement('button');
  remove.className = 'btn btn-icon btn-remove';
  remove.type = 'button';
  remove.textContent = '×';
  remove.addEventListener('click', () => row.remove());
  row.append(remove);
  $('#headersContainer').append(row);
}

function ensureHeaderRow() {
  if (!$('#headersContainer .header-row')) addHeaderRow();
}

function addFormDataRow(key = '', value = '') {
  const row = document.createElement('div');
  row.className = 'key-value-row form-data-row';
  row.append(createInput('form-data-key', 'Field name', key), createInput('form-data-value', 'Field value or @file path', value));
  const remove = document.createElement('button');
  remove.className = 'btn btn-icon btn-remove';
  remove.type = 'button';
  remove.textContent = '×';
  remove.addEventListener('click', () => row.remove());
  row.append(remove);
  $('#formDataRows').append(row);
}

function addParamRow(key = '', value = '', desc = '', enabled = true) {
  const row = document.createElement('tr');
  row.innerHTML = `
    <td><input type="checkbox" class="param-enabled" ${enabled ? 'checked' : ''}></td>
    <td><input type="text" class="form-input param-key" value="${escapeHtml(key)}" placeholder="key"></td>
    <td><input type="text" class="form-input param-value" value="${escapeHtml(value)}" placeholder="value"></td>
    <td><input type="text" class="form-input param-desc" value="${escapeHtml(desc)}" placeholder="description"></td>
    <td><button class="btn btn-icon param-remove" type="button">×</button></td>
  `;
  row.querySelector('.param-remove').addEventListener('click', () => {
    row.remove();
    syncUrlFromParams();
  });
  row.querySelectorAll('input').forEach((input) => input.addEventListener('input', syncUrlFromParams));
  row.querySelector('.param-enabled').addEventListener('change', syncUrlFromParams);
  $('#paramsBody').append(row);
}

function syncParamsFromUrl() {
  const urlValue = $('#urlInput').value || '';
  $('#paramsBody').innerHTML = '';
  parseQueryParamsFromUrl(urlValue).forEach((param) => {
    addParamRow(param.key, param.value, param.description, param.enabled);
  });
}

function syncUrlFromParams() {
  const urlInput = $('#urlInput');
  urlInput.value = buildUrlWithParams(urlInput.value, collectParams());
}

function updateBodyEditorsVisibility() {
  const bodyType = document.querySelector('input[name="bodyType"]:checked')?.value || 'none';
  const showRaw = ['json', 'text', 'xml'].includes(bodyType);
  const showForm = ['form-urlencoded', 'form-data'].includes(bodyType);
  $('#bodyContentEditor').hidden = !showRaw;
  $('#formDataContainer').hidden = !showForm;
}

function renderAuthFields(type = 'none', config = {}) {
  const container = $('#authFields');
  if (!container) return;
  if (type === 'bearer') {
    container.innerHTML = '<label class="field" for="authToken"><span>Token</span><input id="authToken" class="form-input" type="password" placeholder="Bearer token"></label>';
    $('#authToken').value = config.token || '';
  } else if (type === 'basic') {
    container.innerHTML = `
      <label class="field" for="authUser"><span>Username</span><input id="authUser" class="form-input" type="text"></label>
      <label class="field" for="authPass"><span>Password</span><input id="authPass" class="form-input" type="password"></label>
    `;
    $('#authUser').value = config.username || '';
    $('#authPass').value = config.password || '';
  } else if (type === 'apikey') {
    container.innerHTML = `
      <label class="field" for="authApiKey"><span>Key</span><input id="authApiKey" class="form-input" type="text"></label>
      <label class="field" for="authApiValue"><span>Value</span><input id="authApiValue" class="form-input" type="password"></label>
      <label class="field" for="authApiIn"><span>Add to</span><select id="authApiIn" class="form-select"><option value="header">Header</option><option value="query">Query</option></select></label>
    `;
    $('#authApiKey').value = config.key || '';
    $('#authApiValue').value = config.value || '';
    $('#authApiIn').value = config.in || 'header';
  } else {
    container.innerHTML = '<p class="empty-state">No authentication will be added.</p>';
  }
}

function setBodyType(value) {
  const input = document.querySelector(`input[name="bodyType"][value="${value}"]`);
  if (input) input.checked = true;
  updateBodyEditorsVisibility();
}

function setAuthType(value, config = {}) {
  const input = document.querySelector(`input[name="authType"][value="${value}"]`);
  if (input) input.checked = true;
  renderAuthFields(value, config);
}

function loadRequestIntoEditor(request) {
  $('#methodSelect').value = request.method || 'GET';
  $('#urlInput').value = request.url || '';
  $('#paramsBody').innerHTML = '';
  (request.params || []).forEach((param) => addParamRow(param.key, param.value, param.description || '', param.enabled !== false));
  if (!request.params?.length) syncParamsFromUrl();
  $('#headersContainer').innerHTML = '';
  (request.headers || []).forEach((header) => addHeaderRow(header.key || header.name || '', header.value || ''));
  ensureHeaderRow();
  setBodyType(request.body_type || 'none');
  $('#bodyContent').value = request.body_content || request.body || '';
  $('#formDataRows').innerHTML = '';
  (request.form_data || []).forEach((field) => addFormDataRow(field.key || '', field.value || ''));
  if (!request.form_data?.length) addFormDataRow();
  setAuthType(request.auth_type || 'none', request.auth_config || {});
}

function collectParams() {
  return $$('#paramsBody tr').map((row) => ({
    enabled: row.querySelector('.param-enabled').checked,
    key: row.querySelector('.param-key').value.trim(),
    value: row.querySelector('.param-value').value,
    description: row.querySelector('.param-desc').value,
  }));
}

function collectHeaders() {
  return $$('#headersContainer .header-row').map((row) => ({
    key: replaceEnvVars(row.querySelector('.header-key').value.trim()),
    value: replaceEnvVars(row.querySelector('.header-value').value),
  })).filter((header) => header.key);
}

function collectFormData() {
  return $$('#formDataRows .form-data-row').map((row) => ({
    key: replaceEnvVars(row.querySelector('.form-data-key').value.trim()),
    value: replaceEnvVars(row.querySelector('.form-data-value').value),
  })).filter((field) => field.key);
}

function collectAuthConfig() {
  const type = document.querySelector('input[name="authType"]:checked')?.value || 'none';
  if (type === 'bearer') return { token: $('#authToken')?.value || '' };
  if (type === 'basic') return { username: $('#authUser')?.value || '', password: $('#authPass')?.value || '' };
  if (type === 'apikey') return { key: $('#authApiKey')?.value || '', value: $('#authApiValue')?.value || '', in: $('#authApiIn')?.value || 'header' };
  return {};
}

function collectEditorState() {
  const bodyType = document.querySelector('input[name="bodyType"]:checked')?.value || 'none';
  const authType = document.querySelector('input[name="authType"]:checked')?.value || 'none';
  return {
    ...activeRequest,
    method: $('#methodSelect').value,
    url: $('#urlInput').value.trim(),
    params: collectParams(),
    headers: collectHeaders(),
    body_type: bodyType,
    body_content: $('#bodyContent').value,
    form_data: collectFormData(),
    auth_type: authType,
    auth_config: collectAuthConfig(),
  };
}

async function executeRequest(state) {
  const mode = $('#executionModeSelect').value;
  if (mode === 'client') {
    const { url, options } = buildClientFetchOptions(state, $('#clientCredentialsSelect').value, replaceEnvVars);
    const started = performance.now();
    const response = await fetch(url, options);
    const text = await response.text();
    let body = text;
    try { body = JSON.parse(text); } catch (_err) { /* Keep raw text. */ }
    return { status: response.status, statusText: response.statusText, headers: Object.fromEntries(response.headers.entries()), body, time: Math.round(performance.now() - started) };
  }
  const payload = buildServerProxyPayload(state, replaceEnvVars);
  if (mode === 'desktop-native') return executeDesktopNativeRequest(payload);
  return apiClient.sendProxyRequest(payload);
}

function renderResponsePlaceholder() {
  $('#statusCode').textContent = '---';
  $('#responseTime').textContent = '0 ms';
  $('#responseSize').textContent = '0 B';
  $('#responseHeaders').textContent = '';
  renderResponseBody($('#responseBody'), 'Send a request to see the response here.', {});
}

function renderResponse(result) {
  latestResponse = result;
  $('#statusCode').textContent = `${result.status || 0} ${result.statusText || ''}`.trim();
  $('#statusCode').className = `status-badge ${result.status >= 200 && result.status < 300 ? 'success' : result.status >= 400 ? 'error' : 'warning'}`;
  $('#responseTime').textContent = `${result.time || 0} ms`;
  const bodyText = typeof result.body === 'string' ? result.body : JSON.stringify(result.body || '', null, 2);
  $('#responseSize').textContent = formatByteCount(new Blob([bodyText]).size);
  $('#responseHeaders').textContent = JSON.stringify(result.headers || {}, null, 2);
  renderResponseBody($('#responseBody'), result.body ?? '', result.headers || {});
}

async function sendRequest() {
  const state = collectEditorState();
  if (!state.url) {
    renderResponseIssue($('#responseBody'), { title: 'URL is required', message: 'Enter a request URL before sending.', likelyCause: 'The request URL field is empty.', suggestedFix: 'Paste a full http:// or https:// URL.' });
    return;
  }
  try {
    $('#sendBtn').disabled = true;
    const result = await executeRequest(state);
    renderResponse(result);
    history.unshift({ method: state.method, url: state.url, status: result.status, at: new Date().toISOString() });
    history = history.slice(0, 25);
    saveHistoryToStorage(history, userState.currentUser);
    renderHistory();
  } catch (err) {
    renderResponseIssue($('#responseBody'), { title: 'Request failed', message: err.message, likelyCause: 'The request executor returned an error.', suggestedFix: 'Check the URL, proxy mode, and headers.', detailsText: JSON.stringify(err.payload || err, null, 2) });
  } finally {
    $('#sendBtn').disabled = false;
  }
}

function initEditor() {
  ensureTabsInitialized();
  syncTabGlobals(getActiveTab());
  loadRequestIntoEditor(activeRequest);
  renderRequestTabs();
  const desktopModeOption = $('#executionModeSelect option[value="desktop-native"]');
  if (desktopModeOption) desktopModeOption.disabled = !isDesktopNativeAvailable();
  $('#requestBar')?.addEventListener('input', scheduleTabPersistence);
  $('#requestSection')?.addEventListener('input', scheduleTabPersistence);
  $('#requestSection')?.addEventListener('change', scheduleTabPersistence);
  $('#newTabBtn')?.addEventListener('click', () => {
    openNewTab();
  });
  $('#requestTabs')?.addEventListener('click', (event) => {
    const closeBtn = event.target.closest('[data-close-tab]');
    if (closeBtn) {
      closeWorkspaceTab(closeBtn.dataset.closeTab);
      return;
    }
    const tabBtn = event.target.closest('[data-tab-id]');
    if (tabBtn) activateWorkspaceTab(tabBtn.dataset.tabId);
  });
  $('#sendBtn')?.addEventListener('click', sendRequest);
  $('#addHeaderBtn')?.addEventListener('click', () => addHeaderRow());
  $('#addParamBtn')?.addEventListener('click', () => addParamRow());
  $('#addFormDataBtn')?.addEventListener('click', () => addFormDataRow());
  $('#urlInput')?.addEventListener('input', syncParamsFromUrl);
  $('#prettifyJsonBtn')?.addEventListener('click', () => {
    try {
      $('#bodyContent').value = JSON.stringify(JSON.parse($('#bodyContent').value), null, 2);
      setBodyType('json');
    } catch (_err) {
      alert('Body is not valid JSON.');
    }
  });
  $$('input[name="bodyType"]').forEach((input) => input.addEventListener('change', updateBodyEditorsVisibility));
  $$('input[name="authType"]').forEach((input) => input.addEventListener('change', () => renderAuthFields(input.value)));
  $$('.tab').forEach((tab) => tab.addEventListener('click', () => activateTab(tab.dataset.tab)));
  $$('.response-tab').forEach((tab) => tab.addEventListener('click', () => activateResponseTab(tab.dataset.rtab)));
  $('#responseBodyViewer')?.addEventListener('click', (event) => {
    const toggle = event.target.closest('.json-tree-toggle');
    if (toggle) toggleJsonTreeNode($('#responseBody'), toggle);
  });
  $('#copyResponseBtn')?.addEventListener('click', async () => {
    const code = $('#responseBodyCode');
    await navigator.clipboard?.writeText(code?.textContent || '');
  });
  $('#responseFullscreenBtn')?.addEventListener('click', () => {
    $('#responseSection').classList.toggle('fullscreen');
  });
  $('#loopBtn')?.addEventListener('click', toggleLoop);
  window.addEventListener('beforeunload', () => {
    if (canUseWorkspace(userState) && requestTabs.length) snapshotActiveTab();
  });
}

function activateTab(name) {
  $$('.tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === name));
  $$('.tab-content').forEach((panel) => panel.classList.toggle('active', panel.id === `${name}-tab`));
}

function activateResponseTab(name) {
  $$('.response-tab').forEach((tab) => tab.classList.toggle('active', tab.dataset.rtab === name));
  $$('.response-tab-content').forEach((panel) => panel.classList.toggle('active', panel.id === `response-${name}-tab`));
}

function toggleLoop() {
  const controls = $('#loopControls');
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
    controls.hidden = true;
    $('#loopStatus').textContent = '';
    return;
  }
  controls.hidden = false;
  const interval = Math.max(100, Number($('#loopInterval').value || 1000));
  loopRemaining = Number($('#loopCount').value || 0);
  loopTimer = setInterval(async () => {
    if (loopRemaining > 0) {
      loopRemaining -= 1;
      if (loopRemaining === 0) toggleLoop();
    }
    $('#loopStatus').textContent = loopRemaining > 0 ? `${loopRemaining} remaining` : 'Running';
    await sendRequest();
  }, interval);
}

function renderHistory() {
  const list = $('#historyList');
  if (!list) return;
  list.innerHTML = history.length
    ? history.map((entry) => `<button class="history-item" type="button">${escapeHtml(entry.method)} ${escapeHtml(entry.url)} <span>${escapeHtml(String(entry.status || ''))}</span></button>`).join('')
    : '<p class="empty-state">No history yet.</p>';
}

function renderEnvVars() {
  const list = $('#envVarsList');
  if (!list) return;
  const rows = Object.entries(envVars);
  list.innerHTML = '';
  rows.forEach(([key, value]) => addEnvVarRow(key, value));
  if (!rows.length) addEnvVarRow();
}

function addEnvVarRow(key = '', value = '') {
  const row = document.createElement('div');
  row.className = 'key-value-row env-row';
  row.append(createInput('env-key', 'key', key), createInput('env-val', 'value', value));
  const remove = document.createElement('button');
  remove.className = 'btn btn-icon';
  remove.type = 'button';
  remove.textContent = '×';
  remove.addEventListener('click', () => {
    row.remove();
    saveEnvVars();
  });
  row.append(remove);
  row.querySelectorAll('input').forEach((input) => input.addEventListener('input', saveEnvVars));
  $('#envVarsList').append(row);
}

function saveEnvVars() {
  envVars = $$('#envVarsList .env-row').reduce((acc, row) => {
    const key = row.querySelector('.env-key').value.trim();
    if (key) acc[key] = row.querySelector('.env-val').value;
    return acc;
  }, {});
  saveEnvVarsToStorage(envVars, userState.currentUser);
}

function initEnvironment() {
  $('#openEnvVarsModalBtn')?.addEventListener('click', () => openModal('envVarsModal'));
  $('#envVarsModalClose')?.addEventListener('click', () => closeModal('envVarsModal'));
  $('#addEnvVarBtn')?.addEventListener('click', () => addEnvVarRow());
}

function initSidebarTabs() {
  $$('.sidebar-tab, .category-tab[data-target]').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.sidebar-tabs .category-tab').forEach((item) => item.classList.toggle('active', item === tab));
      $$('.sidebar-panel').forEach((panel) => panel.classList.toggle('active', panel.id === tab.dataset.target));
    });
  });
  $('#sidebarToggleBtn')?.addEventListener('click', () => $('#sidebar').classList.add('is-open'));
  $('#sidebarCloseBtn')?.addEventListener('click', () => $('#sidebar').classList.remove('is-open'));
  $('#rightSidebarToggleBtn')?.addEventListener('click', () => $('#rightSidebar').classList.add('is-open'));
  $('#rightSidebarCloseBtn')?.addEventListener('click', () => $('#rightSidebar').classList.remove('is-open'));
}

function initLayoutResizing() {
  initResizablePanels({
    shell: $('#appContainer'),
    sidebarHandle: $('#sidebarResizeHandle'),
    toolsHandle: $('#toolsResizeHandle'),
    responseHandle: $('#responseResizeHandle'),
  });
}

function initImport() {
  const editorAdapter = {
    setMethod: (value) => { $('#methodSelect').value = value; },
    setUrl: (value) => { $('#urlInput').value = value; },
    syncParamsFromUrl,
    clearHeaders: () => { $('#headersContainer').innerHTML = ''; },
    addHeaderRow,
    ensureHeaderRow,
    setBodyType,
    setBodyContent: (value) => { $('#bodyContent').value = value || ''; },
    clearFormData: () => { $('#formDataRows').innerHTML = ''; },
    addFormDataRow,
  };
  $('#importBtn')?.addEventListener('click', () => openModal('importModal'));
  $('#modalClose')?.addEventListener('click', () => closeModal('importModal'));
  $('#exampleCurlBtn')?.addEventListener('click', () => {
    $('#importInput').value = "curl -X POST https://httpbin.org/post -H 'Content-Type: application/json' --data '{\"hello\":\"world\"}'";
  });
  $$('.import-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      $$('.import-tab').forEach((item) => item.classList.toggle('active', item === tab));
      $$('.import-panel').forEach((panel) => panel.classList.toggle('active', panel.id === `import-${tab.dataset.importTab}-panel`));
    });
  });
  $('#browseFileBtn')?.addEventListener('click', () => $('#importFileInput').click());
  $('#importFileInput')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    $('#selectedFileName').textContent = file.name;
    $('#importInput').value = await file.text();
  });
  $('#importConfirmBtn')?.addEventListener('click', async () => {
    const raw = $('#importInput').value.trim();
    if (!raw) return;
    try {
      let parsed;
      if (raw.startsWith('curl')) {
        try {
          parsed = await apiClient.importData({ type: 'curl', data: raw });
        } catch (_err) {
          parsed = parseCurlFallback(raw);
        }
        applyParsedImportPayload(parsed, editorAdapter);
      } else {
        await apiClient.importData({ type: 'postman', data: JSON.parse(raw) });
        await loadCollections();
      }
      closeModal('importModal');
    } catch (err) {
      alert(`Import failed: ${err.message}`);
    }
  });
  $('#urlInput')?.addEventListener('paste', (event) => {
    const text = event.clipboardData?.getData('text') || '';
    if (!text.trim().startsWith('curl')) return;
    event.preventDefault();
    const parsed = normalizeParsedImportPayload(parseCurlFallback(text));
    applyParsedImportPayload(parsed, editorAdapter);
  });
}

function generateCurl() {
  const state = collectEditorState();
  const payload = buildServerProxyPayload(state, replaceEnvVars);
  const headerParts = Object.entries(payload.headers || {}).map(([key, value]) => `-H ${JSON.stringify(`${key}: ${value}`)}`);
  const bodyPart = payload.body ? ` --data ${JSON.stringify(payload.body)}` : '';
  const command = ['curl', '-X', payload.method, ...headerParts, JSON.stringify(payload.url)].join(' ') + bodyPart;
  $('#sidebarCurlOutput').value = command;
}

function initTools() {
  $('#generateSidebarCurlBtn')?.addEventListener('click', generateCurl);
  $('#copySidebarCurlBtn')?.addEventListener('click', async () => navigator.clipboard?.writeText($('#sidebarCurlOutput').value));
  $('#saveInstanceBtn')?.addEventListener('click', saveCurrentSnapshot);
  $('#saveResponseSnapshotBtn')?.addEventListener('click', saveCurrentSnapshot);
}

function saveCurrentSnapshot() {
  if (!latestResponse) {
    $('#responseSnapshotFeedback').textContent = 'Send a response before saving a snapshot.';
    return;
  }
  const item = document.createElement('button');
  item.className = 'snapshot-list-item';
  item.type = 'button';
  item.textContent = `${latestResponse.status || 0} ${new Date().toLocaleTimeString()}`;
  item.addEventListener('click', () => renderResponse(latestResponse));
  $('#snapshotList').prepend(item);
  $('#responseSnapshotFeedback').textContent = 'Snapshot saved.';
}

function initModalCloseHandlers() {
  document.addEventListener('click', (event) => {
    const closeTarget = event.target.closest('[data-close-modal]');
    if (closeTarget) closeModal(closeTarget.dataset.closeModal);
    const modal = event.target.classList?.contains('modal') ? event.target : null;
    if (modal) closeModal(modal.id);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') $$('.modal.active').forEach((modal) => closeModal(modal.id));
  });
}

export function initWorkspaceController() {
  initThemeToggle();
  initAuthControls();
  initLayoutResizing();
  initCollections();
  initRequestModal();
  initEditor();
  initEnvironment();
  initSidebarTabs();
  initImport();
  initTools();
  initModalCloseHandlers();
  startAuthFlow();
}
