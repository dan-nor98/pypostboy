// ============================================================
//  PostBoy – Script with Full Collections CRUD (SQLite)
// ============================================================

document.addEventListener('DOMContentLoaded', () => {

    // ─── Element References ────────────────────────────────
    const methodSelect      = document.getElementById('methodSelect');
    const urlInput          = document.getElementById('urlInput');
    const sendBtn           = document.getElementById('sendBtn');
    const loopBtn           = document.getElementById('loopBtn');
    const loopControls      = document.getElementById('loopControls');
    const loopInterval      = document.getElementById('loopInterval');
    const loopCount         = document.getElementById('loopCount');
    const loopStatus        = document.getElementById('loopStatus');
    const bodyContent       = document.getElementById('bodyContent');
    const prettifyJsonBtn   = document.getElementById('prettifyJsonBtn');
    const responseBody      = document.getElementById('responseBody');
    const responseHeaders   = document.getElementById('responseHeaders');
    const statusCode        = document.getElementById('statusCode');
    const responseTime      = document.getElementById('responseTime');
    const responseSize      = document.getElementById('responseSize');
    const loadingOverlay    = document.getElementById('loadingOverlay');
    const headersContainer  = document.getElementById('headersContainer');
    const addHeaderBtn      = document.getElementById('addHeaderBtn');
    const importBtn         = document.getElementById('importBtn');
    const importModal       = document.getElementById('importModal');
    const modalClose        = document.getElementById('modalClose');
    const importInput       = document.getElementById('importInput');
    const importConfirmBtn  = document.getElementById('importConfirmBtn');
    const collectionList    = document.getElementById('collectionList');
    const exportCurlBtn     = document.getElementById('exportCurlBtn');
    const exportModal       = document.getElementById('exportModal');
    const exportModalClose  = document.getElementById('exportModalClose');
    const exportOutput      = document.getElementById('exportOutput');
    const copyExportBtn     = document.getElementById('copyExportBtn');
    const copyResponseBtn   = document.getElementById('copyResponseBtn');
    const authFields        = document.getElementById('authFields');
    const formDataRows      = document.getElementById('formDataRows');
    const addFormDataBtn    = document.getElementById('addFormDataBtn');
    const formDataContainer = document.getElementById('formDataContainer');
    const historyList       = document.getElementById('historyList');
    const envVarsList       = document.getElementById('envVarsList');
    const addEnvVarBtn      = document.getElementById('addEnvVarBtn');
    const paramsBody        = document.getElementById('paramsBody');
    const addParamBtn       = document.getElementById('addParamBtn');
    const mainContent      = document.querySelector('.main-content');
    const requestSection   = document.getElementById('requestSection');
    const responseSection  = document.getElementById('responseSection');
    const sidebarResizeHandle  = document.getElementById('sidebarResizeHandle');
    const responseResizeHandle = document.getElementById('responseResizeHandle');
    const appContainer      = document.getElementById('appContainer');
    const sidebar           = document.getElementById('sidebar');
    const sidebarToggleBtn  = document.getElementById('sidebarToggleBtn');
    const sidebarCloseBtn   = document.getElementById('sidebarCloseBtn');
    const instancesBar      = document.getElementById('instancesBar');
    const instanceSelect    = document.getElementById('instanceSelect');
    const saveInstanceBtn   = document.getElementById('saveInstanceBtn');
    const loadInstanceBtn   = document.getElementById('loadInstanceBtn');
    const renameInstanceBtn = document.getElementById('renameInstanceBtn');
    const deleteInstanceBtn = document.getElementById('deleteInstanceBtn');

    // New Collection elements
    const newCollectionBtn     = document.getElementById('newCollectionBtn');
    const newCollectionModal   = document.getElementById('newCollectionModal');
    const newColModalClose     = document.getElementById('newColModalClose');
    const newColName           = document.getElementById('newColName');
    const newColDesc           = document.getElementById('newColDesc');
    const newColSaveBtn        = document.getElementById('newColSaveBtn');
    const newColCancelBtn      = document.getElementById('newColCancelBtn');
    const editCollectionId     = document.getElementById('editCollectionId');
    const collectionModalTitle = document.getElementById('collectionModalTitle');

    // Request modal elements
    const requestModal              = document.getElementById('requestModal');
    const reqModalClose             = document.getElementById('reqModalClose');
    const reqNameInput              = document.getElementById('reqNameInput');
    const reqSaveBtn                = document.getElementById('reqSaveBtn');
    const reqCancelBtn              = document.getElementById('reqCancelBtn');
    const editRequestId             = document.getElementById('editRequestId');
    const editRequestCollectionId   = document.getElementById('editRequestCollectionId');
    const requestModalTitle         = document.getElementById('requestModalTitle');
    const reqCollectionPickerWrap   = document.getElementById('reqCollectionPickerWrap');
    const reqCollectionSelect       = document.getElementById('reqCollectionSelect');

    // Request tabs bar
    const requestTabsEl = document.getElementById('requestTabs');
    const newTabBtn     = document.getElementById('newTabBtn');

    // Context menus
    const contextMenu        = document.getElementById('contextMenu');
    const requestContextMenu = document.getElementById('requestContextMenu');
    const tabContextMenu     = document.getElementById('tabContextMenu');

    // ─── State ─────────────────────────────────────────────
    let loopActive            = false;
    let loopTimer             = null;
    let loopRun               = 0;
    let history               = JSON.parse(localStorage.getItem('postboy_history') || '[]');
    let envVars               = JSON.parse(localStorage.getItem('postboy_env') || '{}');
    let updatingUrlFromParams = false;
    let updatingParamsFromUrl = false;
    let openTabs              = [];   // [{id, label, method, requestId, collectionId, state, unsaved}]
    let activeTabId           = null; // tab.id (uuid string)
    let tabCounter            = 0;
    let contextTarget         = null;
    let activeRequestTab      = 'params';
    let expandedCollections   = new Set();
    let collectionsData       = [];
    let dragState             = null;
    let draggedTabId          = null;
    let activeRequestInstances = [];

    const REQUEST_TAB_NAMES = ['params', 'headers', 'body', 'auth'];
    const SIDEBAR_WIDTH_KEY = 'postboy_sidebar_width';
    const RESPONSE_HEIGHT_KEY = 'postboy_response_height';
    const MOBILE_RESIZE_QUERY = '(max-width: 1024px)';

    // ─── Panel Resizing ───────────────────────────────────
    function isMobileResizeLayout() {
        return window.matchMedia(MOBILE_RESIZE_QUERY).matches;
    }

    function cssLengthToPx(value, fallback) {
        if (!value) return fallback;

        value = value.trim();
        var parsed = parseFloat(value);
        if (Number.isNaN(parsed)) return fallback;

        if (value.endsWith('vh')) return window.innerHeight * parsed / 100;
        if (value.endsWith('vw')) return window.innerWidth * parsed / 100;
        if (value.endsWith('%')) return fallback;
        return parsed;
    }

    function getCssLength(name, fallback) {
        return cssLengthToPx(getComputedStyle(document.documentElement).getPropertyValue(name), fallback);
    }

    function clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    function getSidebarWidthBounds() {
        return {
            min: getCssLength('--sidebar-min-width', 220),
            max: Math.min(getCssLength('--sidebar-max-width', 520), Math.max(260, window.innerWidth - 360))
        };
    }

    function getResponseHeightBounds() {
        var mainHeight = mainContent ? mainContent.getBoundingClientRect().height : window.innerHeight;

        return {
            min: getCssLength('--response-section-min-height', 180),
            max: Math.min(getCssLength('--response-section-max-height', 0.7 * window.innerHeight), Math.max(220, mainHeight - 220))
        };
    }

    function applySidebarWidth(width, persist) {
        if (!sidebar || isMobileResizeLayout()) return;

        var bounds = getSidebarWidthBounds();
        var clampedWidth = clamp(width, bounds.min, bounds.max);
        sidebar.style.width = clampedWidth + 'px';

        if (persist) localStorage.setItem(SIDEBAR_WIDTH_KEY, String(Math.round(clampedWidth)));
    }

    function applyResponseHeight(height, persist) {
        if (!responseSection || isMobileResizeLayout()) return;

        var bounds = getResponseHeightBounds();
        var clampedHeight = clamp(height, bounds.min, bounds.max);
        responseSection.style.height = clampedHeight + 'px';
        responseSection.style.flex = '0 0 auto';

        if (persist) localStorage.setItem(RESPONSE_HEIGHT_KEY, String(Math.round(clampedHeight)));
    }

    function restorePanelSizes() {
        if (isMobileResizeLayout()) return;

        var storedSidebarWidth = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY), 10);
        var storedResponseHeight = parseInt(localStorage.getItem(RESPONSE_HEIGHT_KEY), 10);

        if (!Number.isNaN(storedSidebarWidth)) applySidebarWidth(storedSidebarWidth, false);
        if (!Number.isNaN(storedResponseHeight)) applyResponseHeight(storedResponseHeight, false);
    }

    function clearInlinePanelSizesForMobile() {
        if (sidebar) sidebar.style.width = '';
        if (responseSection) {
            responseSection.style.height = '';
            responseSection.style.flex = '';
        }
    }

    function syncResizeHandlesForViewport() {
        var disabled = isMobileResizeLayout();

        [sidebarResizeHandle, responseResizeHandle].forEach(function(handle) {
            if (!handle) return;
            handle.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        });

        if (disabled) {
            clearInlinePanelSizesForMobile();
        } else {
            restorePanelSizes();
        }
    }

    function stopPanelResize(handle, moveHandler, upHandler, bodyClass) {
        document.removeEventListener('pointermove', moveHandler);
        document.removeEventListener('pointerup', upHandler);
        document.removeEventListener('pointercancel', upHandler);
        document.body.classList.remove('resizing-panels', bodyClass);
        if (handle) handle.classList.remove('active');
    }

    function initPanelResizing() {
        if (sidebarResizeHandle && sidebar) {
            sidebarResizeHandle.addEventListener('pointerdown', function(event) {
                if (isMobileResizeLayout()) return;

                event.preventDefault();
                sidebarResizeHandle.classList.add('active');
                document.body.classList.add('resizing-panels', 'resizing-sidebar');

                function onMove(moveEvent) {
                    var appLeft = document.querySelector('.app-container').getBoundingClientRect().left;
                    applySidebarWidth(moveEvent.clientX - appLeft, true);
                }

                function onUp() {
                    stopPanelResize(sidebarResizeHandle, onMove, onUp, 'resizing-sidebar');
                }

                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
                document.addEventListener('pointercancel', onUp);
            });
        }

        if (responseResizeHandle && responseSection && requestSection) {
            responseResizeHandle.addEventListener('pointerdown', function(event) {
                if (isMobileResizeLayout()) return;

                event.preventDefault();
                responseResizeHandle.classList.add('active');
                document.body.classList.add('resizing-panels', 'resizing-response');

                function onMove(moveEvent) {
                    var responseBottom = responseSection.getBoundingClientRect().bottom;
                    applyResponseHeight(responseBottom - moveEvent.clientY, true);
                }

                function onUp() {
                    stopPanelResize(responseResizeHandle, onMove, onUp, 'resizing-response');
                }

                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
                document.addEventListener('pointercancel', onUp);
            });
        }

        window.addEventListener('resize', syncResizeHandlesForViewport);
        syncResizeHandlesForViewport();
    }
    const OPEN_TABS_STORAGE_KEY = 'postboy_open_tabs';

    // ─── Init ──────────────────────────────────────────────
    initPanelResizing();
    renderHistory();
    renderEnvVars();
    initializeRequestTabs();

    // ─── Close context menus on click elsewhere ────────────
    document.addEventListener('click', function() {
        contextMenu.classList.remove('active');
        requestContextMenu.classList.remove('active');
        tabContextMenu.classList.remove('active');
    });

    // ─── Mobile Sidebar Toggle ────────────────────────────
    function setSidebarOpen(isOpen) {
        if (!appContainer) return;

        appContainer.classList.toggle('sidebar-open', isOpen);
        if (sidebarToggleBtn) sidebarToggleBtn.setAttribute('aria-expanded', String(isOpen));
    }

    if (sidebarToggleBtn) {
        sidebarToggleBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            setSidebarOpen(!appContainer.classList.contains('sidebar-open'));
        });
    }

    if (sidebarCloseBtn) {
        sidebarCloseBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            setSidebarOpen(false);
        });
    }

    document.addEventListener('click', function(event) {
        if (isMobileResizeLayout() && appContainer && appContainer.classList.contains('sidebar-open')) {
            var target = event.target;
            if (!sidebar.contains(target) && (!sidebarToggleBtn || !sidebarToggleBtn.contains(target))) {
                setSidebarOpen(false);
            }
        }
    });

    window.addEventListener('resize', function() {
        if (!isMobileResizeLayout()) setSidebarOpen(false);
    });

    // ─── Sidebar Tabs ─────────────────────────────────────
    function activateSidebarPanel(panelId) {
        document.querySelectorAll('.sidebar-tab').forEach(function(t) {
            t.classList.toggle('active', t.dataset.target === panelId);
        });
        document.querySelectorAll('.sidebar-panel').forEach(function(p) {
            p.classList.toggle('active', p.id === panelId);
        });
    }

    document.querySelectorAll('.sidebar-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            activateSidebarPanel(tab.dataset.target);
        });
    });

    // ─── Request Tabs (Params, Headers, Body, Auth) ────────
    document.querySelectorAll('.tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            activateRequestTab(tab.dataset.tab);
        });
    });

    function activateRequestTab(tabName) {
        if (REQUEST_TAB_NAMES.indexOf(tabName) === -1) return;

        document.querySelectorAll('.tab').forEach(function(t) {
            t.classList.toggle('active', t.dataset.tab === tabName);
        });

        document.querySelectorAll('.tab-content').forEach(function(c) {
            c.classList.toggle('active', c.id === tabName + '-tab');
        });

        activeRequestTab = tabName;
    }

    // ─── Response Tabs ─────────────────────────────────────
    document.querySelectorAll('.response-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.response-tab').forEach(function(t) { t.classList.remove('active'); });
            document.querySelectorAll('.response-tab-content').forEach(function(c) { c.classList.remove('active'); });
            tab.classList.add('active');
            document.getElementById('response-' + tab.dataset.rtab + '-tab').classList.add('active');
        });
    });

    // ═══════════════════════════════════════════════════════
    //  TOAST NOTIFICATIONS
    // ═══════════════════════════════════════════════════════

    function showToast(message, type) {
        type = type || 'info';
        var toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(function() {
            if (toast.parentNode) toast.remove();
        }, 3200);
    }

    // ═══════════════════════════════════════════════════════
    //  COLLECTIONS CRUD (Frontend ↔ API)
    // ═══════════════════════════════════════════════════════

    async function loadCollections() {
        try {
            console.log('Loading collections...');
            saveExpandedState(); // Save current expanded state

            var res = await fetch('/api/collections');
            console.log('Collections response status:', res.status);

            if (!res.ok) {
                throw new Error('HTTP error! status: ' + res.status);
            }

            var text = await res.text();
            console.log('Raw response:', text);

            var json;
            try {
                json = JSON.parse(text);
            } catch (e) {
                console.error('JSON parse error:', e);
                throw new Error('Invalid JSON response from server');
            }

            console.log('Parsed collections:', json);

            if (json.success) {
                collectionsData = json.data;
                renderCollections(json.data);
                // Re-highlight active tab's request in sidebar
                var activeTab = openTabs.find(function(t){ return t.id === activeTabId; });
                if (activeTab) highlightSidebarForTab(activeTab);
            } else {
                console.error('Server returned error:', json.error);
                showToast('Failed to load collections: ' + (json.error || 'Unknown error'), 'error');
            }
        } catch (err) {
            console.error('Failed to load collections:', err);
            showToast('Failed to load collections: ' + err.message, 'error');
            // Show empty state with error message
            collectionList.innerHTML = '<p class="empty-state" style="color: #f44336;">⚠️ Failed to load collections<br><small>' + err.message + '</small></p>';
        }
    }

    function renderCollections(collections) {
        if (!collections || !collections.length) {
            collectionList.innerHTML = '<p class="empty-state">No collections yet. Create one or import a Postman collection.</p>';
            return;
        }
        collectionList.innerHTML = '';
        collectionList.dataset.parentId = '';
        attachCollectionContainerDragHandlers(collectionList, null);
        collections.forEach(function(col) {
            renderCollectionNode(col, collectionList, null);
        });

        // Restore expanded state after rendering
        restoreExpandedState();
    }

    function saveExpandedState() {
        expandedCollections.clear();
        document.querySelectorAll('.collection-folder').forEach(function(folder) {
            var header = folder.querySelector('.folder-header');
            var items = folder.querySelector('.folder-items');
            var arrow = header.querySelector('.folder-arrow');

            if (items && items.classList.contains('open')) {
                expandedCollections.add(folder.dataset.id);
            }
        });
    }

    function restoreExpandedState() {
        expandedCollections.forEach(function(id) {
            var folder = document.querySelector('.collection-folder[data-id="' + id + '"]');
            if (folder) {
                var items = folder.querySelector('.folder-items');
                var arrow = folder.querySelector('.folder-header .folder-arrow');
                if (items) {
                    items.classList.add('open');
                    if (arrow) arrow.classList.add('open');
                }
            }
        });
    }

    function initializeRequestTabs() {
        loadCollections().then(function() {
            if (!restoreSavedTabs()) {
                openNewTab();
            }
        });
    }

    function findRequestById(requestId) {
        var id = parseInt(requestId, 10);
        var found = null;

        function visit(collections) {
            if (!collections || found) return;
            collections.forEach(function(col) {
                if (found) return;
                (col.requests || []).forEach(function(req) {
                    if (!found && parseInt(req.id, 10) === id) found = req;
                });
                if (!found && col.children && col.children.length) visit(col.children);
            });
        }

        visit(collectionsData);
        return found;
    }

    function normalizeSavedTab(savedTab) {
        if (!savedTab || typeof savedTab !== 'object') return null;

        var state = savedTab.state || getBlankState();
        var requestId = savedTab.requestId !== null && typeof savedTab.requestId !== 'undefined'
            ? parseInt(savedTab.requestId, 10)
            : null;
        if (Number.isNaN(requestId)) requestId = null;

        var request = requestId ? findRequestById(requestId) : null;
        var staleSavedRequest = requestId && !request;

        // If a saved request no longer exists in the collection tree, keep the
        // user's last editor draft but detach it so it can be saved again.
        if (staleSavedRequest && !savedTab.state) return null;

        return {
            id:           savedTab.id || makeTabId(),
            label:        staleSavedRequest
                ? ((savedTab.label || 'Recovered Request') + ' (unsaved)')
                : (savedTab.label || (request && request.name) || 'New Request'),
            method:       savedTab.method || state.method || (request && request.method) || 'GET',
            requestId:    staleSavedRequest ? null : requestId,
            collectionId: staleSavedRequest ? null : (savedTab.collectionId || (request && request.collection_id) || null),
            unsaved:      staleSavedRequest ? true : !!savedTab.unsaved,
            state:        state
        };
    }

    function restoreSavedTabs() {
        var raw = localStorage.getItem(OPEN_TABS_STORAGE_KEY);
        if (!raw) return false;

        try {
            var saved = JSON.parse(raw);
            if (!saved || !Array.isArray(saved.openTabs)) return false;

            var restoredTabs = saved.openTabs
                .map(normalizeSavedTab)
                .filter(function(tab) { return !!tab; });

            if (!restoredTabs.length) return false;

            openTabs = restoredTabs;
            activeTabId = openTabs.some(function(tab) { return tab.id === saved.activeTabId; })
                ? saved.activeTabId
                : openTabs[0].id;

            var activeTab = openTabs.find(function(tab) { return tab.id === activeTabId; });
            renderRequestTabs();
            if (activeTab) {
                loadStateIntoEditor(activeTab.state, activeTab.method);
                highlightSidebarForTab(activeTab);
            }
            persistOpenTabs(false);
            return true;
        } catch (err) {
            console.warn('Failed to restore saved tabs:', err);
            localStorage.removeItem(OPEN_TABS_STORAGE_KEY);
            return false;
        }
    }

    function persistOpenTabs(includeEditorState) {
        if (includeEditorState !== false && activeTabId) {
            var activeTab = openTabs.find(function(tab) { return tab.id === activeTabId; });
            if (activeTab) {
                activeTab.state = gatherEditorState();
                activeTab.method = methodSelect.value || activeTab.method || 'GET';
            }
        }

        try {
            localStorage.setItem(OPEN_TABS_STORAGE_KEY, JSON.stringify({
                activeTabId: activeTabId,
                openTabs: openTabs.map(function(tab) {
                    return {
                        id:           tab.id,
                        label:        tab.label,
                        method:       tab.method,
                        requestId:    tab.requestId,
                        collectionId: tab.collectionId,
                        unsaved:      !!tab.unsaved,
                        state:        tab.state || getBlankState()
                    };
                })
            }));
        } catch (err) {
            console.warn('Failed to persist tabs:', err);
        }
    }

    function renderCollectionNode(col, container, parentId) {
        var folder = document.createElement('div');
        folder.className = 'collection-folder';
        folder.dataset.id = col.id;
        folder.dataset.parentId = parentId == null ? '' : String(parentId);

        // Calculate total requests including sub-folders recursively
        // function countTotalRequests(node) {
        //     var count = (node.requests ? node.requests.length : 0);
        //     if (node.children && node.children.length) {
        //         node.children.forEach(function(child) {
        //             count += countTotalRequests(child);
        //         });
        //     }
        //     return count;
        // }

        var totalRequests = countTotalRequests(col);

        var header = document.createElement('div');
        header.className = 'folder-header';
        header.draggable = true;
        header.dataset.id = col.id;
        header.dataset.parentId = parentId == null ? '' : String(parentId);
        header.innerHTML =
        '<span class="folder-arrow">▶</span>' +
        '<span class="folder-name">' + escHtml(col.name) + '</span>' +
        '<span class="folder-count">' + totalRequests + '</span>';

        attachCollectionDragHandlers(header);

        // Toggle open/close
        header.addEventListener('click', function(e) {
            e.stopPropagation();
            var arrow = header.querySelector('.folder-arrow');
            var items = header.nextElementSibling;
            if (items) {
                items.classList.toggle('open');
                arrow.classList.toggle('open');
            }
        });

        // Right-click context menu for collection
        header.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            e.stopPropagation();
            contextTarget = { type: 'collection', id: col.id, name: col.name };
            showCtxMenu(contextMenu, e.clientX, e.clientY);
        });

        var itemsDiv = document.createElement('div');
        itemsDiv.className = 'folder-items';
        itemsDiv.dataset.parentId = col.id;
        attachCollectionContainerDragHandlers(itemsDiv, col.id);
        attachRequestContainerDragHandlers(itemsDiv, col.id);

        // Render sub-collections (children)
        if (col.children && col.children.length) {
            col.children.forEach(function(child) {
                renderCollectionNode(child, itemsDiv, col.id);
            });
        }

        // Render requests
        if (col.requests && col.requests.length) {
            col.requests.forEach(function(req) {
                var reqEl = document.createElement('div');
                reqEl.className = 'request-item';
                if (openTabs.some(function(t){ return t.requestId === req.id && t.id === activeTabId; })) reqEl.classList.add('active');
                reqEl.draggable = true;
                reqEl.dataset.id = req.id;
                reqEl.dataset.collectionId = col.id;

                reqEl.innerHTML =
                '<span class="method-badge method-' + req.method + '">' + req.method + '</span>' +
                '<span class="request-item-name">' + escHtml(req.name) + '</span>';

                attachRequestDragHandlers(reqEl);

                reqEl.addEventListener('click', function(e) {
                    e.stopPropagation();
                    loadRequestIntoEditor(req);
                });

                reqEl.addEventListener('contextmenu', function(e) {
                    e.preventDefault();
                    e.stopPropagation();
                    contextTarget = { type: 'request', id: req.id, name: req.name, collection_id: col.id };
                    showCtxMenu(requestContextMenu, e.clientX, e.clientY);
                });

                itemsDiv.appendChild(reqEl);
            });
        }

        folder.appendChild(header);
        folder.appendChild(itemsDiv);
        container.appendChild(folder);
    }

    function normalizeParentId(value) {
        return value === null || value === undefined || value === '' ? null : parseInt(value, 10);
    }

    function sameNullableId(left, right) {
        return normalizeParentId(left) === normalizeParentId(right);
    }

    function getCollectionSiblings(parentId) {
        var selector = parentId == null
            ? ':scope > .collection-folder'
            : ':scope > .collection-folder[data-parent-id="' + parentId + '"]';
        var container = parentId == null
            ? collectionList
            : document.querySelector('.folder-items[data-parent-id="' + parentId + '"]');
        return container ? Array.from(container.querySelectorAll(selector)) : [];
    }

    function getRequestSiblings(collectionId) {
        var container = document.querySelector('.folder-items[data-parent-id="' + collectionId + '"]');
        return container ? Array.from(container.querySelectorAll(':scope > .request-item[data-collection-id="' + collectionId + '"]')) : [];
    }

    function getDragInsertBefore(container, selector, y) {
        var siblings = Array.from(container.querySelectorAll(':scope > ' + selector)).filter(function(el) {
            return !el.classList.contains('dragging');
        });

        return siblings.reduce(function(closest, child) {
            var box = child.getBoundingClientRect();
            var offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            }
            return closest;
        }, { offset: Number.NEGATIVE_INFINITY, element: null }).element;
    }

    function clearDragClasses() {
        document.querySelectorAll('.dragging, .drag-over').forEach(function(el) {
            el.classList.remove('dragging', 'drag-over');
        });
    }

    function attachCollectionDragHandlers(header) {
        header.addEventListener('dragstart', function(e) {
            dragState = {
                type: 'collection',
                id: parseInt(header.dataset.id, 10),
                parentId: normalizeParentId(header.dataset.parentId)
            };
            header.closest('.collection-folder').classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify(dragState));
        });

        header.addEventListener('dragover', function(e) {
            if (!dragState || dragState.type !== 'collection') return;
            if (!sameNullableId(dragState.parentId, header.dataset.parentId)) return;
            if (dragState.id === parseInt(header.dataset.id, 10)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            header.classList.add('drag-over');
        });

        header.addEventListener('dragleave', function() {
            header.classList.remove('drag-over');
        });

        header.addEventListener('drop', function(e) {
            if (!dragState || dragState.type !== 'collection') return;
            e.preventDefault();
            e.stopPropagation();
            header.classList.remove('drag-over');
            var targetId = parseInt(header.dataset.id, 10);
            if (dragState.id === targetId || !sameNullableId(dragState.parentId, header.dataset.parentId)) return;
            reorderCollectionElement(header.closest('.collection-folder'), e.clientY);
        });

        header.addEventListener('dragend', function() {
            dragState = null;
            clearDragClasses();
        });
    }

    function attachCollectionContainerDragHandlers(container, parentId) {
        if (container.dataset.collectionDragBound === 'true') return;
        container.dataset.collectionDragBound = 'true';

        container.addEventListener('dragover', function(e) {
            if (!dragState || dragState.type !== 'collection') return;
            if (normalizeParentId(parentId) !== dragState.parentId) return;
            if (e.target.closest('.request-item')) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            container.classList.add('drag-over');
        });

        container.addEventListener('dragleave', function(e) {
            if (!container.contains(e.relatedTarget)) container.classList.remove('drag-over');
        });

        container.addEventListener('drop', function(e) {
            if (!dragState || dragState.type !== 'collection') return;
            if (normalizeParentId(parentId) !== dragState.parentId) return;
            e.preventDefault();
            e.stopPropagation();
            container.classList.remove('drag-over');
            reorderCollectionElement(null, e.clientY, container);
        });
    }

    function attachRequestDragHandlers(reqEl) {
        reqEl.addEventListener('dragstart', function(e) {
            dragState = {
                type: 'request',
                id: parseInt(reqEl.dataset.id, 10),
                collectionId: parseInt(reqEl.dataset.collectionId, 10)
            };
            reqEl.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', JSON.stringify(dragState));
        });

        reqEl.addEventListener('dragover', function(e) {
            if (!dragState || dragState.type !== 'request') return;
            if (dragState.collectionId !== parseInt(reqEl.dataset.collectionId, 10)) return;
            if (dragState.id === parseInt(reqEl.dataset.id, 10)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            reqEl.classList.add('drag-over');
        });

        reqEl.addEventListener('dragleave', function() {
            reqEl.classList.remove('drag-over');
        });

        reqEl.addEventListener('drop', function(e) {
            if (!dragState || dragState.type !== 'request') return;
            e.preventDefault();
            e.stopPropagation();
            reqEl.classList.remove('drag-over');
            if (dragState.id === parseInt(reqEl.dataset.id, 10)) return;
            if (dragState.collectionId !== parseInt(reqEl.dataset.collectionId, 10)) return;
            reorderRequestElement(reqEl, e.clientY);
        });

        reqEl.addEventListener('dragend', function() {
            dragState = null;
            clearDragClasses();
        });
    }

    function attachRequestContainerDragHandlers(container, collectionId) {
        if (container.dataset.requestDragBound === 'true') return;
        container.dataset.requestDragBound = 'true';

        container.addEventListener('dragover', function(e) {
            if (!dragState || dragState.type !== 'request') return;
            if (dragState.collectionId !== parseInt(collectionId, 10)) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            container.classList.add('drag-over');
        });

        container.addEventListener('dragleave', function(e) {
            if (!container.contains(e.relatedTarget)) container.classList.remove('drag-over');
        });

        container.addEventListener('drop', function(e) {
            if (!dragState || dragState.type !== 'request') return;
            if (dragState.collectionId !== parseInt(collectionId, 10)) return;
            e.preventDefault();
            e.stopPropagation();
            container.classList.remove('drag-over');
            reorderRequestElement(null, e.clientY, container);
        });
    }

    async function reorderCollectionElement(targetFolder, clientY, explicitContainer) {
        var dragged = document.querySelector('.collection-folder.dragging');
        if (!dragged || !dragState || dragState.type !== 'collection') return;

        var parentId = dragState.parentId;
        var container = explicitContainer || (targetFolder ? targetFolder.parentElement : null);
        if (!container) return;

        var before = getDragInsertBefore(container, '.collection-folder', clientY);
        if (before === dragged) return;
        container.insertBefore(dragged, before);

        var orderedIds = getCollectionSiblings(parentId).map(function(el) { return parseInt(el.dataset.id, 10); });
        await persistCollectionOrder(parentId, orderedIds);
    }

    async function reorderRequestElement(targetRequest, clientY, explicitContainer) {
        var dragged = document.querySelector('.request-item.dragging');
        if (!dragged || !dragState || dragState.type !== 'request') return;

        var collectionId = dragState.collectionId;
        var container = explicitContainer || (targetRequest ? targetRequest.parentElement : null);
        if (!container) return;

        var before = getDragInsertBefore(container, '.request-item', clientY);
        if (before === dragged) return;
        container.insertBefore(dragged, before);

        var orderedIds = getRequestSiblings(collectionId).map(function(el) { return parseInt(el.dataset.id, 10); });
        await persistRequestOrder(collectionId, orderedIds);
    }

    async function persistCollectionOrder(parentId, orderedIds) {
        try {
            var res = await fetch('/api/collections/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parent_id: parentId, ordered_ids: orderedIds })
            });
            var json = await res.json();
            if (!json.success) throw new Error(json.error || 'Failed to reorder collections');
            showToast('Collection order saved', 'success');
            loadCollections();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
            loadCollections();
        }
    }

    async function persistRequestOrder(collectionId, orderedIds) {
        try {
            var res = await fetch('/api/requests/reorder', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ collection_id: collectionId, ordered_ids: orderedIds })
            });
            var json = await res.json();
            if (!json.success) throw new Error(json.error || 'Failed to reorder requests');
            showToast('Request order saved', 'success');
            loadCollections();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
            loadCollections();
        }
    }

    function countTotalRequests(node) {
        var count = (node.requests ? node.requests.length : 0);
        if (node.children && node.children.length) {
            node.children.forEach(function(child) {
                count += countTotalRequests(child);
            });
        }
        return count;
    }

    // var totalRequests = countTotalRequests(col);

    function showCtxMenu(menu, x, y) {
        contextMenu.classList.remove('active');
        requestContextMenu.classList.remove('active');

        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        menu.classList.add('active');

        // Ensure menu stays on screen
        setTimeout(function() {
            var rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                menu.style.left = (window.innerWidth - rect.width - 10) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                menu.style.top = (window.innerHeight - rect.height - 10) + 'px';
            }
        }, 0);
    }

    // ─── Collection Context Menu Actions ───────────────────
    contextMenu.querySelectorAll('.context-menu-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            var action = item.dataset.action;
            if (!contextTarget || contextTarget.type !== 'collection') return;

            if (action === 'edit') {
                openEditCollectionModal(contextTarget.id, contextTarget.name);
            } else if (action === 'duplicate') {
                duplicateCollection(contextTarget.id);
            } else if (action === 'add-request') {
                openNewRequestModal(contextTarget.id);
            } else if (action === 'add-folder') {
                openNewSubfolderModal(contextTarget.id);
            } else if (action === 'delete') {
                deleteCollection(contextTarget.id, contextTarget.name);
            } else if (action === 'export-json') {
                exportCollectionAsJson(contextTarget.id);
            }

            contextMenu.classList.remove('active');
        });
    });

    // ─── Request Context Menu Actions ──────────────────────
    requestContextMenu.querySelectorAll('.context-menu-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            var action = item.dataset.action;
            if (!contextTarget || contextTarget.type !== 'request') return;

            if (action === 'edit') {
                openEditRequestModal(contextTarget.id, contextTarget.name, contextTarget.collection_id);
            } else if (action === 'duplicate') {
                duplicateRequest(contextTarget.id);
            } else if (action === 'delete') {
                deleteRequest(contextTarget.id, contextTarget.name);
            }

            requestContextMenu.classList.remove('active');
        });
    });

    // ─── New Collection Modal ──────────────────────────────
    newCollectionBtn.addEventListener('click', function() {
        editCollectionId.value = '';
        editCollectionId.dataset.parentId = '';
        collectionModalTitle.textContent = 'New Collection';
        newColName.value = '';
        newColDesc.value = '';
        newCollectionModal.classList.add('active');
        setTimeout(function() { newColName.focus(); }, 100);
    });

    newColModalClose.addEventListener('click', function() { newCollectionModal.classList.remove('active'); });
    newColCancelBtn.addEventListener('click', function() { newCollectionModal.classList.remove('active'); });

    newColSaveBtn.addEventListener('click', async function() {
        var name = newColName.value.trim();
        if (!name) { showToast('Please enter a collection name', 'error'); return; }

        var id = editCollectionId.value;
        var parentId = editCollectionId.dataset.parentId || null;

        try {
            if (id) {
                // Update existing
                var res = await fetch('/api/collections/' + id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name, description: newColDesc.value })
                });
                var json = await res.json();
                if (json.success) {
                    showToast('Collection updated', 'success');
                } else {
                    showToast('Error: ' + json.error, 'error');
                }
            } else {
                // Create new
                var payload = { name: name, description: newColDesc.value };
                if (parentId) payload.parent_id = parseInt(parentId);

                var res2 = await fetch('/api/collections', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                var json2 = await res2.json();
                if (json2.success) {
                    showToast('Collection created', 'success');
                } else {
                    showToast('Error: ' + (json2.error || 'Unknown error'), 'error');
                }
            }
            newCollectionModal.classList.remove('active');
            loadCollections();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    });

    // Enter key in collection name input
    newColName.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            newColSaveBtn.click();
        }
    });

    function openEditCollectionModal(id, name) {
        editCollectionId.value = id;
        editCollectionId.dataset.parentId = '';
        collectionModalTitle.textContent = 'Rename Collection';
        newColName.value = name;
        newColDesc.value = '';
        newCollectionModal.classList.add('active');
        setTimeout(function() { newColName.focus(); newColName.select(); }, 100);
    }

    function openNewSubfolderModal(parentId) {
        editCollectionId.value = '';
        editCollectionId.dataset.parentId = parentId;
        collectionModalTitle.textContent = 'New Sub-folder';
        newColName.value = '';
        newColDesc.value = '';
        newCollectionModal.classList.add('active');
        setTimeout(function() { newColName.focus(); }, 100);
    }

    async function duplicateCollection(id) {
        try {
            var res = await fetch('/api/collections/' + id + '/duplicate', { method: 'POST' });
            var json = await res.json();
            if (json.success) {
                showToast('Collection duplicated', 'success');
                loadCollections();
            } else {
                showToast('Error: ' + json.error, 'error');
            }
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    async function deleteCollection(id, name) {
        if (!confirm('Delete collection "' + name + '" and all its requests?\nThis cannot be undone.')) return;
        try {
            var res = await fetch('/api/collections/' + id, { method: 'DELETE' });
            var json = await res.json();
            if (json.success) {
                showToast('Collection deleted', 'success');
                // Close any tabs that had requests from this collection
                openTabs = openTabs.filter(function(t) { return t.collectionId !== id; });
                if (!openTabs.find(function(t){ return t.id === activeTabId; })) {
                    activeTabId = null;
                    openNewTab();
                } else {
                    renderRequestTabs();
                    persistOpenTabs();
                }
                loadCollections();
            } else {
                showToast('Error: ' + json.error, 'error');
            }
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    function exportCollectionAsJson(collectionId) {
        // Find the collection recursively from cached data
        const collection = findCollectionById(collectionsData, collectionId);
        if (!collection) {
            showToast('Collection not found', 'error');
            return;
        }

        // Build Postman v2.1 collection structure
        const postmanCollection = {
            info: {
                _postman_id: generateUUID(),
                name: collection.name,
                description: collection.description || '',
                schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
            },
            item: buildPostmanItems(collection.children || [], collection.requests || [])
        };

        // Convert to pretty JSON and trigger download
        const json = JSON.stringify(postmanCollection, null, 2);
        downloadJSON(json, (collection.name || 'collection').replace(/\s+/g, '_') + '.postman_collection.json');
    }

    function findCollectionById(nodes, id) {
        for (const node of nodes) {
            if (node.id == id) return node;
            if (node.children) {
                const found = findCollectionById(node.children, id);
                if (found) return found;
            }
        }
        return null;
    }

    function buildPostmanItems(children, requests) {
        const items = [];

        // Add sub‑collections (folders)
        if (children) {
            children.forEach(child => {
                items.push({
                    name: child.name,
                    description: child.description || '',
                    item: buildPostmanItems(child.children || [], child.requests || [])
                });
            });
        }

        // Add requests
        if (requests) {
            requests.forEach(req => {
                const postmanReq = {
                    name: req.name,
                    request: {
                        method: req.method || 'GET',
                        header: (req.headers || []).map(h => ({
                            key: h.key,
                            value: h.value
                        })),
                        url: {
                            raw: req.url || '',
                            protocol: (req.url || '').split('://')[0] || 'http',
                            host: [((req.url || '').split('://')[1] || '').split('/')[0] || ''],
                            path: (req.url || '').split('/').slice(3).filter(Boolean)
                        },
                        body: req.body_type === 'none' ? {} : {
                            mode: mapBodyType(req.body_type),
                            [mapBodyType(req.body_type)]: mapBodyContent(req)
                        },
                        auth: req.auth_type === 'none' ? {} : {
                            type: mapAuthType(req.auth_type),
                            [mapAuthType(req.auth_type)]: mapAuthData(req)
                        }
                    }
                };
                items.push(postmanReq);
            });
        }

        return items;
    }

    function mapBodyType(type) {
        const map = { 'json': 'raw', 'text': 'raw', 'xml': 'raw', 'form-urlencoded': 'urlencoded', 'form-data': 'formdata' };
        return map[type] || 'raw';
    }

    function mapBodyContent(req) {
        if (req.body_type === 'form-urlencoded' || req.body_type === 'form-data') {
            return (req.form_data || []).map(f => ({ key: f.key, value: f.value }));
        }
        return req.body_content || '';
    }

    function mapAuthType(type) {
        const map = { 'bearer': 'bearer', 'basic': 'basic', 'apikey': 'apikey' };
        return map[type] || 'noauth';
    }

    function mapAuthData(req) {
        const data = req.auth_data || {};
        if (req.auth_type === 'bearer') return [{ key: 'token', value: data.token || '', type: 'string' }];
        if (req.auth_type === 'basic') return [{ key: 'username', value: data.username || '', type: 'string' }, { key: 'password', value: data.password || '', type: 'string' }];
        if (req.auth_type === 'apikey') return [{ key: 'key', value: data.key || '', type: 'string' }, { key: 'value', value: data.value || '', type: 'string' }, { key: 'in', value: data.addTo || 'header', type: 'string' }];
        return [];
    }

    function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random() * 16 | 0;
            return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
        });
    }

    function downloadJSON(jsonString, filename) {
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ═══════════════════════════════════════════════════════
    //  REQUEST MODAL (New / Rename)
    // ═══════════════════════════════════════════════════════

    function openNewRequestModal(collectionId) {
        editRequestId.value = '';
        editRequestCollectionId.value = collectionId;
        reqCollectionPickerWrap.style.display = 'none';
        requestModalTitle.textContent = 'New Request';
        reqNameInput.value = '';
        requestModal.classList.add('active');
        setTimeout(function() { reqNameInput.focus(); }, 100);
    }

    function openEditRequestModal(id, name, collectionId) {
        editRequestId.value = id;
        editRequestCollectionId.value = collectionId;
        reqCollectionPickerWrap.style.display = 'none';
        requestModalTitle.textContent = 'Rename Request';
        reqNameInput.value = name;
        requestModal.classList.add('active');
        setTimeout(function() { reqNameInput.focus(); reqNameInput.select(); }, 100);
    }

    reqModalClose.addEventListener('click', function() { requestModal.classList.remove('active'); reqCollectionPickerWrap.style.display = 'none'; });
    reqCancelBtn.addEventListener('click', function() { requestModal.classList.remove('active'); reqCollectionPickerWrap.style.display = 'none'; });

    // Enter key in request name input
    reqNameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            reqSaveBtn.click();
        }
    });

    reqSaveBtn.addEventListener('click', async function() {
        var name = reqNameInput.value.trim();
        if (!name) {
            showToast('Please enter a request name', 'error');
            return;
        }

        var id = editRequestId.value;
        var collectionId = editRequestCollectionId.value || (reqCollectionSelect && reqCollectionSelect.value) || '';

        if (!id && !collectionId) {
            showToast('Please select a collection', 'error');
            return;
        }

        try {
            if (id) {
                // Rename existing request
                var res = await fetch('/api/requests/' + id, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: name })
                });
                var json = await res.json();

                if (json.success) {
                    showToast('Request renamed', 'success');
                    var renamedTab = openTabs.find(function(t){ return t.requestId === parseInt(id); });
                    if (renamedTab) {
                        renamedTab.label = name;
                        renderRequestTabs();
                        persistOpenTabs();
                    }
                    loadCollections();
                } else {
                    showToast('Error: ' + (json.error || 'Failed to rename request'), 'error');
                }
            } else {
                // Create new request with current editor state
                var payload = gatherEditorState();
                payload.collection_id = parseInt(collectionId);
                payload.name = name;

                console.log('Creating request with payload:', payload);

                var res2 = await fetch('/api/requests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                var json2 = await res2.json();
                console.log('Create request response:', json2);

                if (json2.success) {
                    // Extract the new request ID
                    var newRequestId = null;
                    if (json2.data && json2.data.id) {
                        newRequestId = json2.data.id;
                    } else if (json2.id) {
                        newRequestId = json2.id;
                    } else if (json2.request && json2.request.id) {
                        newRequestId = json2.request.id;
                    }

                    if (newRequestId) {
                        showToast('Request created successfully', 'success');

                        // Update the active tab to reference this saved request
                        var createdTab = openTabs.find(function(t){ return t.id === activeTabId; });
                        if (createdTab) {
                            createdTab.requestId = newRequestId;
                            createdTab.collectionId = parseInt(collectionId);
                            createdTab.label = name;
                            createdTab.unsaved = false;
                            createdTab.state = gatherEditorState();
                            renderRequestTabs();
                            persistOpenTabs(false);
                        }

                        // Reload collections to show the new request
                        await loadCollections();

                        // Highlight the new request in sidebar
                        setTimeout(() => {
                            var newReqEl = document.querySelector('.request-item[data-id="' + newRequestId + '"]');
                            if (newReqEl) {
                                newReqEl.classList.add('active');
                                newReqEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                            }
                        }, 100);
                    } else {
                        showToast('Request created but ID not found in response', 'warning');
                        await loadCollections();
                    }
                } else {
                    showToast('Error: ' + (json2.error || 'Failed to create request'), 'error');
                    console.error('Server error response:', json2);
                }
            }

            requestModal.classList.remove('active');
            reqCollectionPickerWrap.style.display = 'none';
        } catch (err) {
            console.error('Request save error:', err);
            showToast('Error: ' + err.message, 'error');
        }
    });

    async function duplicateRequest(id) {
        try {
            var res = await fetch('/api/requests/' + id + '/duplicate', { method: 'POST' });
            var json = await res.json();
            if (json.success) {
                showToast('Request duplicated', 'success');
                loadCollections();
            } else {
                showToast('Error: ' + json.error, 'error');
            }
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    async function deleteRequest(id, name) {
        if (!confirm('Delete request "' + name + '"?\nThis cannot be undone.')) return;
        try {
            var res = await fetch('/api/requests/' + id, { method: 'DELETE' });
            var json = await res.json();
            if (json.success) {
                showToast('Request deleted', 'success');
                // Close any tab that had this request open
                var deletedTabIds = openTabs.filter(function(t){ return t.requestId === id; }).map(function(t){ return t.id; });
                deletedTabIds.forEach(function(tid) { closeTab(tid); });
                loadCollections();
            } else {
                showToast('Error: ' + json.error, 'error');
            }
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    // ═══════════════════════════════════════════════════════
    //  LOAD REQUEST INTO EDITOR
    // ═══════════════════════════════════════════════════════

    // ═══════════════════════════════════════════════════════
    //  REQUEST TABS SYSTEM
    // ═══════════════════════════════════════════════════════

    function makeTabId() {
        return 'tab_' + (++tabCounter) + '_' + Date.now();
    }

    function openNewTab() {
        var tab = {
            id:           makeTabId(),
            label:        'New Request',
            method:       'GET',
            requestId:    null,
            collectionId: null,
            unsaved:      false,
            state:        getBlankState()
        };
        openTabs.push(tab);
        renderRequestTabs();
        switchToTab(tab.id);
        persistOpenTabs(false);
    }

    function openRequestInTab(req) {
        // If already open, just switch to it
        var existing = openTabs.find(function(t) { return t.requestId === req.id; });
        if (existing) {
            switchToTab(existing.id);
            return;
        }

        var tab = {
            id:           makeTabId(),
            label:        req.name,
            method:       req.method || 'GET',
            requestId:    req.id,
            collectionId: req.collection_id || null,
            unsaved:      false,
            state:        reqToState(req)
        };
        openTabs.push(tab);
        renderRequestTabs();
        switchToTab(tab.id);
    }

    function switchToTab(tabId) {
        // Save current editor state into the currently active tab before switching
        if (activeTabId && activeTabId !== tabId) {
            var current = openTabs.find(function(t) { return t.id === activeTabId; });
            if (current) {
                current.state = gatherEditorState();
                current.method = methodSelect.value;
                persistOpenTabs(false);
            }
        }

        activeTabId = tabId;
        var tab = openTabs.find(function(t) { return t.id === tabId; });
        if (!tab) return;

        renderRequestTabs();
        loadStateIntoEditor(tab.state, tab.method);
        highlightSidebarForTab(tab);
        refreshInstancesForActiveTab();
        persistOpenTabs(false);
    }

    function closeTab(tabId) {
        var idx = openTabs.findIndex(function(t) { return t.id === tabId; });
        if (idx === -1) return;

        openTabs.splice(idx, 1);

        if (activeTabId === tabId) {
            activeTabId = null;
            if (openTabs.length > 0) {
                var nextIdx = Math.min(idx, openTabs.length - 1);
                switchToTab(openTabs[nextIdx].id);
                return;
            } else {
                openNewTab();
                return;
            }
        }
        renderRequestTabs();
        persistOpenTabs();
    }

    function markActiveTabUnsaved() {
        var tab = openTabs.find(function(t) { return t.id === activeTabId; });
        if (tab && tab.requestId && !tab.unsaved) {
            tab.unsaved = true;
            renderRequestTabs();
        }
        persistOpenTabs();
    }

    function renderRequestTabs() {
        requestTabsEl.innerHTML = '';
        openTabs.forEach(function(tab) {
            var item = document.createElement('div');
            item.className = 'request-tab-item' + (tab.id === activeTabId ? ' active' : '') + (tab.unsaved ? ' unsaved' : '');
            item.dataset.tabId = tab.id;
            item.draggable = true;

            var methodSpan = document.createElement('span');
            methodSpan.className = 'tab-method method-' + tab.method;
            methodSpan.textContent = tab.method;

            var nameSpan = document.createElement('span');
            nameSpan.className = 'tab-name';
            nameSpan.textContent = tab.label;
            nameSpan.title = tab.label;

            var dot = document.createElement('span');
            dot.className = 'tab-unsaved-dot';
            dot.title = 'Unsaved changes';

            var closeBtn = document.createElement('button');
            closeBtn.className = 'request-tab-close';
            closeBtn.textContent = '×';
            closeBtn.title = 'Close tab';

            item.appendChild(methodSpan);
            item.appendChild(nameSpan);
            item.appendChild(dot);
            item.appendChild(closeBtn);

            item.addEventListener('click', function(e) {
                if (e.target === closeBtn) return;
                switchToTab(tab.id);
            });

            closeBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                closeTab(tab.id);
            });

            // Double-click tab name to rename (for saved tabs)
            nameSpan.addEventListener('dblclick', function(e) {
                e.stopPropagation();
                if (tab.requestId) {
                    openEditRequestModal(tab.requestId, tab.label, tab.collectionId);
                }
            });

            item.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                e.stopPropagation();
                showTabContextMenu(tab, e.clientX, e.clientY);
            });

            item.addEventListener('dragstart', function(e) {
                draggedTabId = tab.id;
                item.classList.add('dragging');
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', tab.id);
            });

            item.addEventListener('dragover', function(e) {
                if (!draggedTabId || draggedTabId === tab.id) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                item.classList.add('drag-over');
            });

            item.addEventListener('dragleave', function() {
                item.classList.remove('drag-over');
            });

            item.addEventListener('drop', function(e) {
                e.preventDefault();
                e.stopPropagation();
                item.classList.remove('drag-over');
                var sourceId = draggedTabId || e.dataTransfer.getData('text/plain');
                if (!sourceId || sourceId === tab.id) return;
                var rect = item.getBoundingClientRect();
                reorderTabs(sourceId, tab.id, e.clientX > rect.left + rect.width / 2);
                draggedTabId = null;
            });

            item.addEventListener('dragend', function() {
                draggedTabId = null;
                requestTabsEl.querySelectorAll('.request-tab-item').forEach(function(el) {
                    el.classList.remove('dragging', 'drag-over');
                });
            });

            requestTabsEl.appendChild(item);
        });

        // Scroll active tab into view
        var activeEl = requestTabsEl.querySelector('.request-tab-item.active');
        if (activeEl) activeEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    function reorderTabs(sourceId, targetId, placeAfterTarget) {
        var sourceIndex = openTabs.findIndex(function(tab) { return tab.id === sourceId; });
        if (sourceIndex === -1) return;

        var movedTab = openTabs.splice(sourceIndex, 1)[0];
        var targetIndex = openTabs.findIndex(function(tab) { return tab.id === targetId; });
        if (targetIndex === -1) {
            openTabs.splice(sourceIndex, 0, movedTab);
            return;
        }

        openTabs.splice(targetIndex + (placeAfterTarget ? 1 : 0), 0, movedTab);
        renderRequestTabs();
        persistOpenTabs();
    }

    function highlightSidebarForTab(tab) {
        document.querySelectorAll('.request-item').forEach(function(el) {
            el.classList.remove('active');
        });
        if (tab.requestId) {
            var el = document.querySelector('.request-item[data-id="' + tab.requestId + '"]');
            if (el) {
                el.classList.add('active');
                // Expand parent folder if collapsed
                var folder = el.closest('.collection-folder');
                if (folder) {
                    var items = folder.querySelector('.folder-items');
                    var header = folder.querySelector('.folder-header');
                    if (items && items.style.display === 'none') {
                        items.style.display = '';
                        if (header) header.classList.add('open');
                    }
                }
            }
        }
    }

    // ─── New tab button ────────────────────────────────────
    newTabBtn.addEventListener('click', function() {
        openNewTab();
    });

    saveInstanceBtn.addEventListener('click', saveCurrentInstance);
    loadInstanceBtn.addEventListener('click', loadSelectedInstance);
    renameInstanceBtn.addEventListener('click', renameSelectedInstance);
    deleteInstanceBtn.addEventListener('click', deleteSelectedInstance);
    instanceSelect.addEventListener('change', function() {
        var hasSelected = !!instanceSelect.value;
        loadInstanceBtn.disabled = !hasSelected;
        renameInstanceBtn.disabled = !hasSelected;
        deleteInstanceBtn.disabled = !hasSelected;
    });

    // ─── Tab context menu ──────────────────────────────────
    var tabCtxTarget = null;

    function showTabContextMenu(tab, x, y) {
        tabCtxTarget = tab;
        contextMenu.classList.remove('active');
        requestContextMenu.classList.remove('active');
        tabContextMenu.classList.remove('active');

        // Show/hide save item based on whether it's a saved request
        var saveItem    = tabContextMenu.querySelector('[data-action="save"]');
        var saveAsItem  = tabContextMenu.querySelector('[data-action="save-as"]');
        if (saveItem)   saveItem.style.display   = tab.requestId ? '' : 'none';
        if (saveAsItem) saveAsItem.style.display = tab.requestId ? 'none' : '';

        tabContextMenu.style.left = x + 'px';
        tabContextMenu.style.top  = y + 'px';
        tabContextMenu.classList.add('active');

        setTimeout(function() {
            var rect = tabContextMenu.getBoundingClientRect();
            if (rect.right > window.innerWidth)  tabContextMenu.style.left = (window.innerWidth - rect.width - 10) + 'px';
            if (rect.bottom > window.innerHeight) tabContextMenu.style.top  = (window.innerHeight - rect.height - 10) + 'px';
        }, 0);
    }

    tabContextMenu.querySelectorAll('.context-menu-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            tabContextMenu.classList.remove('active');
            if (!tabCtxTarget) return;
            var action = item.dataset.action;

            if (action === 'save') {
                // Switch to that tab first, then save
                switchToTab(tabCtxTarget.id);
                saveActiveTab();
            } else if (action === 'save-as') {
                // Switch to that tab, then open "save to collection" modal
                switchToTab(tabCtxTarget.id);
                openSaveToCollectionModal();
            } else if (action === 'close') {
                closeTab(tabCtxTarget.id);
            } else if (action === 'close-others') {
                var keep = tabCtxTarget.id;
                openTabs.slice().forEach(function(t) { if (t.id !== keep) closeTab(t.id); });
            } else if (action === 'close-all') {
                openTabs.slice().forEach(function(t) { closeTab(t.id); });
            }
        });
    });

    // Open "Save to Collection" modal for the current tab (no requestId)
    async function openSaveToCollectionModal() {
        editRequestId.value = '';
        editRequestCollectionId.value = '';
        requestModalTitle.textContent = 'Save to Collection';
        var tab = openTabs.find(function(t){ return t.id === activeTabId; });
        reqNameInput.value = tab ? tab.label : '';

        // Populate collection picker
        reqCollectionPickerWrap.style.display = '';
        reqCollectionSelect.innerHTML = '<option value="">— Select collection —</option>';
        try {
            var res = await fetch('/api/collections');
            var json = await res.json();
            if (json.success) {
                (json.data || []).forEach(function flattenCollection(col) {
                    var opt = document.createElement('option');
                    opt.value = col.id;
                    opt.textContent = col.name;
                    reqCollectionSelect.appendChild(opt);
                    if (col.children && col.children.length) col.children.forEach(flattenCollection);
                });
            }
        } catch (err) { /* ignore */ }

        requestModal.classList.add('active');
        setTimeout(function() { reqNameInput.focus(); }, 100);
    }

    // ═══════════════════════════════════════════════════════
    //  LOAD REQUEST INTO EDITOR  (kept for compatibility)
    // ═══════════════════════════════════════════════════════

    function loadRequestIntoEditor(req) {
        openRequestInTab(req);
    }

    // ═══════════════════════════════════════════════════════
    //  EDITOR STATE HELPERS
    // ═══════════════════════════════════════════════════════

    function getBlankState() {
        return {
            method:       'GET',
            url:          '',
            headers:      [],
            body_type:    'none',
            body_content: '',
            form_data:    [],
            auth_type:    'none',
            auth_data:    {},
            body_raw_type: 'application/json',
            response_status: null,
            response_status_text: '',
            response_headers: '',
            response_body: '',
            response_time_ms: null,
            response_size: ''
        };
    }

    function reqToState(req) {
        return {
            method:       req.method       || 'GET',
            url:          req.url          || '',
            headers:      req.headers      || [],
            body_type:    req.body_type    || 'none',
            body_content: req.body_content || '',
            form_data:    req.form_data    || [],
            auth_type:    req.auth_type    || 'none',
            auth_data:    req.auth_data    || {},
            body_raw_type: req.body_raw_type || 'application/json',
            response_status: req.response_status != null ? req.response_status : null,
            response_status_text: req.response_status_text || '',
            response_headers: req.response_headers != null ? req.response_headers : '',
            response_body: req.response_body != null ? req.response_body : '',
            response_time_ms: req.response_time_ms != null ? req.response_time_ms : null,
            response_size: req.response_size || ''
        };
    }

    function loadStateIntoEditor(state, method) {
        state = state || getBlankState();

        // Method & URL
        methodSelect.value = state.method || method || 'GET';
        urlInput.value = state.url || '';
        syncParamsFromUrl();

        // Headers
        headersContainer.innerHTML = '';
        var hdrs = state.headers || [];
        if (Array.isArray(hdrs)) {
            hdrs.forEach(function(h) { addHeaderRow(h.key, h.value); });
        }
        if (!headersContainer.children.length) addHeaderRow();

        // Body type
        var bt = state.body_type || 'none';
        var bodyRadio = document.querySelector('input[name="bodyType"][value="' + bt + '"]');
        if (bodyRadio) {
            bodyRadio.checked = true;
            var isForm = (bt === 'form-data' || bt === 'form-urlencoded');
            bodyContent.style.display = (isForm || bt === 'none') ? 'none' : '';
            formDataContainer.style.display = isForm ? '' : 'none';
        }
        bodyContent.value = state.body_content || '';

        // Form data
        formDataRows.innerHTML = '';
        var fd = state.form_data || [];
        if (Array.isArray(fd)) {
            fd.forEach(function(f) { addFormDataRow(f.key, f.value); });
        }

        // Auth
        var authType = state.auth_type || 'none';
        var authRadio = document.querySelector('input[name="authType"][value="' + authType + '"]');
        if (authRadio) {
            authRadio.checked = true;
            renderAuthFields(authType);
        }
        var authData = state.auth_data || {};
        setTimeout(function() {
            if (authType === 'bearer' && authData.token) {
                var tokenEl = document.getElementById('authToken');
                if (tokenEl) tokenEl.value = authData.token;
            } else if (authType === 'basic') {
                var userEl = document.getElementById('authUser');
                var passEl = document.getElementById('authPass');
                if (userEl) userEl.value = authData.username || '';
                if (passEl) passEl.value = authData.password || '';
            } else if (authType === 'apikey') {
                var keyEl = document.getElementById('authApiKey');
                var valEl = document.getElementById('authApiValue');
                var inEl  = document.getElementById('authApiIn');
                if (keyEl) keyEl.value = authData.key   || '';
                if (valEl) valEl.value = authData.value || '';
                if (inEl)  inEl.value  = authData.addTo || 'header';
            }
        }, 60);

        restoreResponsePane(state);
    }

    function parseResponseTimeMs(value) {
        var match = String(value || '').match(/-?\d+/);
        return match ? parseInt(match[0], 10) : null;
    }

    function stringifyHeadersForDisplay(headers) {
        if (!headers) return '';
        if (typeof headers === 'string') return headers;
        return Object.keys(headers).map(function(k) {
            return k + ': ' + headers[k];
        }).join('\n');
    }

    function hasHeaderContent(headers) {
        if (!headers) return false;
        if (typeof headers === 'string') return headers.trim() !== '';
        return Object.keys(headers).length > 0;
    }

    function hasResponseState(state) {
        return !!state && (
            state.response_status != null ||
            !!state.response_status_text ||
            hasHeaderContent(state.response_headers) ||
            (state.response_body != null && state.response_body !== '') ||
            state.response_time_ms != null ||
            !!state.response_size
        );
    }

    function clearResponsePane() {
        statusCode.textContent = '---';
        statusCode.className = 'status-badge';
        statusCode.dataset.statusText = '';
        responseTime.textContent = '0 ms';
        responseSize.textContent = '0 B';
        responseHeaders.textContent = '';
        responseBody.textContent = 'Send a request to see the response here.';
    }

    function restoreResponsePane(state) {
        if (!hasResponseState(state)) {
            clearResponsePane();
            return;
        }

        var sc = state.response_status;
        statusCode.textContent = sc != null && sc !== '' ? sc : '---';
        statusCode.className = sc != null && sc !== '' ? 'status-badge ' + getStatusClass(sc) : 'status-badge';
        statusCode.dataset.statusText = state.response_status_text || '';
        responseTime.textContent = state.response_time_ms != null && state.response_time_ms !== ''
            ? state.response_time_ms + ' ms'
            : '0 ms';
        responseSize.textContent = state.response_size || '0 B';
        responseHeaders.textContent = stringifyHeadersForDisplay(state.response_headers);
        displayResponse(state.response_body != null ? state.response_body : '');
    }

    function gatherResponseState() {
        var statusText = statusCode.textContent.trim();
        var parsedStatus = /^\d+$/.test(statusText) ? parseInt(statusText, 10) : null;
        return {
            response_status: parsedStatus,
            response_status_text: statusCode.dataset.statusText || '',
            response_headers: responseHeaders.textContent || '',
            response_body: responseBody.textContent || '',
            response_time_ms: parseResponseTimeMs(responseTime.textContent),
            response_size: responseSize.textContent || ''
        };
    }

    // ═══════════════════════════════════════════════════════
    //  GATHER CURRENT EDITOR STATE
    // ═══════════════════════════════════════════════════════

    function gatherEditorState() {
        var headers = [];
        headersContainer.querySelectorAll('.header-row').forEach(function(row) {
            var k = row.querySelector('.header-key').value.trim();
            var v = row.querySelector('.header-value').value.trim();
            if (k) headers.push({ key: k, value: v });
        });

        var bodyType = document.querySelector('input[name="bodyType"]:checked').value;
        var bodyContentVal = bodyContent.value;

        var formData = [];
        formDataRows.querySelectorAll('.form-data-row').forEach(function(r) {
            var k = r.children[0].value.trim();
            var v = r.children[1].value;
            if (k) formData.push({ key: k, value: v });
        });

        var authType = document.querySelector('input[name="authType"]:checked').value;
        var authData = {};
        if (authType === 'bearer') {
            var t = document.getElementById('authToken');
            authData = { token: t ? t.value : '' };
        } else if (authType === 'basic') {
            var u = document.getElementById('authUser');
            var p = document.getElementById('authPass');
            authData = { username: u ? u.value : '', password: p ? p.value : '' };
        } else if (authType === 'apikey') {
            var ak = document.getElementById('authApiKey');
            var av = document.getElementById('authApiValue');
            var ai = document.getElementById('authApiIn');
            authData = { key: ak ? ak.value : '', value: av ? av.value : '', addTo: ai ? ai.value : 'header' };
        }

        var state = {
            method:       methodSelect.value,
            url:          urlInput.value.trim(),
            headers:      headers,
            body_type:    bodyType,
            body_content: bodyContentVal,
            form_data:    formData,
            auth_type:    authType,
            auth_data:    authData,
            body_raw_type: 'application/json'
        };

        Object.assign(state, gatherResponseState());
        return state;
    }

    // Keep gatherRequestState as alias for backward compat
    function gatherRequestState() {
        return gatherEditorState();
    }

    // ═══════════════════════════════════════════════════════
    //  REQUEST INSTANCES / SNAPSHOTS
    // ═══════════════════════════════════════════════════════

    function getActiveSavedTab() {
        return openTabs.find(function(t) { return t.id === activeTabId && t.requestId; }) || null;
    }

    function renderInstancesBar(instances) {
        var tab = getActiveSavedTab();
        activeRequestInstances = instances || [];

        if (!tab) {
            instancesBar.classList.add('hidden');
            instanceSelect.innerHTML = '<option value="">Save this request first</option>';
            return;
        }

        instancesBar.classList.remove('hidden');
        instanceSelect.innerHTML = '';

        if (!activeRequestInstances.length) {
            var empty = document.createElement('option');
            empty.value = '';
            empty.textContent = 'No snapshots yet';
            instanceSelect.appendChild(empty);
        } else {
            activeRequestInstances.forEach(function(instance) {
                var opt = document.createElement('option');
                opt.value = instance.id;
                opt.textContent = instance.name;
                instanceSelect.appendChild(opt);
            });
        }

        var hasSelected = !!instanceSelect.value;
        loadInstanceBtn.disabled = !hasSelected;
        renameInstanceBtn.disabled = !hasSelected;
        deleteInstanceBtn.disabled = !hasSelected;
    }

    async function refreshInstancesForActiveTab() {
        var tab = getActiveSavedTab();
        if (!tab) {
            renderInstancesBar([]);
            return;
        }

        try {
            var res = await fetch('/api/requests/' + tab.requestId + '/instances');
            var json = await res.json();
            if (json.success) {
                renderInstancesBar(json.data || []);
            } else {
                renderInstancesBar([]);
                showToast('Could not load snapshots: ' + json.error, 'error');
            }
        } catch (err) {
            renderInstancesBar([]);
            showToast('Could not load snapshots: ' + err.message, 'error');
        }
    }

    async function saveCurrentInstance() {
        var tab = getActiveSavedTab();
        if (!tab) {
            showToast('Save the request before creating snapshots', 'error');
            return;
        }

        var defaultName = tab.label + ' snapshot';
        var name = prompt('Snapshot name', defaultName);
        if (name === null) return;
        name = name.trim();
        if (!name) {
            showToast('Snapshot name is required', 'error');
            return;
        }

        var state = gatherEditorState();
        state.name = name;

        try {
            var res = await fetch('/api/requests/' + tab.requestId + '/instances', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state)
            });
            var json = await res.json();
            if (json.success) {
                showToast('Snapshot saved', 'success');
                await refreshInstancesForActiveTab();
                instanceSelect.value = String(json.data.id);
            } else {
                showToast('Error: ' + json.error, 'error');
            }
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    async function loadSelectedInstance() {
        var id = instanceSelect.value;
        if (!id) return;

        try {
            var res = await fetch('/api/request-instances/' + id);
            var json = await res.json();
            if (json.success) {
                var tab = getActiveSavedTab();
                var state = reqToState(json.data);
                loadStateIntoEditor(state, state.method);
                restoreResponsePane(state);
                if (tab) {
                    tab.state = state;
                    tab.method = state.method;
                    tab.unsaved = true;
                    renderRequestTabs();
                    persistOpenTabs(false);
                }
                showToast('Snapshot loaded into editor', 'success');
            } else {
                showToast('Error: ' + json.error, 'error');
            }
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    async function renameSelectedInstance() {
        var id = instanceSelect.value;
        if (!id) return;

        var selected = activeRequestInstances.find(function(instance) { return String(instance.id) === String(id); });
        var name = prompt('Rename snapshot', selected ? selected.name : '');
        if (name === null) return;
        name = name.trim();
        if (!name) {
            showToast('Snapshot name is required', 'error');
            return;
        }

        try {
            var res = await fetch('/api/request-instances/' + id, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name })
            });
            var json = await res.json();
            if (json.success) {
                showToast('Snapshot renamed', 'success');
                await refreshInstancesForActiveTab();
                instanceSelect.value = String(id);
            } else {
                showToast('Error: ' + json.error, 'error');
            }
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    async function deleteSelectedInstance() {
        var id = instanceSelect.value;
        if (!id) return;

        var selected = activeRequestInstances.find(function(instance) { return String(instance.id) === String(id); });
        var name = selected ? selected.name : 'selected snapshot';
        if (!confirm('Delete snapshot "' + name + '"?')) return;

        try {
            var res = await fetch('/api/request-instances/' + id, { method: 'DELETE' });
            var json = await res.json();
            if (json.success) {
                showToast('Snapshot deleted', 'success');
                await refreshInstancesForActiveTab();
            } else {
                showToast('Error: ' + json.error, 'error');
            }
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    // ─── Save active tab's request ─────────────────────────
    async function saveActiveTab() {
        var tab = openTabs.find(function(t) { return t.id === activeTabId; });
        if (!tab || !tab.requestId) {
            showToast('No saved request in this tab', 'error');
            return;
        }

        var state = gatherEditorState();
        tab.state = state;

        try {
            var res = await fetch('/api/requests/' + tab.requestId, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(state)
            });
            var json = await res.json();
            if (json.success) {
                tab.unsaved = false;
                renderRequestTabs();
                persistOpenTabs(false);
                showToast('Request saved', 'success');
                refreshInstancesForActiveTab();
                loadCollections();
            } else {
                showToast('Error: ' + json.error, 'error');
            }
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    // Ctrl+S to save current request
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            var tab = openTabs.find(function(t) { return t.id === activeTabId; });
            if (tab && tab.requestId) {
                saveActiveTab();
            }
        }
    });



    // ═══════════════════════════════════════════════════════
    //  PARAMS – AUTO DETECT & BIDIRECTIONAL SYNC
    // ═══════════════════════════════════════════════════════

    function syncParamsFromUrl() {
        if (updatingUrlFromParams) return;
        updatingParamsFromUrl = true;

        var url = urlInput.value;
        var qIdx = url.indexOf('?');

        if (qIdx === -1 || url.substring(qIdx + 1).trim() === '') {
            paramsBody.innerHTML = '';
            addParamRow('', '', '', true);
            updatingParamsFromUrl = false;
            return;
        }

        var queryStr = url.substring(qIdx + 1);
        var pairs = [];
        queryStr.split('&').forEach(function(part) {
            if (!part) return;
            var eqIdx = part.indexOf('=');
            if (eqIdx === -1) {
                pairs.push({ key: decodeURIComponent(part), value: '', desc: '' });
            } else {
                pairs.push({
                    key: decodeURIComponent(part.substring(0, eqIdx)),
                    value: decodeURIComponent(part.substring(eqIdx + 1)),
                    desc: ''
                });
            }
        });

        // Preserve descriptions from existing rows
        var existingDescs = {};
        paramsBody.querySelectorAll('tr').forEach(function(row) {
            var k = row.querySelector('.param-key');
            var d = row.querySelector('.param-desc');
            if (k && k.value) existingDescs[k.value] = (d && d.value) || '';
        });

        paramsBody.innerHTML = '';
        pairs.forEach(function(p) {
            addParamRow(p.key, p.value, existingDescs[p.key] || '', true);
        });
        addParamRow('', '', '', true);

        updatingParamsFromUrl = false;
    }

    function syncUrlFromParams() {
        if (updatingParamsFromUrl) return;
        updatingUrlFromParams = true;

        var rows = paramsBody.querySelectorAll('tr');
        var parts = [];

        rows.forEach(function(row) {
            var enabled = row.querySelector('.param-enabled');
            var key = row.querySelector('.param-key');
            var value = row.querySelector('.param-value');
            if (enabled && enabled.checked && key && key.value.trim()) {
                parts.push(
                    encodeURIComponent(key.value.trim()) + '=' +
                    encodeURIComponent((value && value.value) || '')
                );
            }
        });

        var url = urlInput.value;
        var qIdx = url.indexOf('?');
        var base = qIdx === -1 ? url : url.substring(0, qIdx);

        urlInput.value = parts.length > 0 ? base + '?' + parts.join('&') : base;

        updatingUrlFromParams = false;
    }

    function addParamRow(key, value, desc, enabled) {
        key = key || '';
        value = value || '';
        desc = desc || '';
        if (typeof enabled === 'undefined') enabled = true;

        var tr = document.createElement('tr');
        if (!enabled) tr.classList.add('param-row-disabled');

        tr.innerHTML =
            '<td class="col-check"><input type="checkbox" class="param-enabled" ' + (enabled ? 'checked' : '') + '></td>' +
            '<td><input type="text" class="param-key" placeholder="Key" value="' + escAttr(key) + '"></td>' +
            '<td><input type="text" class="param-value" placeholder="Value" value="' + escAttr(value) + '"></td>' +
            '<td><input type="text" class="param-desc" placeholder="Description" value="' + escAttr(desc) + '"></td>' +
            '<td class="col-action"><button class="btn-remove param-remove">&times;</button></td>';

        var chk   = tr.querySelector('.param-enabled');
        var kIn   = tr.querySelector('.param-key');
        var vIn   = tr.querySelector('.param-value');
        var rmBtn = tr.querySelector('.param-remove');

        chk.addEventListener('change', function() {
            tr.classList.toggle('param-row-disabled', !chk.checked);
            syncUrlFromParams();
        });

        kIn.addEventListener('input', function() {
            syncUrlFromParams();
            ensureEmptyLastParamRow();
        });

        vIn.addEventListener('input', function() {
            syncUrlFromParams();
        });

        rmBtn.addEventListener('click', function() {
            tr.remove();
            syncUrlFromParams();
            ensureEmptyLastParamRow();
            markActiveTabUnsaved();
        });

        paramsBody.appendChild(tr);
    }

    function ensureEmptyLastParamRow() {
        var rows = paramsBody.querySelectorAll('tr');
        if (rows.length === 0) {
            addParamRow();
            return;
        }
        var last = rows[rows.length - 1];
        var k = last.querySelector('.param-key');
        var v = last.querySelector('.param-value');
        if ((k && k.value) || (v && v.value)) {
            addParamRow();
        }
    }

    addParamBtn.addEventListener('click', function() { addParamRow(); markActiveTabUnsaved(); });
    paramsBody.addEventListener('input', markActiveTabUnsaved);
    paramsBody.addEventListener('change', markActiveTabUnsaved);

    urlInput.addEventListener('input', function() {
        syncParamsFromUrl();
        markActiveTabUnsaved();
    });

    methodSelect.addEventListener('change', function() {
        var tab = openTabs.find(function(t){ return t.id === activeTabId; });
        if (tab) { tab.method = methodSelect.value; renderRequestTabs(); markActiveTabUnsaved(); }
    });

    bodyContent.addEventListener('input', function() { markActiveTabUnsaved(); });

    prettifyJsonBtn.addEventListener('click', function() {
        var originalBody = bodyContent.value;
        var parsedBody;

        try {
            parsedBody = JSON.parse(originalBody);
        } catch (err) {
            showToast('Invalid JSON: ' + err.message, 'error');
            return;
        }

        var jsonRadio = document.querySelector('input[name="bodyType"][value="json"]');
        if (jsonRadio) jsonRadio.checked = true;

        bodyContent.value = JSON.stringify(parsedBody, null, 2);
        bodyContent.style.display = '';
        formDataContainer.style.display = 'none';
        markActiveTabUnsaved();
    });

    // ─── Utility: escape for HTML attributes ───────────────
    function escAttr(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // ═══════════════════════════════════════════════════════
    //  ENVIRONMENT VARIABLES
    // ═══════════════════════════════════════════════════════

    function renderEnvVars() {
        envVarsList.innerHTML = '';
        var keys = Object.keys(envVars);
        keys.forEach(function(k) { addEnvRow(k, envVars[k]); });
        if (keys.length === 0) addEnvRow('', '');
    }

    function addEnvRow(key, value) {
        key = key || '';
        value = value || '';
        var row = document.createElement('div');
        row.className = 'env-row';
        row.innerHTML =
            '<input type="text" placeholder="Key" class="env-key" value="' + escAttr(key) + '">' +
            '<input type="text" placeholder="Value" class="env-val" value="' + escAttr(value) + '">' +
            '<button class="btn-remove">&times;</button>';
        row.querySelector('.btn-remove').addEventListener('click', function() { row.remove(); saveEnvVars(); });
        row.querySelector('.env-key').addEventListener('input', saveEnvVars);
        row.querySelector('.env-val').addEventListener('input', saveEnvVars);
        envVarsList.appendChild(row);
    }

    function saveEnvVars() {
        envVars = {};
        envVarsList.querySelectorAll('.env-row').forEach(function(r) {
            var k = r.querySelector('.env-key').value.trim();
            var v = r.querySelector('.env-val').value;
            if (k) envVars[k] = v;
        });
        localStorage.setItem('postboy_env', JSON.stringify(envVars));
    }

    addEnvVarBtn.addEventListener('click', function() { addEnvRow(); });

    function replaceEnvVars(str) {
        if (!str) return str;
        return str.replace(/\{\{(\w+)\}\}/g, function(m, key) {
            return envVars[key] !== undefined ? envVars[key] : m;
        });
    }

    // ═══════════════════════════════════════════════════════
    //  HISTORY
    // ═══════════════════════════════════════════════════════

    function addHistory(method, url, status) {
        history.unshift({ method: method, url: url, status: status, time: Date.now() });
        if (history.length > 50) history.pop();
        localStorage.setItem('postboy_history', JSON.stringify(history));
        renderHistory();
    }

    function renderHistory() {
        if (!history.length) {
            historyList.innerHTML = '<p class="empty-state">No history yet.</p>';
            return;
        }
        historyList.innerHTML = '';
        history.forEach(function(h) {
            var item = document.createElement('div');
            item.className = 'history-item';
            var sc = String(h.status || '');
            var cls = '';
            if (sc.startsWith('2')) cls = 's2xx';
            else if (sc.startsWith('3')) cls = 's3xx';
            else if (sc.startsWith('4')) cls = 's4xx';
            else if (sc.startsWith('5')) cls = 's5xx';
            item.innerHTML =
                '<span class="method-badge method-' + h.method + '">' + h.method + '</span>' +
                '<span class="history-url">' + escHtml(h.url) + '</span>' +
                (sc ? '<span class="history-status ' + cls + '">' + sc + '</span>' : '');
            item.addEventListener('click', function() {
                methodSelect.value = h.method;
                urlInput.value = h.url;
                syncParamsFromUrl();
            });
            historyList.appendChild(item);
        });
    }

    // ═══════════════════════════════════════════════════════
    //  AUTH HANDLING
    // ═══════════════════════════════════════════════════════

    document.querySelectorAll('input[name="authType"]').forEach(function(r) {
        r.addEventListener('change', function() { renderAuthFields(r.value); markActiveTabUnsaved(); });
    });

    function renderAuthFields(type) {
        authFields.innerHTML = '';
        if (type === 'bearer') {
            authFields.innerHTML = '<label>Token</label><input type="text" id="authToken" placeholder="Enter token">';
        } else if (type === 'basic') {
            authFields.innerHTML =
                '<label>Username</label><input type="text" id="authUser" placeholder="Username">' +
                '<label>Password</label><input type="password" id="authPass" placeholder="Password">';
        } else if (type === 'apikey') {
            authFields.innerHTML =
                '<label>Key</label><input type="text" id="authApiKey" placeholder="X-API-Key">' +
                '<label>Value</label><input type="text" id="authApiValue" placeholder="value">' +
                '<label>Add to</label><select id="authApiIn"><option value="header">Header</option><option value="query">Query Params</option></select>';
        }
    }

    function getAuthHeaders() {
        var type = document.querySelector('input[name="authType"]:checked').value;
        var headers = {};
        if (type === 'bearer') {
            var t = document.getElementById('authToken');
            if (t && t.value) headers['Authorization'] = 'Bearer ' + t.value;
        } else if (type === 'basic') {
            var u = document.getElementById('authUser');
            var p = document.getElementById('authPass');
            var uv = u ? u.value : '';
            var pv = p ? p.value : '';
            if (uv) headers['Authorization'] = 'Basic ' + btoa(uv + ':' + pv);
        } else if (type === 'apikey') {
            var k = document.getElementById('authApiKey');
            var v = document.getElementById('authApiValue');
            var w = document.getElementById('authApiIn');
            if (k && v && w && k.value && v.value && w.value === 'header') {
                headers[k.value] = v.value;
            }
        }
        return headers;
    }

    function getAuthQueryString() {
        var type = document.querySelector('input[name="authType"]:checked').value;
        if (type === 'apikey') {
            var k = document.getElementById('authApiKey');
            var v = document.getElementById('authApiValue');
            var w = document.getElementById('authApiIn');
            if (k && v && w && k.value && v.value && w.value === 'query') {
                return encodeURIComponent(k.value) + '=' + encodeURIComponent(v.value);
            }
        }
        return '';
    }

    // ═══════════════════════════════════════════════════════
    //  BODY TYPE HANDLING
    // ═══════════════════════════════════════════════════════

    document.querySelectorAll('input[name="bodyType"]').forEach(function(r) {
        r.addEventListener('change', function() {
            var val = r.value;
            var isForm = (val === 'form-data' || val === 'form-urlencoded');
            bodyContent.style.display = (isForm || val === 'none') ? 'none' : '';
            formDataContainer.style.display = isForm ? '' : 'none';
            markActiveTabUnsaved();
        });
    });

    addFormDataBtn.addEventListener('click', function() { addFormDataRow(); markActiveTabUnsaved(); });
    formDataRows.addEventListener('input', markActiveTabUnsaved);

    function addFormDataRow(key, value) {
        key = key || '';
        value = value || '';
        var row = document.createElement('div');
        row.className = 'form-data-row';
        row.innerHTML =
            '<input type="text" placeholder="Key" value="' + escAttr(key) + '">' +
            '<input type="text" placeholder="Value" value="' + escAttr(value) + '">' +
            '<button class="btn-remove">&times;</button>';
        row.querySelector('.btn-remove').addEventListener('click', function() { row.remove(); markActiveTabUnsaved(); });
        formDataRows.appendChild(row);
    }

    // ═══════════════════════════════════════════════════════
    //  HEADERS
    // ═══════════════════════════════════════════════════════

    addHeaderBtn.addEventListener('click', function() { addHeaderRow(); markActiveTabUnsaved(); });
    headersContainer.addEventListener('input', markActiveTabUnsaved);
    authFields.addEventListener('input', markActiveTabUnsaved);
    authFields.addEventListener('change', markActiveTabUnsaved);

    function addHeaderRow(key, value) {
        key = key || '';
        value = value || '';
        var row = document.createElement('div');
        row.className = 'header-row';
        row.innerHTML =
            '<input type="text" placeholder="Header name" class="header-key" value="' + escAttr(key) + '">' +
            '<input type="text" placeholder="Header value" class="header-value" value="' + escAttr(value) + '">' +
            '<button class="btn-remove">&times;</button>';
        row.querySelector('.btn-remove').addEventListener('click', function() { row.remove(); markActiveTabUnsaved(); });
        headersContainer.appendChild(row);
    }

    // ═══════════════════════════════════════════════════════
    //  SEND REQUEST
    // ═══════════════════════════════════════════════════════

    sendBtn.addEventListener('click', sendRequest);
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') sendRequest();
    });

    function storeResponseOnActiveTab(responseState) {
        var tab = openTabs.find(function(t) { return t.id === activeTabId; });
        if (!tab) return;

        var state = gatherEditorState();
        Object.assign(state, responseState);
        tab.state = state;
        tab.method = state.method;
        persistOpenTabs(false);
    }

    async function sendRequest() {
        var url = replaceEnvVars(urlInput.value.trim());
        if (!url) { alert('Please enter a URL'); return; }
        if (!/^https?:\/\//i.test(url)) url = 'http://' + url;

        // Append auth query param if needed
        var authQS = getAuthQueryString();
        if (authQS) url += (url.includes('?') ? '&' : '?') + authQS;

        // Headers
        var headers = {};
        headersContainer.querySelectorAll('.header-row').forEach(function(row) {
            var k = replaceEnvVars(row.querySelector('.header-key').value.trim());
            var v = replaceEnvVars(row.querySelector('.header-value').value.trim());
            if (k) headers[k] = v;
        });
        var authH = getAuthHeaders();
        Object.keys(authH).forEach(function(k) { headers[k] = authH[k]; });

        // Body
        var method = methodSelect.value;
        var bodyType = document.querySelector('input[name="bodyType"]:checked').value;
        var body = null;
        var contentType = null;

        if (['GET', 'HEAD'].indexOf(method) === -1) {
            if (bodyType === 'json') {
                body = replaceEnvVars(bodyContent.value);
                contentType = 'application/json';
            } else if (bodyType === 'text') {
                body = replaceEnvVars(bodyContent.value);
                contentType = 'text/plain';
            } else if (bodyType === 'xml') {
                body = replaceEnvVars(bodyContent.value);
                contentType = 'application/xml';
            } else if (bodyType === 'form-urlencoded') {
                var pairs = [];
                formDataRows.querySelectorAll('.form-data-row').forEach(function(r) {
                    var k = replaceEnvVars(r.children[0].value.trim());
                    var v = replaceEnvVars(r.children[1].value);
                    if (k) pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(v));
                });
                body = pairs.join('&');
                contentType = 'application/x-www-form-urlencoded';
            } else if (bodyType === 'form-data') {
                var fd = {};
                formDataRows.querySelectorAll('.form-data-row').forEach(function(r) {
                    var k = replaceEnvVars(r.children[0].value.trim());
                    var v = replaceEnvVars(r.children[1].value);
                    if (k) fd[k] = v;
                });
                body = JSON.stringify(fd);
                contentType = 'multipart/form-data';
            }
        }

        var payload = { url: url, method: method, headers: headers, body: body, contentType: contentType };

        showLoading(true);
        var start = performance.now();

        try {
            var res = await fetch('/api/proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            var elapsed = Math.round(performance.now() - start);
            var data = await res.json();

            var sc = data.status || res.status;
            statusCode.textContent = sc;
            statusCode.className = 'status-badge ' + getStatusClass(sc);
            statusCode.dataset.statusText = data.statusText || '';
            responseTime.textContent = elapsed + ' ms';

            var raw = typeof data.body === 'object' ? JSON.stringify(data.body) : String(data.body || '');
            var sizeText = formatBytes(new Blob([raw]).size);
            responseSize.textContent = sizeText;

            displayResponse(data.body);

            var responseHeadersValue = data.headers || {};
            responseHeaders.textContent = stringifyHeadersForDisplay(responseHeadersValue);

            storeResponseOnActiveTab({
                response_status: sc,
                response_status_text: data.statusText || '',
                response_headers: responseHeadersValue,
                response_body: data.body,
                response_time_ms: elapsed,
                response_size: sizeText
            });

            addHistory(method, urlInput.value.trim(), sc);
        } catch (err) {
            var errorElapsed = Math.round(performance.now() - start);
            var errorBody = 'Error: ' + err.message + '\n\nMake sure the proxy server is running (npm start).';
            statusCode.textContent = 'ERR';
            statusCode.className = 'status-badge s5xx';
            statusCode.dataset.statusText = 'Error';
            responseTime.textContent = errorElapsed + ' ms';
            responseSize.textContent = formatBytes(new Blob([errorBody]).size);
            responseHeaders.textContent = '';
            responseBody.textContent = errorBody;
            storeResponseOnActiveTab({
                response_status: null,
                response_status_text: 'Error',
                response_headers: '',
                response_body: errorBody,
                response_time_ms: errorElapsed,
                response_size: responseSize.textContent
            });
        }

        showLoading(false);
    }

    // ═══════════════════════════════════════════════════════
    //  LOOP
    // ═══════════════════════════════════════════════════════

    loopBtn.addEventListener('click', toggleLoop);

    function toggleLoop() {
        loopActive = !loopActive;
        loopBtn.classList.toggle('active', loopActive);
        loopControls.classList.toggle('active', loopActive);

        if (loopActive) {
            loopRun = 0;
            runLoop();
        } else {
            clearTimeout(loopTimer);
            loopStatus.textContent = '';
        }
    }

    function runLoop() {
        if (!loopActive) return;
        var max = parseInt(loopCount.value) || 0;
        if (max > 0 && loopRun >= max) { toggleLoop(); return; }
        loopRun++;
        loopStatus.textContent = 'Run #' + loopRun + (max ? ' / ' + max : '');
        sendRequest();
        loopTimer = setTimeout(runLoop, parseInt(loopInterval.value) || 1000);
    }

    // ═══════════════════════════════════════════════════════
    //  IMPORT (Postman / cURL) — ENHANCED WITH FILE SUPPORT
    // ═══════════════════════════════════════════════════════

    // Import modal elements
    const importProgress = document.getElementById('importProgress');
    const fileDropZone = document.getElementById('fileDropZone');
    const importFileInput = document.getElementById('importFileInput');
    const browseFileBtn = document.getElementById('browseFileBtn');
    const selectedFileName = document.getElementById('selectedFileName');

    let importedFileContent = null;
    let currentImportTab = 'text';

    // Import tab switching
    document.querySelectorAll('.import-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.import-tab').forEach(function(t) {
                t.classList.remove('active');
            });
            document.querySelectorAll('.import-panel').forEach(function(p) {
                p.classList.remove('active');
            });

            tab.classList.add('active');
            currentImportTab = tab.dataset.importTab;
            document.getElementById('import-' + currentImportTab + '-panel').classList.add('active');
        });
    });

    // Open import modal
    importBtn.addEventListener('click', function() {
        importModal.classList.add('active');
        resetImportModal();
    });

    modalClose.addEventListener('click', function() {
        importModal.classList.remove('active');
        resetImportModal();
    });

    // Close modal on background click
    importModal.addEventListener('click', function(e) {
        if (e.target === importModal) {
            importModal.classList.remove('active');
            resetImportModal();
        }
    });

    function resetImportModal() {
        importInput.value = '';
        importedFileContent = null;
        selectedFileName.textContent = '';
        importProgress.style.display = 'none';
        // Remove any error/success messages
        var errors = importModal.querySelectorAll('.import-errors, .import-success');
        errors.forEach(function(el) { el.remove(); });
    }

    // File upload handling
    browseFileBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        importFileInput.click();
    });

    fileDropZone.addEventListener('click', function() {
        importFileInput.click();
    });

    importFileInput.addEventListener('change', function(e) {
        handleFileSelect(e.target.files[0]);
    });

    // Drag and drop handling
    fileDropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        fileDropZone.classList.add('drag-over');
    });

    fileDropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        fileDropZone.classList.remove('drag-over');
    });

    fileDropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        fileDropZone.classList.remove('drag-over');

        var files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    function handleFileSelect(file) {
        if (!file) return;

        // Validate file type
        if (!file.name.endsWith('.json') && file.type !== 'application/json') {
            showToast('Please select a JSON file', 'error');
            return;
        }

        selectedFileName.textContent = '📄 ' + file.name;

        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                importedFileContent = e.target.result;
                // Validate it's valid JSON
                JSON.parse(importedFileContent);
                showToast('File loaded: ' + file.name, 'success');
            } catch (err) {
                showToast('Invalid JSON file: ' + err.message, 'error');
                importedFileContent = null;
                selectedFileName.textContent = '';
            }
        };
        reader.onerror = function() {
            showToast('Error reading file', 'error');
        };
        reader.readAsText(file);
    }

    // Paste cURL directly into URL input (keep existing)
    urlInput.addEventListener('paste', function() {
        setTimeout(function() {
            var v = urlInput.value.trim();
            if (/^curl\s/i.test(v)) {
                importCurlLocal(v);
            }
        }, 50);
    });

    // Import confirmation handler - ENHANCED
    importConfirmBtn.addEventListener('click', async function() {
        var raw = '';
        var isFileImport = false;

        if (currentImportTab === 'file') {
            if (!importedFileContent) {
                showToast('Please select a file first', 'error');
                return;
            }
            raw = importedFileContent;
            isFileImport = true;
        } else {
            raw = importInput.value.trim();
            if (!raw) {
                showToast('Please paste content to import', 'error');
                return;
            }
        }

        // Show loading
        importProgress.style.display = 'flex';
        importConfirmBtn.disabled = true;

        // Remove previous messages
        var prevMessages = importModal.querySelectorAll('.import-errors, .import-success');
        prevMessages.forEach(function(el) { el.remove(); });

        try {
            if (raw.charAt(0) === '{' || raw.charAt(0) === '[') {
                // Postman JSON — send to server for DB import
                var data;
                try {
                    data = JSON.parse(raw);
                } catch (parseErr) {
                    throw new Error('Invalid JSON format: ' + parseErr.message);
                }

                // Validate Postman format
                if (!data.info && !Array.isArray(data) && !data.item) {
                    throw new Error('This JSON file doesn\'t appear to be a valid Postman collection');
                }

                var res = await fetch('/api/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'postman', data: data })
                });

                var json = await res.json();

                if (json.success) {
                    showImportSuccess('Postman collection imported successfully!');
                    loadCollections();
                    // Close modal after short delay
                    setTimeout(function() {
                        importModal.classList.remove('active');
                        resetImportModal();
                    }, 1500);
                } else {
                    showImportError(json.error || 'Failed to import collection');
                }
            } else if (/^curl\s/i.test(raw)) {
                // cURL — parse on server and load into editor
                try {
                    var res2 = await fetch('/api/import', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ type: 'curl', data: raw })
                    });

                    var json2 = await res2.json();

                    if (json2.success) {
                        var parsed = json2.data;
                        methodSelect.value = parsed.method || 'GET';
                        urlInput.value = parsed.url || '';
                        syncParamsFromUrl();

                        headersContainer.innerHTML = '';
                        if (parsed.headers && Array.isArray(parsed.headers)) {
                            parsed.headers.forEach(function(h) {
                                addHeaderRow(h.key, h.value);
                            });
                        }
                        if (!headersContainer.children.length) addHeaderRow();

                        if (parsed.body_content) {
                            bodyContent.value = parsed.body_content;
                            var bt = parsed.body_type || 'text';
                            var radio = document.querySelector('input[name="bodyType"][value="' + bt + '"]');
                            if (radio) radio.checked = true;
                            bodyContent.style.display = '';
                            formDataContainer.style.display = 'none';
                        }

                        showToast('cURL imported into editor', 'success');
                        importModal.classList.remove('active');
                        resetImportModal();
                    } else {
                        showImportError(json2.error || 'Failed to parse cURL');
                    }
                } catch (e) {
                    // Fallback: parse locally
                    console.warn('Server cURL parse failed, using local parser:', e);
                    importCurlLocal(raw);
                    importModal.classList.remove('active');
                    resetImportModal();
                }
            } else {
                showImportError('Unrecognized format. Please paste a valid Postman JSON collection or cURL command.');
            }
        } catch (err) {
            console.error('Import error:', err);
            showImportError(err.message || 'Import failed');
        } finally {
            importProgress.style.display = 'none';
            importConfirmBtn.disabled = false;
        }
    });

    function showImportError(message) {
        var errorDiv = document.createElement('div');
        errorDiv.className = 'import-errors';
        errorDiv.innerHTML = '<h4>⚠️ Import Error</h4><p>' + escHtml(message) + '</p>';
        importConfirmBtn.parentNode.insertBefore(errorDiv, importConfirmBtn);
    }

    function showImportSuccess(message) {
        var successDiv = document.createElement('div');
        successDiv.className = 'import-success';
        successDiv.innerHTML = '<h4>✅ Success</h4><p>' + escHtml(message) + '</p>';
        importConfirmBtn.parentNode.insertBefore(successDiv, importConfirmBtn);
    }

    // Local cURL parser (fallback) - ENHANCED
    function importCurlLocal(cmd) {
        try {
            cmd = cmd.replace(/\\\n/g, ' ').replace(/\\\r\n/g, ' ').trim();

            // Enhanced parsing with support for more curl options
            var method = 'GET';
            var url = '';
            var headers = [];
            var bodyData = '';
            var formFields = [];
            var isMultipart = false;

            var tokens = tokenize(cmd);

            for (var i = 0; i < tokens.length; i++) {
                var t = tokens[i];
                if (t === 'curl') continue;

                // Method
                if (t === '-X' || t === '--request') {
                    method = (tokens[++i] || '').toUpperCase();
                    continue;
                }

                // Headers
                if (t === '-H' || t === '--header') {
                    var hdr = tokens[++i] || '';
                    var ci = hdr.indexOf(':');
                    if (ci > 0) {
                        headers.push({
                            key: hdr.substring(0, ci).trim(),
                            value: hdr.substring(ci + 1).trim()
                        });
                    }
                    continue;
                }

                // Data/Body
                if (['-d', '--data', '--data-raw', '--data-binary'].includes(t)) {
                    bodyData = tokens[++i] || '';
                    continue;
                }

                // URL-encoded data
                if (t === '--data-urlencode') {
                    var encodedData = tokens[++i] || '';
                    var eqIdx = encodedData.indexOf('=');
                    if (eqIdx > 0) {
                        formFields.push({
                            key: encodedData.substring(0, eqIdx),
                            value: encodedData.substring(eqIdx + 1)
                        });
                    }
                    continue;
                }

                // Form fields
                if (t === '-F' || t === '--form') {
                    isMultipart = true;
                    var formField = tokens[++i] || '';
                    var feqIdx = formField.indexOf('=');
                    if (feqIdx > 0) {
                        formFields.push({
                            key: formField.substring(0, feqIdx),
                            value: formField.substring(feqIdx + 1)
                        });
                    }
                    continue;
                }

                // Basic auth
                if (t === '-u' || t === '--user') {
                    var cred = tokens[++i] || '';
                    headers.push({
                        key: 'Authorization',
                        value: 'Basic ' + btoa(cred)
                    });
                    continue;
                }

                // URL
                if (t === '--url') {
                    url = tokens[++i] || '';
                    continue;
                }

                // Skip common flags
                if (['--compressed', '-k', '--insecure', '-s', '--silent',
                     '-S', '-L', '--location', '-v', '--verbose'].includes(t)) {
                    continue;
                }

                // Assume any non-flag token is the URL
                if (t.charAt(0) !== '-' && !url) {
                    url = t;
                }
            }

            // Auto-detect method if body exists
            if ((bodyData || formFields.length > 0) && method === 'GET') {
                method = 'POST';
            }

            // Populate editor
            methodSelect.value = method;
            urlInput.value = url;
            syncParamsFromUrl();

            // Clear and populate headers
            headersContainer.innerHTML = '';
            headers.forEach(function(h) {
                addHeaderRow(h.key, h.value);
            });
            if (!headersContainer.children.length) addHeaderRow();

            // Handle body or form data
            if (formFields.length > 0) {
                // Form data
                formDataRows.innerHTML = '';
                formFields.forEach(function(f) {
                    addFormDataRow(f.key, f.value);
                });

                var bodyType = isMultipart ? 'form-data' : 'form-urlencoded';
                var radio = document.querySelector('input[name="bodyType"][value="' + bodyType + '"]');
                if (radio) {
                    radio.checked = true;
                    bodyContent.style.display = 'none';
                    formDataContainer.style.display = '';
                }
            } else if (bodyData) {
                // Regular body
                bodyContent.value = bodyData;

                // Auto-detect content type
                var detectedType = 'text';
                try {
                    JSON.parse(bodyData);
                    detectedType = 'json';
                } catch (e) {
                    if (bodyData.startsWith('<?xml') || bodyData.startsWith('<')) {
                        detectedType = 'xml';
                    }
                }

                var bodyRadio = document.querySelector('input[name="bodyType"][value="' + detectedType + '"]');
                if (bodyRadio) bodyRadio.checked = true;
                bodyContent.style.display = '';
                formDataContainer.style.display = 'none';
            }

            showToast('cURL command parsed successfully', 'success');

        } catch (err) {
            console.error('cURL parse error:', err);
            showToast('Failed to parse cURL command', 'error');
        }
    }

    function tokenize(cmd) {
        var tokens = [];
        var i = 0;
        while (i < cmd.length) {
            while (i < cmd.length && cmd[i] === ' ') i++;
            if (i >= cmd.length) break;
            if (cmd[i] === "'" || cmd[i] === '"') {
                var q = cmd[i++];
                var tok = '';
                while (i < cmd.length && cmd[i] !== q) {
                    if (cmd[i] === '\\' && i + 1 < cmd.length) { tok += cmd[++i]; }
                    else tok += cmd[i];
                    i++;
                }
                i++; // skip closing quote
                tokens.push(tok);
            } else if (cmd[i] === '$' && cmd[i+1] === '(') {
                // Skip command substitution
                var depth = 1;
                i += 2;
                while (i < cmd.length && depth > 0) {
                    if (cmd[i] === '(') depth++;
                    if (cmd[i] === ')') depth--;
                    i++;
                }
                tokens.push('$(...)');
            } else {
                var tok2 = '';
                while (i < cmd.length && cmd[i] !== ' ') { tok2 += cmd[i++]; }
                tokens.push(tok2);
            }
        }
        return tokens;
    }

    // ═══════════════════════════════════════════════════════
    //  EXPORT cURL
    // ═══════════════════════════════════════════════════════

    exportCurlBtn.addEventListener('click', function() {
        var method = methodSelect.value;
        var url = replaceEnvVars(urlInput.value.trim());
        var parts = ['curl -X ' + method];
        parts.push("'" + url + "'");

        headersContainer.querySelectorAll('.header-row').forEach(function(row) {
            var k = row.querySelector('.header-key').value.trim();
            var v = row.querySelector('.header-value').value.trim();
            if (k) parts.push("-H '" + k + ': ' + v + "'");
        });

        var authH = getAuthHeaders();
        Object.keys(authH).forEach(function(k) {
            parts.push("-H '" + k + ': ' + authH[k] + "'");
        });

        var bodyType = document.querySelector('input[name="bodyType"]:checked').value;
        if (['GET', 'HEAD'].indexOf(method) === -1 && bodyType !== 'none') {
            if (['json', 'text', 'xml'].indexOf(bodyType) !== -1) {
                var b = bodyContent.value.trim();
                if (b) parts.push("-d '" + b.replace(/'/g, "\\'") + "'");
            } else if (bodyType === 'form-urlencoded' || bodyType === 'form-data') {
                var fdParts = [];
                formDataRows.querySelectorAll('.form-data-row').forEach(function(r) {
                    var fk = r.children[0].value.trim();
                    var fv = r.children[1].value;
                    if (fk) fdParts.push(encodeURIComponent(fk) + '=' + encodeURIComponent(fv));
                });
                if (fdParts.length) parts.push("-d '" + fdParts.join('&') + "'");
            }
        }

        exportOutput.value = parts.join(' \\\n  ');
        exportModal.classList.add('active');
    });

    exportModalClose.addEventListener('click', function() { exportModal.classList.remove('active'); });
    copyExportBtn.addEventListener('click', function() {
        exportOutput.select();
        document.execCommand('copy');
        showToast('Copied to clipboard', 'success');
    });

    // ═══════════════════════════════════════════════════════
    //  RESPONSE DISPLAY
    // ═══════════════════════════════════════════════════════

    copyResponseBtn.addEventListener('click', function() {
        var text = responseBody.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
                showToast('Response copied', 'success');
            }).catch(function() {
                showToast('Copy failed', 'error');
            });
        }
    });

    function displayResponse(body) {
        if (typeof body === 'object' && body !== null) {
            responseBody.innerHTML = syntaxHighlight(JSON.stringify(body, null, 2));
        } else {
            var str = String(body || '');
            try {
                var obj = JSON.parse(str);
                responseBody.innerHTML = syntaxHighlight(JSON.stringify(obj, null, 2));
            } catch (e) {
                responseBody.textContent = str;
            }
        }
    }

    function syntaxHighlight(json) {
        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        return json.replace(
            /("(\\u[\da-fA-F]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
            function(match) {
                var cls = 'json-number';
                if (/^"/.test(match)) {
                    cls = /:$/.test(match) ? 'json-key' : 'json-string';
                } else if (/true|false/.test(match)) {
                    cls = 'json-boolean';
                } else if (/null/.test(match)) {
                    cls = 'json-null';
                }
                return '<span class="' + cls + '">' + match + '</span>';
            }
        );
    }

    // ═══════════════════════════════════════════════════════
    //  HELPERS
    // ═══════════════════════════════════════════════════════

    function showLoading(show) {
        loadingOverlay.classList.toggle('active', show);
    }

    function getStatusClass(code) {
        var c = String(code);
        if (c.charAt(0) === '2') return 's2xx';
        if (c.charAt(0) === '3') return 's3xx';
        if (c.charAt(0) === '4') return 's4xx';
        if (c.charAt(0) === '5') return 's5xx';
        return '';
    }

    function formatBytes(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    function escHtml(str) {
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }

});
