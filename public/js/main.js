import { getDomElements } from './dom.js';
import { apiClient } from './api/client.js';
import { clearLegacyGuestHistory, loadEnvVars, saveEnvVarsToStorage, loadHistory, saveHistoryToStorage } from './state/environment.js';
import { loadOpenTabsSnapshot, saveOpenTabsSnapshot, clearOpenTabsSnapshot, clearLegacyOpenTabsSnapshot } from './state/tabs.js';
import { initTheme } from './state/theme.js';
import { canUseWorkspace, continueAsGuest, initializeCurrentUser, isExplicitGuestSession, loginUser, logoutUser, registerUser, subscribeToUserState, userState, waitForAuth } from './state/user.js';
import { MOBILE_RESIZE_QUERY } from './ui/resize-panels.js';
import { loadPanelSizes, savePanelCollapsedState, savePanelSize } from './state/panels.js';
import { createToast } from './ui/toast.js';
import { renderResponseBody, renderResponseIssue, toggleJsonTreeNode } from './ui/response-viewer.js';
import { countTotalRequests } from './features/collections.js';
import { getBlankState } from './features/requests.js';
import { buildSnapshotDefaultName } from './features/snapshots.js';
import { parseResponseTimeMs } from './features/proxy.js';
import { applyParsedImportPayload, normalizeParsedImportPayload, parseCurlFallback } from './features/import-export.js';
import { formatByteCount, escapeHtml, highlightJson } from './utils/format.js';
import { executeDesktopNativeRequest, isDesktopNativeAvailable } from './desktop/bridge.js';

document.addEventListener('DOMContentLoaded', () => {

    // ─── Element References ────────────────────────────────
    const {
        methodSelect, urlInput, executionModeSelect, requestAdvancedToggle, requestBarSecondary, clientCredentialsSelect, sendBtn, loopBtn, loopControls, loopInterval, loopCount, loopStatus,
        bodyContent, prettifyJsonBtn, responseBodyViewer, responseBody, responseHeaders, statusCode, responseTime, responseSize,
        loadingOverlay, headersContainer, addHeaderBtn, importBtn, importModal, modalClose, importInput,
        importConfirmBtn, collectionList, exportCurlBtn, exportModal, exportModalClose, exportOutput, collectionSearchInput,
        copyExportBtn, snapshotNameModal, snapshotNameModalClose, snapshotNameModalTitle, snapshotNameInput, snapshotNameCancelBtn, snapshotNameSaveBtn, envVarsModal, envVarsModalClose, openEnvVarsModalBtn, copyResponseBtn, responseFullscreenBtn, saveResponseSnapshotBtn, responseSnapshotFeedback, authFields, formDataRows, addFormDataBtn,
        formDataContainer, historyList, envVarsList, addEnvVarBtn, paramsBody, addParamBtn, mainContent,
        requestSection, responseSection, responseSheetHandle, responseSheetToggle, sidebarResizeHandle,
        responseResizeHandle, loginScreen, appContainer, sidebar, sidebarCollapseBtn, sidebarToggleBtn, sidebarCloseBtn, themeToggleBtn, rightSidebar,
        rightSidebarCollapseBtn, rightSidebarResizeHandle, rightSidebarToggleBtn, rightSidebarCloseBtn, sidebarCurlOutput,
        generateSidebarCurlBtn, copySidebarCurlBtn, instancesBar, snapshotList, saveInstanceBtn,
        newCollectionBtn, newCollectionModal, newColModalClose, newColName, newColDesc, newColSaveBtn,
        newColCancelBtn, editCollectionId, collectionModalTitle, requestModal, reqModalClose, reqNameInput,
        reqSaveBtn, reqCancelBtn, editRequestId, editRequestCollectionId, requestModalTitle,
        reqCollectionPickerWrap, reqCollectionSelect, reqNewCollectionWrap, reqNewCollectionName, requestTabsEl, newTabBtn, contextMenu, requestContextMenu,
        tabContextMenu, snapshotContextMenu, authStatus, appAuthStatus, authUsername, authPassword, loginBtn, registerBtn, registerSuccessModal, registerRecoveryKey, copyRecoveryKeyBtn, registerRecoveryAcknowledge, registerRecoveryCloseBtn, forgotPasswordBtn, logoutBtn, guestLoginBtn
    } = getDomElements();

    // ─── State ─────────────────────────────────────────────
    let loopActive            = false;
    let loopTimer             = null;
    let loopRun               = 0;
    let history               = [];
    let envVars               = loadEnvVars(userState.currentUser);
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
    const CREATE_NEW_COLLECTION_VALUE = '__new_collection__';
    let selectedSnapshotId     = '';
    let collectionSearchTerm   = '';
    let loadingSnapshotId      = '';
    let snapshotContextTargetId = '';
    let snapshotContextTrigger  = null;
    let pendingSaveToCollectionResolver = null;
    let pendingSnapshotNameResolver = null;
    let workspaceInitialized = false;
    let panelSizesRestored = false;
    let lastMobileResizeLayout = null;
    let sidebarCurlUpdateTimer = null;

    const REQUEST_TAB_NAMES = ['params', 'headers', 'body', 'auth'];
    const EMPTY_RESPONSE_MESSAGE = 'Send a request to see the response here.';
    const EXECUTION_MODE_STORAGE_KEY = 'postboy.executionMode';
    const CLIENT_CREDENTIALS_MODE_STORAGE_KEY = 'postboy.clientCredentialsMode';
    const REQUEST_ADVANCED_EXPANDED_STORAGE_KEY = 'postboy.requestAdvancedExpanded';
    const DEFAULT_EXECUTION_MODE = 'server';
    const EXECUTION_MODES = new Set(['client', 'server', 'desktop-native']);
    const DEFAULT_CLIENT_CREDENTIALS_MODE = 'same-origin';
    const CLIENT_CREDENTIALS_MODES = new Set(['omit', 'same-origin', 'include']);
    const FORBIDDEN_CLIENT_HEADERS = new Set([
        'accept-charset', 'accept-encoding', 'access-control-request-headers',
        'access-control-request-method', 'connection', 'content-length', 'cookie',
        'cookie2', 'date', 'dnt', 'expect', 'host', 'keep-alive', 'origin',
        'permissions-policy', 'referer', 'te', 'trailer', 'transfer-encoding',
        'upgrade', 'via'
    ]);
    const FORBIDDEN_CLIENT_HEADER_PREFIXES = ['proxy-', 'sec-'];

    initExecutionModeControl();
    initRequestBarAdvancedControls();
    var bodyContentCodeMirror = createBodyEditor();
    var isBodyCodeMirrorReady = false;

    function createBodyEditor() {
        var activeEditor = {
            setValue: function(value) {
                if (bodyContent) bodyContent.value = value || '';
            },
            getValue: function() {
                return bodyContent ? bodyContent.value : '';
            },
            setBodyType: function() {},
            requestMeasure: function() {},
            focus: function() {
                if (bodyContent) bodyContent.focus();
            },
            destroy: function() {}
        };

        var proxy = {
            setValue: function(value) { activeEditor.setValue(value); },
            getValue: function() { return activeEditor.getValue(); },
            setBodyType: function(value) { activeEditor.setBodyType(value); },
            requestMeasure: function() { activeEditor.requestMeasure(); },
            focus: function() { activeEditor.focus(); },
            destroy: function() { activeEditor.destroy(); }
        };

        try {
            import('./editor/body-codemirror.js')
                .then(function(module) {
                    return module.initBodyContentCodeMirror({
                        container: document.getElementById('bodyContentCm'),
                        onChange: function(value) {
                            if (bodyContent) bodyContent.value = value;
                            markActiveTabUnsaved();
                        }
                    });
                })
                .then(function(editor) {
                    if (!editor) return;
                    var currentValue = activeEditor.getValue();
                    activeEditor = editor;
                    activeEditor.setValue(currentValue);
                    isBodyCodeMirrorReady = true;
                    if (bodyContent) bodyContent.hidden = true;
                })
                .catch(function(err) {
                    console.error('CodeMirror initialization failed; using textarea fallback.', err);
                    isBodyCodeMirrorReady = false;
                    if (bodyContent) bodyContent.hidden = false;
                });
        } catch (err) {
            console.error('CodeMirror initialization failed; using textarea fallback.', err);
            isBodyCodeMirrorReady = false;
            if (bodyContent) bodyContent.hidden = false;
        }

        return proxy;
    }

    function updateBodyEditorsVisibility(bodyType) {
        var value = bodyType || 'none';
        var isForm = (value === 'form-data' || value === 'form-urlencoded');
        var showRawEditor = !isForm && value !== 'none';
        var showFallbackTextarea = showRawEditor && !isBodyCodeMirrorReady;
        var cmContainer = document.getElementById('bodyContentEditor');
        if (cmContainer) cmContainer.hidden = !showRawEditor;
        if (bodyContent) bodyContent.hidden = !showFallbackTextarea;
        if (formDataContainer) formDataContainer.hidden = !isForm;
    }

    // ─── Mobile Response Bottom Sheet ─────────────────────
    function setResponseSheetState(state) {
        if (!responseSection) return;

        responseSection.classList.toggle('is-open', state === 'open');
        responseSection.classList.toggle('is-collapsed', state === 'collapsed');
        responseSection.classList.toggle('is-closed', state === 'closed');

        var isOpen = state === 'open';
        [responseSheetHandle, responseSheetToggle].forEach(function(control) {
            if (!control) return;
            control.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        if (responseSheetHandle) {
            responseSheetHandle.setAttribute('aria-label', isOpen ? 'Collapse response panel' : 'Open response panel');
        }

        if (responseSheetToggle) {
            responseSheetToggle.textContent = isOpen ? '×' : '⌃';
            responseSheetToggle.setAttribute('aria-label', isOpen ? 'Collapse response panel' : 'Open response panel');
        }
    }

    function openResponseSheetForMobile() {
        if (isMobileResizeLayout()) setResponseSheetState('open');
    }

    function toggleResponseSheet() {
        if (!responseSection || !isMobileResizeLayout()) return;

        setResponseSheetState(responseSection.classList.contains('is-open') ? 'collapsed' : 'open');
    }

    function initResponseSheetControls() {
        if (responseSheetHandle) responseSheetHandle.addEventListener('click', toggleResponseSheet);
        if (responseSheetToggle) responseSheetToggle.addEventListener('click', toggleResponseSheet);
        setResponseSheetState(responseSection && responseSection.classList.contains('is-open') ? 'open' : 'collapsed');
    }



    function initResponseJsonTreeControls() {
        if (!responseBodyViewer || !responseBody) return;

        responseBodyViewer.addEventListener('click', function(event) {
            if (!event.target.closest) return;
            var toggle = event.target.closest('.json-tree-toggle');
            if (!toggle || !responseBodyViewer.contains(toggle)) return;

            event.preventDefault();
            toggleJsonTreeNode(responseBody, toggle);
        });
    }


    function isRecoverableClientModeFailure(executionMode, diagnostics) {
        if (executionMode !== 'client') return false;
        var category = diagnostics && diagnostics.failureCategory;
        return category === 'browser-cors'
            || category === 'network-failure'
            || category === 'mixed-content'
            || category === 'likely-browser-restriction';
    }

    function trackModeRecoveryInteraction(eventName, payload) {
        var data = Object.assign({
            source: 'response-error-card',
            timestamp: new Date().toISOString()
        }, payload || {});

        if (window && window.postboyTelemetry && typeof window.postboyTelemetry.track === 'function') {
            window.postboyTelemetry.track(eventName, data);
            return;
        }

        if (window && window.analytics && typeof window.analytics.track === 'function') {
            window.analytics.track(eventName, data);
            return;
        }

        if (window && typeof window.gtag === 'function') {
            window.gtag('event', eventName, data);
        }
    }

    async function handleSwitchToServerProxyRetry(event) {
        if (event && event.preventDefault) event.preventDefault();

        if (executionModeSelect) {
            executionModeSelect.value = 'server';
            executionModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }

        trackModeRecoveryInteraction('request_mode_auto_switched', { to_mode: 'server' });
        showToast('Switched to Server proxy. Retrying request…', 'info');

        try {
            var retrySucceeded = await sendRequest();
            if (retrySucceeded) {
                showToast('Retry completed using Server proxy.', 'success');
                trackModeRecoveryInteraction('request_mode_retry_result', { to_mode: 'server', result: 'success' });
            } else {
                showToast('Retry failed after switching to Server proxy.', 'error');
                trackModeRecoveryInteraction('request_mode_retry_result', { to_mode: 'server', result: 'failure' });
            }
        } catch (err) {
            showToast('Retry failed after switching to Server proxy.', 'error');
            trackModeRecoveryInteraction('request_mode_retry_result', {
                to_mode: 'server',
                result: 'failure',
                message: err && err.message ? err.message : 'retry failed'
            });
        }
    }

    function initResponseIssueRecoveryControls() {
        if (!responseBodyViewer) return;
        responseBodyViewer.addEventListener('click', function(event) {
            if (!event.target.closest) return;
            var trigger = event.target.closest('[data-action="switch-to-server-proxy-retry"]');
            if (!trigger || !responseBodyViewer.contains(trigger)) return;
            handleSwitchToServerProxyRetry(event);
        });
    }

    // ─── Response Viewer Fullscreen ───────────────────────
    function setResponseFullscreen(isFullscreen) {
        if (!responseSection || !responseFullscreenBtn) return;

        responseSection.classList.toggle('is-fullscreen', isFullscreen);
        document.body.classList.toggle('response-viewer-fullscreen-active', isFullscreen);
        responseFullscreenBtn.setAttribute('aria-pressed', isFullscreen ? 'true' : 'false');
        responseFullscreenBtn.textContent = isFullscreen ? '↙ Exit Fullscreen' : '⛶ Fullscreen';
        responseFullscreenBtn.setAttribute('title', isFullscreen ? 'Exit response fullscreen' : 'Expand response viewer');
    }

    function toggleResponseFullscreen() {
        if (!responseSection) return;
        setResponseFullscreen(!responseSection.classList.contains('is-fullscreen'));
    }

    function initResponseFullscreenControl() {
        if (!responseFullscreenBtn || !responseSection) return;

        responseFullscreenBtn.addEventListener('click', toggleResponseFullscreen);
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && responseSection.classList.contains('is-fullscreen')) {
                setResponseFullscreen(false);
                responseFullscreenBtn.focus();
            }
        });
        setResponseFullscreen(false);
    }

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

    function getRightSidebarWidthBounds() {
        var rightSidebarStyle = rightSidebar ? getComputedStyle(rightSidebar) : null;
        var cssMin = rightSidebarStyle ? cssLengthToPx(rightSidebarStyle.minWidth, 260) : 260;
        var cssMax = rightSidebarStyle ? cssLengthToPx(rightSidebarStyle.maxWidth, 360) : 360;

        return {
            min: getCssLength('--right-sidebar-min-width', cssMin),
            max: Math.min(getCssLength('--right-sidebar-max-width', cssMax), Math.max(cssMin, window.innerWidth - 360))
        };
    }

    function getMainContentVerticalMetrics() {
        if (!mainContent) {
            return {
                bottom: window.innerHeight,
                availableForRequestAndResponse: window.innerHeight
            };
        }

        var mainRect = mainContent.getBoundingClientRect();
        var mainStyle = getComputedStyle(mainContent);
        var paddingTop = cssLengthToPx(mainStyle.paddingTop, 0);
        var paddingBottom = cssLengthToPx(mainStyle.paddingBottom, 0);
        var rowGap = cssLengthToPx(mainStyle.rowGap || mainStyle.gap, 0);
        var occupiedHeight = paddingTop + paddingBottom;
        var visibleChildren = Array.prototype.filter.call(mainContent.children, function(child) {
            return child !== requestSection && child !== responseSection && getComputedStyle(child).display !== 'none';
        });

        visibleChildren.forEach(function(child) {
            var childStyle = getComputedStyle(child);
            occupiedHeight += child.getBoundingClientRect().height;
            occupiedHeight += cssLengthToPx(childStyle.marginTop, 0) + cssLengthToPx(childStyle.marginBottom, 0);
        });

        if (visibleChildren.length > 0) {
            occupiedHeight += rowGap * (visibleChildren.length + 1);
        }

        return {
            bottom: mainRect.bottom - paddingBottom,
            availableForRequestAndResponse: Math.max(0, mainRect.height - occupiedHeight)
        };
    }

    function getResponseHeightBounds() {
        var metrics = getMainContentVerticalMetrics();
        var requestMinHeight = getCssLength('--request-section-min-height', 180);
        var maxFromMainContent = Math.max(
            getCssLength('--response-section-min-height', 180),
            metrics.availableForRequestAndResponse - requestMinHeight
        );

        return {
            min: getCssLength('--response-section-min-height', 180),
            max: Math.min(getCssLength('--response-section-max-height', 0.7 * window.innerHeight), maxFromMainContent)
        };
    }

    function applySidebarWidth(width, persist) {
        if (!sidebar || isMobileResizeLayout()) return;

        var bounds = getSidebarWidthBounds();
        var clampedWidth = clamp(width, bounds.min, bounds.max);
        sidebar.style.width = clampedWidth + 'px';

        if (persist) savePanelSize('sidebar', clampedWidth);
    }

    function applyRightSidebarWidth(width, persist) {
        if (!rightSidebar || isMobileResizeLayout()) return;

        var bounds = getRightSidebarWidthBounds();
        var clampedWidth = clamp(width, bounds.min, bounds.max);
        rightSidebar.style.width = clampedWidth + 'px';

        if (persist) savePanelSize('rightSidebar', clampedWidth);
    }

    function applyResponseHeight(height, persist) {
        if (!responseSection || isMobileResizeLayout()) return;

        var bounds = getResponseHeightBounds();
        var clampedHeight = clamp(height, bounds.min, bounds.max);
        responseSection.style.height = clampedHeight + 'px';
        responseSection.style.flex = '0 0 auto';

        if (persist) savePanelSize('response', clampedHeight);
    }

    function restorePanelSizes() {
        if (isMobileResizeLayout() || panelSizesRestored) return;

        var storedPanelSizes = loadPanelSizes();
        var storedSidebarWidth = storedPanelSizes.sidebar;
        var storedRightSidebarWidth = storedPanelSizes.rightSidebar;
        var storedResponseHeight = storedPanelSizes.response;

        if (!Number.isNaN(storedSidebarWidth)) applySidebarWidth(storedSidebarWidth, false);
        if (!Number.isNaN(storedRightSidebarWidth)) applyRightSidebarWidth(storedRightSidebarWidth, false);
        if (!Number.isNaN(storedResponseHeight)) applyResponseHeight(storedResponseHeight, false);
        setSidebarCollapsed(storedPanelSizes.sidebarCollapsed, false, true);
        setRightSidebarCollapsed(storedPanelSizes.rightSidebarCollapsed, false, true);
        panelSizesRestored = true;
        syncResizeHandlesForViewport();
    }

    function clearInlinePanelSizesForMobile() {
        if (sidebar) sidebar.style.width = '';
        if (rightSidebar) rightSidebar.style.width = '';
        if (responseSection) {
            responseSection.style.height = '';
            responseSection.style.flex = '';
        }
    }

    function syncResizeHandlesForViewport() {
        var disabled = isMobileResizeLayout();
        var sidebarCollapsed = sidebar && sidebar.classList.contains('is-collapsed');
        var rightCollapsed = rightSidebar && rightSidebar.classList.contains('is-collapsed');

        if (sidebarResizeHandle) sidebarResizeHandle.setAttribute('aria-disabled', (disabled || sidebarCollapsed) ? 'true' : 'false');
        if (rightSidebarResizeHandle) rightSidebarResizeHandle.setAttribute('aria-disabled', (disabled || rightCollapsed) ? 'true' : 'false');
        if (responseResizeHandle) responseResizeHandle.setAttribute('aria-disabled', disabled ? 'true' : 'false');

        if (disabled) clearInlinePanelSizesForMobile();
    }

    function stopPanelResize(handle, moveHandler, upHandler, bodyClass) {
        document.removeEventListener('pointermove', moveHandler);
        document.removeEventListener('pointerup', upHandler);
        document.removeEventListener('pointercancel', upHandler);
        document.body.classList.remove('resizing-panels', bodyClass);
        if (handle) handle.classList.remove('active');
    }

    function restorePanelsForDesktopIfNeeded() {
        var isMobileLayout = isMobileResizeLayout();
        var transitionedToDesktop = lastMobileResizeLayout === true && !isMobileLayout;
        if ((!panelSizesRestored && !isMobileLayout) || transitionedToDesktop) restorePanelSizes();
        lastMobileResizeLayout = isMobileLayout;
    }

    function initPanelResizing() {
        if (sidebarResizeHandle && sidebar) {
            sidebarResizeHandle.addEventListener('pointerdown', function(event) {
                if (isMobileResizeLayout() || (sidebar && sidebar.classList.contains('is-collapsed'))) return;

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

        if (rightSidebarResizeHandle && rightSidebar) {
            rightSidebarResizeHandle.addEventListener('pointerdown', function(event) {
                if (isMobileResizeLayout() || (rightSidebar && rightSidebar.classList.contains('is-collapsed'))) return;

                event.preventDefault();
                rightSidebarResizeHandle.classList.add('active');
                document.body.classList.add('resizing-panels', 'resizing-sidebar');

                function onMove(moveEvent) {
                    var appRight = appContainer ? appContainer.getBoundingClientRect().right : window.innerWidth;
                    applyRightSidebarWidth(appRight - moveEvent.clientX, true);
                }

                function onUp() {
                    stopPanelResize(rightSidebarResizeHandle, onMove, onUp, 'resizing-sidebar');
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

                var pointerOffsetFromResponseTop = event.clientY - responseSection.getBoundingClientRect().top;

                function onMove(moveEvent) {
                    var metrics = getMainContentVerticalMetrics();
                    var nextResponseTop = moveEvent.clientY - pointerOffsetFromResponseTop;
                    applyResponseHeight(metrics.bottom - nextResponseTop, true);
                }

                function onUp() {
                    stopPanelResize(responseResizeHandle, onMove, onUp, 'resizing-response');
                }

                document.addEventListener('pointermove', onMove);
                document.addEventListener('pointerup', onUp);
                document.addEventListener('pointercancel', onUp);
            });
        }

        window.addEventListener('resize', function() {
            syncResizeHandlesForViewport();
            restorePanelsForDesktopIfNeeded();
        });
        syncResizeHandlesForViewport();
        restorePanelsForDesktopIfNeeded();
        window.addEventListener('load', function() {
            syncResizeHandlesForViewport();
            restorePanelsForDesktopIfNeeded();
        }, { once: true });
    }

    function setSidebarCollapsed(collapsed, persist, skipSync) {
        if (!sidebar) return;
        sidebar.classList.toggle('is-collapsed', !!collapsed);
        if (sidebarCollapseBtn) {
            sidebarCollapseBtn.textContent = collapsed ? '⟩⟩' : '⟨⟨';
            sidebarCollapseBtn.setAttribute('aria-label', collapsed ? 'Expand left sidebar' : 'Collapse left sidebar');
            sidebarCollapseBtn.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
        }
        if (persist) savePanelCollapsedState('sidebar', !!collapsed);
        if (!skipSync) syncResizeHandlesForViewport();
    }

    function setRightSidebarCollapsed(collapsed, persist, skipSync) {
        if (!rightSidebar) return;
        rightSidebar.classList.toggle('is-collapsed', !!collapsed);
        if (rightSidebarCollapseBtn) {
            rightSidebarCollapseBtn.textContent = collapsed ? '⟨⟨' : '⟩⟩';
            rightSidebarCollapseBtn.setAttribute('aria-label', collapsed ? 'Expand tools sidebar' : 'Collapse tools sidebar');
            rightSidebarCollapseBtn.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
        }
        if (persist) savePanelCollapsedState('rightSidebar', !!collapsed);
        if (!skipSync) syncResizeHandlesForViewport();
    }

    // ─── Init ──────────────────────────────────────────────
    initTheme(themeToggleBtn);
    initResponseSheetControls();
    initResponseFullscreenControl();
    initResponseJsonTreeControls();
    initResponseIssueRecoveryControls();
    initPanelResizing();
    renderHistory();
    renderEnvVars();
    initAuthControls();
    startAuthFlow();

    // ─── Close context menus on click elsewhere ────────────
    document.addEventListener('click', function() {
        contextMenu.classList.remove('active');
        requestContextMenu.classList.remove('active');
        tabContextMenu.classList.remove('active');
        closeSnapshotContextMenu();
    });

    // ─── Mobile Sidebar Toggles ───────────────────────────
    function setSidebarOpen(isOpen) {
        if (!appContainer) return;

        appContainer.classList.toggle('sidebar-open', isOpen);
        if (isOpen) setRightSidebarOpen(false);
        if (sidebarToggleBtn) sidebarToggleBtn.setAttribute('aria-expanded', String(isOpen));
    }

    function setRightSidebarOpen(isOpen) {
        if (!appContainer) return;

        appContainer.classList.toggle('right-sidebar-open', isOpen);
        if (isOpen) setSidebarOpen(false);
        if (rightSidebarToggleBtn) rightSidebarToggleBtn.setAttribute('aria-expanded', String(isOpen));
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
    if (sidebarCollapseBtn) {
        sidebarCollapseBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            setSidebarCollapsed(!(sidebar && sidebar.classList.contains('is-collapsed')), true);
        });
    }

    if (rightSidebarToggleBtn) {
        rightSidebarToggleBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            setRightSidebarOpen(!appContainer.classList.contains('right-sidebar-open'));
        });
    }

    if (rightSidebarCloseBtn) {
        rightSidebarCloseBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            setRightSidebarOpen(false);
        });
    }
    if (rightSidebarCollapseBtn) {
        rightSidebarCollapseBtn.addEventListener('click', function(event) {
            event.stopPropagation();
            setRightSidebarCollapsed(!(rightSidebar && rightSidebar.classList.contains('is-collapsed')), true);
        });
    }

    document.addEventListener('click', function(event) {
        if (!isMobileResizeLayout() || !appContainer) return;

        var target = event.target;
        if (appContainer.classList.contains('sidebar-open') && sidebar) {
            if (!sidebar.contains(target) && (!sidebarToggleBtn || !sidebarToggleBtn.contains(target))) {
                setSidebarOpen(false);
            }
        }

        if (appContainer.classList.contains('right-sidebar-open') && rightSidebar) {
            if (!rightSidebar.contains(target) && (!rightSidebarToggleBtn || !rightSidebarToggleBtn.contains(target))) {
                setRightSidebarOpen(false);
            }
        }
    });

    window.addEventListener('resize', function() {
        if (!isMobileResizeLayout()) {
            setSidebarOpen(false);
            setRightSidebarOpen(false);
        }
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
            if (tab.dataset.target === 'env-panel') {
                openEnvVarsModal();
                return;
            }
            activateSidebarPanel(tab.dataset.target);
        });
    });

    // ─── Right Sidebar (always-visible sections) ───────────
    function openSnapshotsPanel() {
        setRightSidebarOpen(true);
    }

    function showSnapshotSavedFeedback(snapshotId) {
        if (!responseSnapshotFeedback) return;
        var id = snapshotId ? String(snapshotId) : '';
        var url = id ? '#snapshot-' + encodeURIComponent(id) : '#';
        responseSnapshotFeedback.innerHTML = '✅ Snapshot saved. <a href="' + url + '" data-action="open-snapshots-panel">View in Snapshots panel</a>.';
    }

    if (responseSnapshotFeedback) {
        responseSnapshotFeedback.addEventListener('click', function(event) {
            var trigger = event.target.closest('[data-action="open-snapshots-panel"]');
            if (!trigger) return;
            event.preventDefault();
            openSnapshotsPanel();
            var hash = trigger.getAttribute('href') || '';
            var snapshotId = hash.indexOf('#snapshot-') === 0 ? decodeURIComponent(hash.replace('#snapshot-', '')) : '';
            if (snapshotId) highlightSnapshotRow(snapshotId);
        });
    }


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
        if (tabName === 'body' && bodyContentCodeMirror) bodyContentCodeMirror.requestMeasure();
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
        createToast(message, type);
    }


    function setAuthenticatedViewVisible(showApp) {
        if (loginScreen) loginScreen.hidden = showApp;
        if (appContainer) appContainer.hidden = !showApp;
    }

    function getAuthStatusText(state) {
        if (state.loading) return 'Checking account…';
        if (state.error) return state.error;

        var user = state.currentUser;
        if (!user) return 'Sign in or continue as guest to start using PostBoy.';
        if (user.is_guest) {
            return state.explicitGuest ? 'Guest mode — log in to save history' : 'Choose how you want to continue.';
        }
        return 'Signed in as ' + (user.username || 'User');
    }

    function renderAuthControls(state) {
        var isLoading = !!state.loading;
        var showApp = canUseWorkspace(state);
        var statusText = getAuthStatusText(state);

        setAuthenticatedViewVisible(showApp);

        [authStatus, appAuthStatus].forEach(function(statusEl) {
            if (!statusEl) return;
            statusEl.textContent = statusText;
            statusEl.classList.toggle('auth-error', !!state.error);
        });

        [authUsername, authPassword, loginBtn, registerBtn, forgotPasswordBtn, logoutBtn, guestLoginBtn].forEach(function(control) {
            if (control) control.disabled = isLoading;
        });
    }

    function getAuthCredentials() {
        return {
            username: authUsername ? authUsername.value.trim() : '',
            password: authPassword ? authPassword.value : ''
        };
    }

    function clearAuthInputs() {
        if (authPassword) authPassword.value = '';
    }

    function clearUserScopedUiState(options) {
        var resetStorageBackedState = options && options.resetStorageBackedState;
        var resetEditorState = options && options.resetEditorState;

        history = resetStorageBackedState ? [] : loadHistory(userState.currentUser);
        envVars = resetStorageBackedState ? {} : loadEnvVars(userState.currentUser);
        renderHistory();
        renderEnvVars();
        collectionsData = [];
        expandedCollections.clear();
        activeRequestInstances = [];
        selectedSnapshotId = '';
        loadingSnapshotId = '';
        snapshotContextTargetId = '';
        snapshotContextTrigger = null;
        contextTarget = null;
        dragState = null;
        draggedTabId = null;
        clearLegacyOpenTabsSnapshot();
        openTabs = [];
        activeTabId = null;
        collectionList.innerHTML = '<p class="empty-state">Loading your collections…</p>';
        renderCollections([]);
        renderRequestTabs();
        renderInstancesBar([]);

        if (resetEditorState) {
            activeRequestTab = 'params';
            activateRequestTab(activeRequestTab);
            loadStateIntoEditor(getBlankState(), 'GET');
            restoreResponsePane(getBlankState());
        }
    }

    function clearLogoutUiState() {
        clearUserScopedUiState({ resetStorageBackedState: true, resetEditorState: true });
        workspaceInitialized = false;
    }

    async function reloadUserScopedData() {
        clearUserScopedUiState();
        await initializeRequestTabs();
    }

    async function ensureWorkspaceReady() {
        if (!workspaceInitialized) {
            await initializeAuthenticatedWorkspace();
            return;
        }
        await reloadUserScopedData();
    }

    function initAuthControls() {
        subscribeToUserState(renderAuthControls);

        async function copyTextToClipboard(text) {
            if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
                await navigator.clipboard.writeText(text);
                return true;
            }

            var helper = document.createElement('textarea');
            helper.value = text;
            helper.setAttribute('readonly', '');
            helper.style.position = 'fixed';
            helper.style.top = '-9999px';
            helper.style.left = '-9999px';
            document.body.appendChild(helper);
            helper.focus();
            helper.select();

            var copied = false;
            try {
                copied = document.execCommand('copy');
            } finally {
                document.body.removeChild(helper);
            }
            if (!copied) throw new Error('Clipboard unavailable');
            return true;
        }

        function closeRegisterSuccessModal() {
            if (!registerSuccessModal) return;
            registerSuccessModal.classList.remove('show');
            registerSuccessModal.setAttribute('aria-hidden', 'true');
            if (registerRecoveryKey) registerRecoveryKey.value = '';
            if (registerRecoveryAcknowledge) registerRecoveryAcknowledge.checked = false;
            if (registerRecoveryCloseBtn) registerRecoveryCloseBtn.disabled = true;
        }

        function openRegisterSuccessModal(recoveryKey) {
            if (!registerSuccessModal || !registerRecoveryKey) return;
            registerRecoveryKey.value = recoveryKey || '';
            if (registerRecoveryAcknowledge) registerRecoveryAcknowledge.checked = false;
            if (registerRecoveryCloseBtn) registerRecoveryCloseBtn.disabled = true;
            registerSuccessModal.classList.add('show');
            registerSuccessModal.setAttribute('aria-hidden', 'false');
            registerRecoveryKey.focus();
            registerRecoveryKey.select();
        }

        if (registerRecoveryAcknowledge && registerRecoveryCloseBtn) {
            registerRecoveryAcknowledge.addEventListener('change', function() {
                registerRecoveryCloseBtn.disabled = !registerRecoveryAcknowledge.checked;
            });
        }

        if (copyRecoveryKeyBtn) {
            copyRecoveryKeyBtn.addEventListener('click', async function() {
                var recoveryKey = registerRecoveryKey ? registerRecoveryKey.value : '';
                if (!recoveryKey) {
                    showToast('Recovery key unavailable', 'error');
                    return;
                }
                try {
                    await copyTextToClipboard(recoveryKey);
                    showToast('Recovery key copied', 'success');
                } catch (err) {
                    showToast('Copy failed. Copy it manually.', 'error');
                }
            });
        }

        if (registerRecoveryCloseBtn) {
            registerRecoveryCloseBtn.addEventListener('click', function() {
                closeRegisterSuccessModal();
            });
        }

        async function submitAuth(action) {
            var credentials = getAuthCredentials();
            if (!credentials.username || !credentials.password) {
                showToast('Enter a username and password', 'error');
                return;
            }

            try {
                if (action === 'register') {
                    var result = await registerUser(credentials);
                    showToast('Account created', 'success');
                    openRegisterSuccessModal(result && result.recovery_key ? result.recovery_key : '');
                } else {
                    await loginUser(credentials);
                    showToast('Signed in', 'success');
                }
                clearAuthInputs();
                await ensureWorkspaceReady();
            } catch (err) {
                showToast('Auth error: ' + err.message, 'error');
            }
        }

        if (loginBtn) loginBtn.addEventListener('click', function() { submitAuth('login'); });
        if (registerBtn) registerBtn.addEventListener('click', function() { submitAuth('register'); });
        if (guestLoginBtn) {
            guestLoginBtn.addEventListener('click', async function() {
                try {
                    await continueAsGuest();
                    showToast('Continuing as guest', 'success');
                    await ensureWorkspaceReady();
                } catch (err) {
                    showToast('Guest mode failed: ' + err.message, 'error');
                }
            });
        }
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async function() {
                try {
                    await logoutUser();
                    clearLogoutUiState();
                    showToast('Signed out', 'success');
                    setAuthenticatedViewVisible(false);
                } catch (err) {
                    showToast('Logout failed: ' + err.message, 'error');
                }
            });
        }
        [authUsername, authPassword].forEach(function(input) {
            if (!input) return;
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') submitAuth('login');
            });
        });
    }

    async function initializeAuthenticatedWorkspace() {
        await waitForAuth();
        if (!canUseWorkspace(userState)) return;
        clearLegacyGuestHistory();
        clearLegacyOpenTabsSnapshot();
        history = loadHistory(userState.currentUser);
        envVars = loadEnvVars(userState.currentUser);
        renderHistory();
        renderEnvVars();
        await initializeRequestTabs();
        workspaceInitialized = true;
    }

    async function startAuthFlow() {
        await initializeCurrentUser();
        if (canUseWorkspace(userState)) {
            await initializeAuthenticatedWorkspace();
            if (isExplicitGuestSession(userState)) {
                showToast('Continuing as guest', 'success');
            }
        }
    }

    // ═══════════════════════════════════════════════════════
    //  COLLECTIONS CRUD (Frontend ↔ API)
    // ═══════════════════════════════════════════════════════

    async function loadCollections() {
        try {
            await waitForAuth();
            saveExpandedState(); // Save current expanded state

            var collections = await apiClient.getCollections();

            collectionsData = collections;
            renderCollections(collections);
            // Re-highlight active tab's request in sidebar
            var activeTab = openTabs.find(function(t){ return t.id === activeTabId; });
            if (activeTab) highlightSidebarForTab(activeTab);
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
        applyCollectionFilter();
    }


    function applyCollectionFilter() {
        var term = (collectionSearchTerm || '').trim().toLowerCase();
        var folders = Array.from(collectionList.querySelectorAll('.collection-folder'));
        folders.forEach(function(folder) {
            var folderName = ((folder.querySelector(':scope > .folder-header .folder-name') || {}).textContent || '').toLowerCase();
            var requestRows = Array.from(folder.querySelectorAll(':scope > .folder-items .request-item'));
            var requestMatch = requestRows.some(function(row) {
                return ((row.querySelector('.request-item-name') || {}).textContent || '').toLowerCase().indexOf(term) !== -1;
            });
            var folderMatch = folderName.indexOf(term) !== -1;
            var visible = !term || folderMatch || requestMatch;
            folder.style.display = visible ? '' : 'none';

            if (term && visible) {
                var items = folder.querySelector(':scope > .folder-items');
                var arrow = folder.querySelector(':scope > .folder-header .folder-arrow');
                if (items) items.classList.add('open');
                if (arrow) arrow.classList.add('open');
            }
        });

        Array.from(collectionList.querySelectorAll('.request-item')).forEach(function(row) {
            var match = !term || ((row.querySelector('.request-item-name') || {}).textContent || '').toLowerCase().indexOf(term) !== -1;
            row.style.display = match ? '' : 'none';
        });
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

    if (collectionSearchInput) {
        collectionSearchInput.addEventListener('input', function(e) {
            collectionSearchTerm = e.target.value || "";
            applyCollectionFilter();
        });
    }

    async function initializeRequestTabs() {
        await loadCollections();
        if (!restoreSavedTabs()) {
            openNewTab();
        }
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
        var raw = loadOpenTabsSnapshot(userState.currentUser);
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
                restoreResponsePane(activeTab.state);
                highlightSidebarForTab(activeTab);
            }
            persistOpenTabs(false);
            return true;
        } catch (err) {
            console.warn('Failed to restore saved tabs:', err);
            clearOpenTabsSnapshot(userState.currentUser);
            return false;
        }
    }

    function persistOpenTabs(includeEditorState) {
        if (includeEditorState !== false && activeTabId) {
            var activeTab = openTabs.find(function(tab) { return tab.id === activeTabId; });
            if (activeTab) {
                activeTab.state = mergeStoredResponseState(gatherRequestState(), activeTab.state);
                activeTab.method = methodSelect.value || activeTab.method || 'GET';
            }
        }

        try {
            saveOpenTabsSnapshot({
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
            }, userState.currentUser);
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
        '<span class="folder-name" title="' + escHtml(col.name) + '">' + escHtml(col.name) + '</span>' +
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
                '<span class="request-item-name" title="' + escHtml(req.name) + '">' + escHtml(req.name) + '</span>';

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
        document.querySelectorAll('.dragging, .drag-over, .drag-over-valid, .drag-over-invalid').forEach(function(el) {
            el.classList.remove('dragging', 'drag-over', 'drag-over-valid', 'drag-over-invalid');
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
            if (dragState.id === parseInt(reqEl.dataset.id, 10)) return;

            if (dragState.collectionId !== parseInt(reqEl.dataset.collectionId, 10)) {
                reqEl.classList.add('drag-over-invalid');
                return;
            }

            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            reqEl.classList.add('drag-over');
        });

        reqEl.addEventListener('dragleave', function() {
            reqEl.classList.remove('drag-over', 'drag-over-invalid');
        });

        reqEl.addEventListener('drop', function(e) {
            if (!dragState || dragState.type !== 'request') return;
            reqEl.classList.remove('drag-over', 'drag-over-invalid');
            if (dragState.id === parseInt(reqEl.dataset.id, 10)) return;
            if (dragState.collectionId !== parseInt(reqEl.dataset.collectionId, 10)) return;

            e.preventDefault();
            e.stopPropagation();
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
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            container.classList.remove('drag-over-invalid');
            container.classList.add('drag-over', 'drag-over-valid');
        });

        container.addEventListener('dragleave', function(e) {
            if (!container.contains(e.relatedTarget)) {
                container.classList.remove('drag-over', 'drag-over-valid', 'drag-over-invalid');
            }
        });

        container.addEventListener('drop', function(e) {
            if (!dragState || dragState.type !== 'request') return;

            var targetCollectionId = parseInt(collectionId, 10);
            e.preventDefault();
            e.stopPropagation();
            container.classList.remove('drag-over', 'drag-over-valid', 'drag-over-invalid');

            if (dragState.collectionId === targetCollectionId) {
                reorderRequestElement(null, e.clientY, container);
            } else {
                moveRequestToCollection(dragState.id, targetCollectionId);
            }
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
            await apiClient.reorderCollections(parentId, orderedIds);
            showToast('Collection order saved', 'success');
            loadCollections();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
            loadCollections();
        }
    }

    async function moveRequestToCollection(requestId, targetCollectionId) {
        try {
            var movedRequest = await apiClient.moveRequest(requestId, targetCollectionId);
            var movedCollectionId = parseInt((movedRequest && movedRequest.collection_id) || targetCollectionId, 10);
            openTabs.forEach(function(tab) {
                if (parseInt(tab.requestId, 10) === parseInt(requestId, 10)) {
                    tab.collectionId = movedCollectionId;
                }
            });
            persistOpenTabs(false);
            showToast('Request moved', 'success');
            await loadCollections();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
            await loadCollections();
        }
    }

    async function persistRequestOrder(collectionId, orderedIds) {
        try {
            await apiClient.reorderRequests(collectionId, orderedIds);
            showToast('Request order saved', 'success');
            loadCollections();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
            loadCollections();
        }
    }

    // var totalRequests = countTotalRequests(col);

    function showCtxMenu(menu, x, y) {
        contextMenu.classList.remove('active');
        requestContextMenu.classList.remove('active');
        tabContextMenu.classList.remove('active');
        closeSnapshotContextMenu();

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

    function closeSnapshotContextMenu(options) {
        if (!snapshotContextMenu) return;

        var shouldRestoreFocus = options && options.restoreFocus;
        snapshotContextMenu.classList.remove('active');
        snapshotContextTargetId = '';

        if (snapshotContextTrigger) {
            snapshotContextTrigger.setAttribute('aria-expanded', 'false');
            if (shouldRestoreFocus) snapshotContextTrigger.focus();
        }
        snapshotContextTrigger = null;
    }

    function showSnapshotContextMenu(snapshotId, x, y, trigger) {
        if (!snapshotContextMenu || !snapshotId) return;

        contextMenu.classList.remove('active');
        requestContextMenu.classList.remove('active');
        tabContextMenu.classList.remove('active');
        closeSnapshotContextMenu();

        snapshotContextTargetId = String(snapshotId);
        snapshotContextTrigger = trigger || null;
        if (snapshotContextTrigger) {
            snapshotContextTrigger.setAttribute('aria-expanded', 'true');
        }

        snapshotContextMenu.style.left = x + 'px';
        snapshotContextMenu.style.top = y + 'px';
        snapshotContextMenu.classList.add('active');

        setTimeout(function() {
            var rect = snapshotContextMenu.getBoundingClientRect();
            if (rect.right > window.innerWidth) {
                snapshotContextMenu.style.left = (window.innerWidth - rect.width - 10) + 'px';
            }
            if (rect.bottom > window.innerHeight) {
                snapshotContextMenu.style.top = (window.innerHeight - rect.height - 10) + 'px';
            }
        }, 0);
    }

    // ─── Snapshot Context Menu Actions ─────────────────────
    snapshotContextMenu.querySelectorAll('.context-menu-item').forEach(function(item) {
        item.addEventListener('click', function(e) {
            e.stopPropagation();
            var action = item.dataset.action;
            var snapshotId = snapshotContextTargetId;
            closeSnapshotContextMenu({ restoreFocus: true });
            if (!snapshotId) return;

            if (action === 'rename') {
                renameSelectedInstance(snapshotId);
            } else if (action === 'delete') {
                deleteSelectedInstance(snapshotId);
            }
        });

        item.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                item.click();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeSnapshotContextMenu({ restoreFocus: true });
            } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                var menuItems = Array.prototype.slice.call(snapshotContextMenu.querySelectorAll('.context-menu-item'));
                var currentIndex = menuItems.indexOf(item);
                var nextIndex = e.key === 'ArrowDown' ? currentIndex + 1 : currentIndex - 1;
                if (nextIndex < 0) nextIndex = menuItems.length - 1;
                if (nextIndex >= menuItems.length) nextIndex = 0;
                menuItems[nextIndex].focus();
            }
        });
    });

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
                await apiClient.updateCollection(id, { name: name, description: newColDesc.value });
                showToast('Collection updated', 'success');
            } else {
                // Create new
                var payload = { name: name, description: newColDesc.value };
                if (parentId) payload.parent_id = parseInt(parentId);

                await apiClient.createCollection(payload);
                showToast('Collection created', 'success');
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
            await apiClient.duplicateCollection(id);
            showToast('Collection duplicated', 'success');
            loadCollections();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    async function deleteCollection(id, name) {
        if (!confirm('Delete collection "' + name + '" and all its requests?\nThis cannot be undone.')) return;
        try {
            await apiClient.deleteCollection(id);
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
        resetRequestCollectionPicker();
        requestModalTitle.textContent = 'New Request';
        reqNameInput.value = '';
        requestModal.classList.add('active');
        setTimeout(function() { reqNameInput.focus(); }, 100);
    }

    function openEditRequestModal(id, name, collectionId) {
        editRequestId.value = id;
        editRequestCollectionId.value = collectionId;
        reqCollectionPickerWrap.style.display = 'none';
        resetRequestCollectionPicker();
        requestModalTitle.textContent = 'Rename Request';
        reqNameInput.value = name;
        requestModal.classList.add('active');
        setTimeout(function() { reqNameInput.focus(); reqNameInput.select(); }, 100);
    }

    function syncNewCollectionFields() {
        if (!reqNewCollectionWrap || !reqCollectionSelect) return;
        var creatingCollection = reqCollectionSelect.value === CREATE_NEW_COLLECTION_VALUE;
        reqNewCollectionWrap.style.display = creatingCollection ? '' : 'none';
        if (!creatingCollection && reqNewCollectionName) reqNewCollectionName.value = '';
    }

    function resetRequestCollectionPicker() {
        if (reqCollectionSelect) reqCollectionSelect.value = '';
        if (reqNewCollectionName) reqNewCollectionName.value = '';
        syncNewCollectionFields();
    }

    function closeRequestModal() {
        requestModal.classList.remove('active');
        reqCollectionPickerWrap.style.display = 'none';
        resetRequestCollectionPicker();
        if (pendingSaveToCollectionResolver) {
            pendingSaveToCollectionResolver(false);
            pendingSaveToCollectionResolver = null;
        }
    }

    reqModalClose.addEventListener('click', closeRequestModal);
    reqCancelBtn.addEventListener('click', closeRequestModal);
    if (reqCollectionSelect) reqCollectionSelect.addEventListener('change', syncNewCollectionFields);

    // Enter key in request name input
    reqNameInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            reqSaveBtn.click();
        }
    });

    if (reqNewCollectionName) {
        reqNewCollectionName.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                reqSaveBtn.click();
            }
        });
    }

    reqSaveBtn.addEventListener('click', async function() {
        var name = reqNameInput.value.trim();
        if (!name) {
            showToast('Please enter a request name', 'error');
            return;
        }

        var id = editRequestId.value;
        var collectionId = editRequestCollectionId.value || (reqCollectionSelect && reqCollectionSelect.value) || '';
        var shouldCreateCollection = !id && collectionId === CREATE_NEW_COLLECTION_VALUE;
        var newCollectionName = reqNewCollectionName ? reqNewCollectionName.value.trim() : '';

        if (!id && !collectionId) {
            showToast('Please select a collection', 'error');
            return;
        }

        if (shouldCreateCollection && !newCollectionName) {
            showToast('Please enter a collection name', 'error');
            if (reqNewCollectionName) reqNewCollectionName.focus();
            return;
        }

        var requestSaveSucceeded = false;

        try {
            if (id) {
                // Rename existing request
                await apiClient.updateRequest(id, { name: name });
                showToast('Request renamed', 'success');
                var renamedTab = openTabs.find(function(t){ return t.requestId === parseInt(id); });
                if (renamedTab) {
                    renamedTab.label = name;
                    renderRequestTabs();
                    persistOpenTabs();
                }
                loadCollections();
                requestSaveSucceeded = true;
            } else {
                if (shouldCreateCollection) {
                    var createdCollection = await apiClient.createCollection({ name: newCollectionName, description: '' });
                    collectionId = createdCollection && createdCollection.id;
                    if (!collectionId) {
                        showToast('Collection created but ID not found in response', 'warning');
                        await loadCollections();
                        return;
                    }
                }

                var numericCollectionId = parseInt(collectionId);
                if (!numericCollectionId) {
                    showToast('Please select a collection', 'error');
                    return;
                }

                // Create new request with current editor state
                var payload = gatherRequestState();
                payload.collection_id = numericCollectionId;
                payload.name = name;

                var createdRequest = await apiClient.createRequest(payload);

                // Extract the new request ID
                var newRequestId = createdRequest && createdRequest.id;

                if (newRequestId) {
                    showToast('Request created successfully', 'success');

                    // Update the active tab to reference this saved request
                    var createdTab = openTabs.find(function(t){ return t.id === activeTabId; });
                    if (createdTab) {
                        createdTab.requestId = newRequestId;
                        createdTab.collectionId = numericCollectionId;
                        createdTab.label = name;
                        createdTab.unsaved = false;
                        createdTab.state = mergeStoredResponseState(gatherRequestState(), createdTab.state);
                        renderRequestTabs();
                    }

                    // Reload collections to show the new collection/request, then persist the saved tab state.
                    await loadCollections();
                    persistOpenTabs(false);

                    requestSaveSucceeded = true;

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
            }

            if (!requestSaveSucceeded) return;

            requestModal.classList.remove('active');
            reqCollectionPickerWrap.style.display = 'none';
            resetRequestCollectionPicker();
            if (pendingSaveToCollectionResolver) {
                pendingSaveToCollectionResolver(true);
                pendingSaveToCollectionResolver = null;
            }
        } catch (err) {
            console.error('Request save error:', err);
            showToast('Error: ' + err.message, 'error');
        }
    });

    async function duplicateRequest(id) {
        try {
            await apiClient.duplicateRequest(id);
            showToast('Request duplicated', 'success');
            loadCollections();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    async function deleteRequest(id, name) {
        if (!confirm('Delete request "' + name + '"?\nThis cannot be undone.')) return;
        try {
            await apiClient.deleteRequest(id);
            showToast('Request deleted', 'success');
            // Close any tab that had this request open
            var deletedTabIds = openTabs.filter(function(t){ return t.requestId === id; }).map(function(t){ return t.id; });
            for (var i = 0; i < deletedTabIds.length; i++) {
                await closeTab(deletedTabIds[i], { force: true });
            }
            loadCollections();
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
                current.state = mergeStoredResponseState(gatherRequestState(), current.state);
                current.method = methodSelect.value;
                persistOpenTabs(false);
            }
        }

        activeTabId = tabId;
        var tab = openTabs.find(function(t) { return t.id === tabId; });
        if (!tab) return;

        renderRequestTabs();
        loadStateIntoEditor(tab.state, tab.method);
        restoreResponsePane(tab.state);
        highlightSidebarForTab(tab);
        refreshInstancesForActiveTab();
        persistOpenTabs(false);
    }

    function showUnsavedClosePrompt(tab) {
        return new Promise(function(resolve) {
            var modal = document.createElement('div');
            modal.className = 'modal active';
            modal.innerHTML = '' +
                '<div class="modal-content unsaved-close-modal" role="dialog" aria-modal="true" aria-labelledby="unsavedCloseTitle">' +
                    '<h3 id="unsavedCloseTitle">Unsaved changes</h3>' +
                    '<p>Save changes to "' + escapeHtml(tab.label || 'this request') + '" before closing?</p>' +
                    '<div class="modal-buttons">' +
                        '<button class="btn-cancel" data-choice="cancel">Cancel</button>' +
                        '<button class="btn-cancel" data-choice="discard">Discard</button>' +
                        '<button class="btn-send" data-choice="save">Save</button>' +
                    '</div>' +
                '</div>';

            function finish(choice) {
                document.removeEventListener('keydown', onKeyDown);
                modal.remove();
                resolve(choice);
            }

            function onKeyDown(e) {
                if (e.key === 'Escape') finish('cancel');
            }

            modal.addEventListener('click', function(e) {
                if (e.target === modal) finish('cancel');
                var button = e.target.closest('[data-choice]');
                if (button) finish(button.dataset.choice);
            });

            document.addEventListener('keydown', onKeyDown);
            document.body.appendChild(modal);
            var cancelBtn = modal.querySelector('[data-choice="cancel"]');
            if (cancelBtn) cancelBtn.focus();
        });
    }

    function performCloseTab(tabId) {
        var idx = openTabs.findIndex(function(t) { return t.id === tabId; });
        if (idx === -1) return false;

        openTabs.splice(idx, 1);

        if (activeTabId === tabId) {
            activeTabId = null;
            if (openTabs.length > 0) {
                var nextIdx = Math.min(idx, openTabs.length - 1);
                switchToTab(openTabs[nextIdx].id);
                return true;
            } else {
                openNewTab();
                return true;
            }
        }
        renderRequestTabs();
        persistOpenTabs();
        return true;
    }

    async function saveTabBeforeClose(tab) {
        if (!tab) return false;
        if (activeTabId !== tab.id) switchToTab(tab.id);
        if (tab.requestId) return await saveActiveTab();
        return await openSaveToCollectionModal({ waitForSave: true });
    }

    async function closeTab(tabId, options) {
        options = options || {};
        var tab = openTabs.find(function(t) { return t.id === tabId; });
        if (!tab) return false;

        if (!options.force && tab.unsaved === true) {
            var choice = await showUnsavedClosePrompt(tab);
            if (choice === 'cancel') return false;
            if (choice === 'save') {
                var saved = await saveTabBeforeClose(tab);
                if (!saved) return false;
            }
        }

        return performCloseTab(tabId);
    }

    function markActiveTabUnsaved() {
        var tab = openTabs.find(function(t) { return t.id === activeTabId; });
        if (tab && !tab.unsaved) {
            tab.unsaved = true;
            renderRequestTabs();
        }
        persistOpenTabs();
        scheduleSidebarCurlUpdate();
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

            closeBtn.addEventListener('click', async function(e) {
                e.stopPropagation();
                await closeTab(tab.id);
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

    if (saveInstanceBtn) saveInstanceBtn.addEventListener('click', saveCurrentInstance);
    saveResponseSnapshotBtn.addEventListener('click', saveCurrentInstance);

    // ─── Tab context menu ──────────────────────────────────
    var tabCtxTarget = null;

    function showTabContextMenu(tab, x, y) {
        tabCtxTarget = tab;
        contextMenu.classList.remove('active');
        requestContextMenu.classList.remove('active');
        tabContextMenu.classList.remove('active');
        closeSnapshotContextMenu();

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
        item.addEventListener('click', async function(e) {
            e.stopPropagation();
            tabContextMenu.classList.remove('active');
            if (!tabCtxTarget) return;
            var action = item.dataset.action;

            if (action === 'save') {
                // Switch to that tab first, then save
                switchToTab(tabCtxTarget.id);
                await saveActiveTab();
            } else if (action === 'save-as') {
                // Switch to that tab, then open "save to collection" modal
                switchToTab(tabCtxTarget.id);
                openSaveToCollectionModal();
            } else if (action === 'close') {
                await closeTab(tabCtxTarget.id);
            } else if (action === 'close-others') {
                var keep = tabCtxTarget.id;
                var otherTabs = openTabs.slice();
                for (var i = 0; i < otherTabs.length; i++) {
                    if (otherTabs[i].id !== keep) await closeTab(otherTabs[i].id);
                }
            } else if (action === 'close-all') {
                var tabsToClose = openTabs.slice();
                for (var j = 0; j < tabsToClose.length; j++) {
                    await closeTab(tabsToClose[j].id);
                }
            }
        });
    });

    // Open "Save to Collection" modal for the current tab (no requestId)
    async function openSaveToCollectionModal(options) {
        options = options || {};
        if (pendingSaveToCollectionResolver) {
            pendingSaveToCollectionResolver(false);
            pendingSaveToCollectionResolver = null;
        }
        editRequestId.value = '';
        editRequestCollectionId.value = '';
        requestModalTitle.textContent = 'Save to Collection';
        var tab = openTabs.find(function(t){ return t.id === activeTabId; });
        reqNameInput.value = tab ? tab.label : '';

        // Populate collection picker
        reqCollectionPickerWrap.style.display = '';
        reqCollectionSelect.innerHTML = '<option value="">— Select collection —</option>';
        var newCollectionOpt = document.createElement('option');
        newCollectionOpt.value = CREATE_NEW_COLLECTION_VALUE;
        newCollectionOpt.textContent = '+ New collection…';
        reqCollectionSelect.appendChild(newCollectionOpt);
        if (reqNewCollectionName) reqNewCollectionName.value = '';
        syncNewCollectionFields();
        try {
            var collections = await apiClient.getCollections();
            (collections || []).forEach(function flattenCollection(col) {
                var opt = document.createElement('option');
                opt.value = col.id;
                opt.textContent = col.name;
                reqCollectionSelect.appendChild(opt);
                if (col.children && col.children.length) col.children.forEach(flattenCollection);
            });
        } catch (err) { /* ignore */ }

        requestModal.classList.add('active');
        setTimeout(function() { reqNameInput.focus(); }, 100);

        if (options.waitForSave) {
            return new Promise(function(resolve) {
                pendingSaveToCollectionResolver = resolve;
            });
        }
        return false;
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

    function reqToState(req) {
        var state = {
            method:       req.method       || 'GET',
            url:          req.url          || '',
            headers:      req.headers      || [],
            body_type:    req.body_type    || 'none',
            body_content: req.body_content || '',
            form_data:    req.form_data    || [],
            auth_type:    req.auth_type    || 'none',
            auth_data:    req.auth_data    || {},
            body_raw_type: req.body_raw_type || 'application/json'
        };

        // Normal saved-request loads should not inherit whatever happened to be
        // displayed in the response pane. Only carry response fields when the
        // backend object is itself a saved response snapshot/instance.
        if (hasResponseState(req)) Object.assign(state, getResponseStateFromSource(req));
        return state;
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
        setEditorBodyType(state.body_type || 'none');
        var nextBodyContent = state.body_content || '';
        bodyContent.value = nextBodyContent;
        if (bodyContentCodeMirror) bodyContentCodeMirror.setValue(nextBodyContent);

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

        scheduleSidebarCurlUpdate();
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
        if (!state) return false;

        var body = state.response_body != null ? String(state.response_body) : '';
        var size = state.response_size != null ? String(state.response_size).trim() : '';
        var timeMs = state.response_time_ms;

        return (
            state.response_status != null ||
            !!state.response_status_text ||
            hasHeaderContent(state.response_headers) ||
            (body !== '' && body !== EMPTY_RESPONSE_MESSAGE) ||
            (timeMs != null && timeMs !== '' && parseInt(timeMs, 10) > 0) ||
            (size !== '' && size !== '0 B')
        );
    }

    function clearResponsePane() {
        applyStatusBadge(null, '');
        responseTime.textContent = '0 ms';
        responseTime.setAttribute('aria-label', 'Response time 0 milliseconds');
        responseSize.textContent = '0 B';
        responseSize.setAttribute('aria-label', 'Response size 0 bytes');
        responseHeaders.textContent = '';
        displayResponse(EMPTY_RESPONSE_MESSAGE, '');
    }

    function restoreResponsePane(state) {
        if (!hasResponseState(state)) {
            clearResponsePane();
            return;
        }

        var sc = state.response_status;
        applyStatusBadge(sc, state.response_status_text || '');
        var timeText = state.response_time_ms != null && state.response_time_ms !== ''
            ? state.response_time_ms + ' ms'
            : '0 ms';
        responseTime.textContent = timeText;
        responseTime.setAttribute('aria-label', 'Response time ' + timeText.replace(' ms', ' milliseconds'));
        responseSize.textContent = state.response_size || '0 B';
        responseSize.setAttribute('aria-label', 'Response size ' + responseSize.textContent);
        responseHeaders.textContent = stringifyHeadersForDisplay(state.response_headers);
        displayResponse(state.response_body != null ? state.response_body : '', state.response_headers);
    }

    function getResponseStateFromSource(source) {
        source = source || {};
        return {
            response_status: source.response_status != null ? source.response_status : null,
            response_status_text: source.response_status_text || '',
            response_headers: source.response_headers != null ? source.response_headers : '',
            response_body: source.response_body != null ? source.response_body : '',
            response_time_ms: source.response_time_ms != null ? source.response_time_ms : null,
            response_size: source.response_size || ''
        };
    }

    function gatherResponseState() {
        var statusText = statusCode.textContent.trim();
        var statusMatch = statusText.match(/(\d{3})/);
        var parsedStatus = statusMatch ? parseInt(statusMatch[1], 10) : null;
        return getResponseStateFromSource({
            response_status: parsedStatus,
            response_status_text: statusCode.dataset.statusText || '',
            response_headers: responseHeaders.textContent || '',
            response_body: responseBody.dataset.rawBody || responseBody.textContent || '',
            response_time_ms: parseResponseTimeMs(responseTime.textContent),
            response_size: responseSize.textContent || ''
        });
    }

    function mergeStoredResponseState(requestState, storedState) {
        if (hasResponseState(storedState)) {
            Object.assign(requestState, getResponseStateFromSource(storedState));
        }
        return requestState;
    }

    // ═══════════════════════════════════════════════════════
    //  GATHER CURRENT EDITOR STATE
    // ═══════════════════════════════════════════════════════

    function gatherRequestState() {
        var headers = [];
        headersContainer.querySelectorAll('.header-row').forEach(function(row) {
            var k = row.querySelector('.header-key').value.trim();
            var v = row.querySelector('.header-value').value.trim();
            if (k) headers.push({ key: k, value: v });
        });

        var bodyType = document.querySelector('input[name="bodyType"]:checked').value;
        var bodyContentVal = bodyContentCodeMirror ? bodyContentCodeMirror.getValue() : bodyContent.value;

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

        return {
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
    }

    function gatherEditorState(options) {
        var state = gatherRequestState();
        if (options && options.includeResponse) Object.assign(state, gatherResponseState());
        return state;
    }

    // ═══════════════════════════════════════════════════════
    //  REQUEST INSTANCES / SNAPSHOTS
    // ═══════════════════════════════════════════════════════

    function getActiveSavedTab() {
        return openTabs.find(function(t) { return t.id === activeTabId && t.requestId; }) || null;
    }

    function hasExistingRequest(tab) {
        if (!tab || !tab.requestId) return false;
        return !!findRequestById(tab.requestId);
    }


    function highlightSnapshotRow(snapshotId) {
        if (!snapshotList || !snapshotId) return;
        var id = String(snapshotId);
        snapshotList.querySelectorAll('.snapshot-list-item.is-active').forEach(function(activeItem) {
            activeItem.classList.remove('is-active');
        });
        var activeRow = snapshotList.querySelector('.snapshot-list-item[data-snapshot-id="' + id + '"]');
        if (!activeRow) return;
        activeRow.classList.add('is-active');
        activeRow.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }

    function renderInstancesBar(instances) {
        var tab = getActiveSavedTab();
        var hasStaleRequest = !!(tab && !hasExistingRequest(tab));
        activeRequestInstances = instances || [];

        instancesBar.classList.remove('hidden');
        closeSnapshotContextMenu();
        snapshotList.innerHTML = '';
        if (saveInstanceBtn) saveInstanceBtn.disabled = !tab || hasStaleRequest;
        saveResponseSnapshotBtn.disabled = !tab || hasStaleRequest;

        if (!tab) {
            selectedSnapshotId = '';
            loadingSnapshotId = '';
            var unsaved = document.createElement('div');
            unsaved.className = 'snapshot-list-item is-disabled';
            unsaved.textContent = 'Save this request first to create snapshots.';
            snapshotList.appendChild(unsaved);
            return;
        }

        if (hasStaleRequest) {
            selectedSnapshotId = '';
            loadingSnapshotId = '';
            var stale = document.createElement('div');
            stale.className = 'snapshot-list-item is-disabled';
            stale.textContent = 'This request no longer exists. Save/restore it before creating snapshots.';
            snapshotList.appendChild(stale);
            return;
        }

        if (!activeRequestInstances.length) {
            selectedSnapshotId = '';
            loadingSnapshotId = '';
            var empty = document.createElement('div');
            empty.className = 'snapshot-list-item is-disabled';
            empty.textContent = 'No snapshots yet. Save one to get started.';
            snapshotList.appendChild(empty);
            return;
        }

        var selectedExists = activeRequestInstances.some(function(instance) {
            return String(instance.id) === String(selectedSnapshotId);
        });
        if (!selectedExists) {
            selectedSnapshotId = String(activeRequestInstances[0].id);
        }

        activeRequestInstances.forEach(function(instance) {
            var id = String(instance.id);
            var item = document.createElement('div');
            item.className = 'snapshot-list-item';
            item.dataset.snapshotId = id;
            if (id === String(selectedSnapshotId)) item.classList.add('is-active');
            if (id === String(loadingSnapshotId)) {
                item.classList.add('is-loading');
                item.setAttribute('aria-busy', 'true');
            }

            var loadButton = document.createElement('button');
            loadButton.type = 'button';
            loadButton.className = 'snapshot-list-label';
            loadButton.textContent = instance.name || 'Untitled snapshot';
            loadButton.addEventListener('click', function() {
                selectedSnapshotId = id;
                loadSelectedInstance(id);
            });

            var menuButton = document.createElement('button');
            menuButton.type = 'button';
            menuButton.className = 'snapshot-overflow-button';
            menuButton.setAttribute('aria-label', 'Open actions for ' + (instance.name || 'Untitled snapshot'));
            menuButton.setAttribute('aria-haspopup', 'menu');
            menuButton.setAttribute('aria-expanded', 'false');
            menuButton.setAttribute('aria-controls', 'snapshotContextMenu');
            menuButton.textContent = '⋮';
            menuButton.addEventListener('click', function(e) {
                e.stopPropagation();
                if (snapshotContextMenu.classList.contains('active') && snapshotContextTargetId === id) {
                    closeSnapshotContextMenu({ restoreFocus: true });
                    return;
                }

                var rect = menuButton.getBoundingClientRect();
                showSnapshotContextMenu(id, rect.left, rect.bottom + 4, menuButton);
            });
            menuButton.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
                    e.preventDefault();
                    var rect = menuButton.getBoundingClientRect();
                    showSnapshotContextMenu(id, rect.left, rect.bottom + 4, menuButton);
                    var firstMenuItem = snapshotContextMenu.querySelector('.context-menu-item');
                    if (firstMenuItem) firstMenuItem.focus();
                } else if (e.key === 'Escape') {
                    closeSnapshotContextMenu({ restoreFocus: true });
                }
            });

            item.addEventListener('contextmenu', function(e) {
                e.preventDefault();
                selectedSnapshotId = id;
                snapshotList.querySelectorAll('.snapshot-list-item.is-active').forEach(function(activeItem) {
                    activeItem.classList.remove('is-active');
                });
                item.classList.add('is-active');
                showSnapshotContextMenu(id, e.clientX, e.clientY, menuButton);
            });

            item.appendChild(loadButton);
            item.appendChild(menuButton);
            snapshotList.appendChild(item);
        });
    }

    async function refreshInstancesForActiveTab() {
        var tab = getActiveSavedTab();
        if (!tab) {
            renderInstancesBar([]);
            return;
        }

        try {
            var instances = await apiClient.getRequestInstances(tab.requestId);
            renderInstancesBar(instances || []);
        } catch (err) {
            renderInstancesBar([]);
            showToast('Could not load snapshots: ' + err.message, 'error');
        }
    }

    async function saveCurrentInstance() {
        var activeTab = openTabs.find(function(t) { return t.id === activeTabId; }) || null;
        if (!activeTab || !activeTab.requestId) {
            showToast('Save the request before creating snapshots', 'error');
            return;
        }
        if (!findRequestById(activeTab.requestId)) {
            showToast('This request no longer exists. Save/restore it before creating snapshots.', 'error');
            return;
        }

        var defaultName = buildSnapshotDefaultName();
        var name = await promptSnapshotName(defaultName, 'Save snapshot');
        if (name === null) return;
        if (!name) {
            showToast('Snapshot name is required', 'error');
            return;
        }

        var state = gatherEditorState({ includeResponse: true });
        state.name = name;

        try {
            var instance = await apiClient.createRequestInstance(activeTab.requestId, state);
            showToast('Snapshot saved', 'success');
            selectedSnapshotId = String(instance.id);
            await refreshInstancesForActiveTab();
            highlightSnapshotRow(selectedSnapshotId);
            showSnapshotSavedFeedback(selectedSnapshotId);
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    async function loadSelectedInstance(snapshotId) {
        var id = snapshotId || selectedSnapshotId;
        if (!id) return;

        selectedSnapshotId = String(id);
        loadingSnapshotId = String(id);
        renderInstancesBar(activeRequestInstances);

        try {
            var instance = await apiClient.getRequestInstance(id);
            var tab = getActiveSavedTab();
            var state = reqToState(instance);
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
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        } finally {
            loadingSnapshotId = '';
            renderInstancesBar(activeRequestInstances);
        }
    }

    async function renameSelectedInstance(snapshotId) {
        var id = snapshotId ? String(snapshotId) : '';
        if (!id) return;

        var selected = activeRequestInstances.find(function(instance) { return String(instance.id) === String(id); });
        var name = await promptSnapshotName(selected ? selected.name : '', 'Rename snapshot');
        if (name === null) return;
        if (!name) {
            showToast('Snapshot name is required', 'error');
            return;
        }

        try {
            await apiClient.updateRequestInstance(id, { name: name });
            showToast('Snapshot renamed', 'success');
            await refreshInstancesForActiveTab();
            selectedSnapshotId = String(id);
            renderInstancesBar(activeRequestInstances);
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    async function deleteSelectedInstance(snapshotId) {
        var id = snapshotId ? String(snapshotId) : '';
        if (!id) return;

        var selected = activeRequestInstances.find(function(instance) { return String(instance.id) === String(id); });
        var name = selected ? selected.name : 'selected snapshot';
        if (!confirm('Delete snapshot "' + name + '"?')) return;

        try {
            await apiClient.deleteRequestInstance(id);
            showToast('Snapshot deleted', 'success');
            await refreshInstancesForActiveTab();
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
        }
    }

    // ─── Save active tab's request ─────────────────────────
    async function saveActiveTab() {
        var tab = openTabs.find(function(t) { return t.id === activeTabId; });
        if (!tab) return false;
        if (tab.requestId === null) {
            return await openSaveToCollectionModal({ waitForSave: true });
        }

        var state = gatherRequestState();
        tab.state = mergeStoredResponseState(state, tab.state);

        try {
            await apiClient.updateRequest(tab.requestId, state);
            tab.unsaved = false;
            renderRequestTabs();
            persistOpenTabs(false);
            showToast('Request saved', 'success');
            refreshInstancesForActiveTab();
            loadCollections();
            return true;
        } catch (err) {
            showToast('Error: ' + err.message, 'error');
            return false;
        }
    }

    // Ctrl+S to save current request
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            if (activeTabId) {
                saveActiveTab();
            }
        }
    });



    // ═══════════════════════════════════════════════════════
    //  PARAMS – AUTO DETECT & BIDIRECTIONAL SYNC
    // ═══════════════════════════════════════════════════════

    function safeDecodeURIComponent(value) {
        try {
            return decodeURIComponent(value);
        } catch (err) {
            return value;
        }
    }

    function syncParamsFromUrl() {
        if (updatingUrlFromParams) return;
        updatingParamsFromUrl = true;

        var url = urlInput.value;
        var qIdx = url.indexOf('?');

        if (qIdx === -1 || url.substring(qIdx + 1).trim() === '') {
            paramsBody.innerHTML = '';
            updatingParamsFromUrl = false;
            return;
        }

        var queryStr = url.substring(qIdx + 1);
        var pairs = [];
        queryStr.split('&').forEach(function(part) {
            if (!part) return;
            var eqIdx = part.indexOf('=');
            if (eqIdx === -1) {
                pairs.push({ key: safeDecodeURIComponent(part), value: '', desc: '' });
            } else {
                pairs.push({
                    key: safeDecodeURIComponent(part.substring(0, eqIdx)),
                    value: safeDecodeURIComponent(part.substring(eqIdx + 1)),
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
        tr.classList.add('param-row');
        tr.classList.add(enabled ? 'param-row-enabled' : 'param-row-disabled');

        tr.innerHTML =
            '<td class="col-check"><label class="param-enabled-label"><input type="checkbox" class="param-enabled" aria-label="Include parameter in request" ' + (enabled ? 'checked' : '') + '><span class="param-enabled-text">' + (enabled ? 'On' : 'Off') + '</span></label></td>' +
            '<td><input type="text" class="param-key" placeholder="Key" value="' + escAttr(key) + '"></td>' +
            '<td><input type="text" class="param-value" placeholder="Value" value="' + escAttr(value) + '"></td>' +
            '<td><input type="text" class="param-desc" placeholder="Notes (optional)" value="' + escAttr(desc) + '"></td>' +
            '<td class="col-action"><button class="btn-remove param-remove" type="button" aria-label="Remove parameter">×</button></td>';

        var chk   = tr.querySelector('.param-enabled');
        var chkText = tr.querySelector('.param-enabled-text');
        var kIn   = tr.querySelector('.param-key');
        var vIn   = tr.querySelector('.param-value');
        var rmBtn = tr.querySelector('.param-remove');

        chk.addEventListener('change', function() {
            tr.classList.toggle('param-row-disabled', !chk.checked);
            tr.classList.toggle('param-row-enabled', chk.checked);
            if (chkText) chkText.textContent = chk.checked ? 'On' : 'Off';
            syncUrlFromParams();
        });

        kIn.addEventListener('input', function() {
            syncUrlFromParams();
        });

        vIn.addEventListener('input', function() {
            syncUrlFromParams();
        });

        rmBtn.addEventListener('click', function() {
            tr.remove();
            syncUrlFromParams();
            markActiveTabUnsaved();
        });

        paramsBody.appendChild(tr);
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


    prettifyJsonBtn.addEventListener('click', function() {
        var originalBody = bodyContentCodeMirror ? bodyContentCodeMirror.getValue() : bodyContent.value;
        var parsedBody;

        try {
            parsedBody = JSON.parse(originalBody);
        } catch (err) {
            showToast('Invalid JSON: ' + err.message, 'error');
            return;
        }

        var jsonRadio = document.querySelector('input[name="bodyType"][value="json"]');
        if (jsonRadio) jsonRadio.checked = true;

        var prettyJson = JSON.stringify(parsedBody, null, 2);
        bodyContent.value = prettyJson;
        if (bodyContentCodeMirror) bodyContentCodeMirror.setValue(prettyJson);
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
        var user = userState.currentUser;
        envVarsList.innerHTML = '';
        if (!user || user.is_guest) {
            envVars = {};
            envVarsList.innerHTML = '<p class="empty-state">Log in to keep environment variables.</p>';
            if (addEnvVarBtn) addEnvVarBtn.disabled = true;
            return;
        }

        if (addEnvVarBtn) addEnvVarBtn.disabled = false;
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
        var user = userState.currentUser;
        if (!user || user.is_guest) {
            envVars = {};
            renderEnvVars();
            return;
        }

        envVars = {};
        envVarsList.querySelectorAll('.env-row').forEach(function(r) {
            var k = r.querySelector('.env-key').value.trim();
            var v = r.querySelector('.env-val').value;
            if (k) envVars[k] = v;
        });
        saveEnvVarsToStorage(envVars, user);
    }

    addEnvVarBtn.addEventListener('click', function() {
        var user = userState.currentUser;
        if (!user || user.is_guest) return;
        addEnvRow();
    });

    function openEnvVarsModal() {
        if (!envVarsModal) return;
        renderEnvVars();
        envVarsModal.classList.add('active');
        envVarsModal.setAttribute('aria-hidden', 'false');
    }

    function closeEnvVarsModal() {
        if (!envVarsModal) return;
        envVarsModal.classList.remove('active');
        envVarsModal.setAttribute('aria-hidden', 'true');
    }

    if (openEnvVarsModalBtn) openEnvVarsModalBtn.addEventListener('click', openEnvVarsModal);
    if (envVarsModalClose) envVarsModalClose.addEventListener('click', closeEnvVarsModal);
    if (envVarsModal) {
        envVarsModal.addEventListener('click', function(e) {
            if (e.target === envVarsModal) closeEnvVarsModal();
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && envVarsModal && envVarsModal.classList.contains('active')) {
            closeEnvVarsModal();
        }
    });

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
        var user = userState.currentUser;
        if (!user || user.is_guest) {
            history = [];
            renderHistory();
            return;
        }

        history.unshift({ method: method, url: url, status: status, time: Date.now() });
        if (history.length > 50) history.pop();
        saveHistoryToStorage(history, user);
        renderHistory();
    }

    function renderHistory() {
        var user = userState.currentUser;
        if (!user || user.is_guest) {
            historyList.innerHTML = '<p class="empty-state">Log in to keep request history.</p>';
            return;
        }
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
                (sc ? '<span class="history-status ' + cls + '"><span class="history-status-prefix">' + getStatusDisplay(sc, '').icon + ' ' + getStatusDisplay(sc, '').label + '</span><span aria-hidden="true"> · </span>' + sc + '</span>' : '');
            item.addEventListener('click', function() {
                methodSelect.value = h.method;
                urlInput.value = h.url;
                syncParamsFromUrl();
                scheduleSidebarCurlUpdate();
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

    function getImportEditorAdapter() {
        return {
            setMethod: function(method) { methodSelect.value = method || 'GET'; },
            setUrl: function(url) { urlInput.value = url || ''; },
            syncParamsFromUrl: syncParamsFromUrl,
            clearHeaders: function() { headersContainer.innerHTML = ''; },
            addHeaderRow: addHeaderRow,
            ensureHeaderRow: function() {
                if (!headersContainer.children.length) addHeaderRow();
            },
            setBodyType: setEditorBodyType,
            setBodyContent: function(content) { var next = content || ''; bodyContent.value = next; if (bodyContentCodeMirror) bodyContentCodeMirror.setValue(next); },
            clearFormData: function() { formDataRows.innerHTML = ''; },
            addFormDataRow: addFormDataRow
        };
    }

    function applyParsedImportToEditor(payload) {
        var parsed = applyParsedImportPayload(payload, getImportEditorAdapter());
        markActiveTabUnsaved();
        return parsed;
    }

    function setEditorBodyType(bodyType) {
        var value = bodyType || 'none';
        var bodyRadio = document.querySelector('input[name="bodyType"][value="' + value + '"]');
        if (!bodyRadio) {
            value = 'none';
            bodyRadio = document.querySelector('input[name="bodyType"][value="none"]');
        }
        if (!bodyRadio) return;
        bodyRadio.checked = true;
        updateBodyEditorsVisibility(value);
        if (bodyContentCodeMirror) bodyContentCodeMirror.setBodyType(value);
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
            updateBodyEditorsVisibility(val);
            if (bodyContentCodeMirror) bodyContentCodeMirror.setBodyType(val);
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


    function getStoredRequestAdvancedExpanded() {
        var stored = null;
        try {
            stored = localStorage.getItem(REQUEST_ADVANCED_EXPANDED_STORAGE_KEY);
        } catch (err) {
            stored = null;
        }
        return stored === '1';
    }

    function setRequestAdvancedExpanded(expanded) {
        if (!requestBarSecondary || !requestAdvancedToggle) return;
        requestBarSecondary.hidden = !expanded;
        requestAdvancedToggle.setAttribute('aria-expanded', expanded ? 'true' : 'false');
        requestAdvancedToggle.textContent = expanded ? 'Hide advanced options' : 'Advanced options';
        try {
            localStorage.setItem(REQUEST_ADVANCED_EXPANDED_STORAGE_KEY, expanded ? '1' : '0');
        } catch (err) {
            showToast('Could not persist advanced options state', 'warning');
        }
    }

    function initRequestBarAdvancedControls() {
        if (!requestAdvancedToggle || !requestBarSecondary) return;
        setRequestAdvancedExpanded(getStoredRequestAdvancedExpanded());
        requestAdvancedToggle.addEventListener('click', function() {
            setRequestAdvancedExpanded(requestBarSecondary.hidden);
        });

        document.addEventListener('keydown', function(e) {
            if (e.altKey && !e.ctrlKey && !e.metaKey && e.key === '.') {
                e.preventDefault();
                setRequestAdvancedExpanded(requestBarSecondary.hidden);
                requestAdvancedToggle.focus();
            }
        });
    }

    function getStoredExecutionMode() {
        var stored = null;
        try {
            stored = localStorage.getItem(EXECUTION_MODE_STORAGE_KEY);
        } catch (err) {
            stored = null;
        }
        return EXECUTION_MODES.has(stored) ? stored : DEFAULT_EXECUTION_MODE;
    }

    function getSelectedExecutionMode() {
        if (!executionModeSelect) return DEFAULT_EXECUTION_MODE;
        var value = executionModeSelect.value;
        return EXECUTION_MODES.has(value) ? value : DEFAULT_EXECUTION_MODE;
    }

    function getStoredClientCredentialsMode() {
        var stored = null;
        try {
            stored = localStorage.getItem(CLIENT_CREDENTIALS_MODE_STORAGE_KEY);
        } catch (err) {
            stored = null;
        }
        return CLIENT_CREDENTIALS_MODES.has(stored) ? stored : DEFAULT_CLIENT_CREDENTIALS_MODE;
    }

    function getSelectedClientCredentialsMode() {
        if (!clientCredentialsSelect) return DEFAULT_CLIENT_CREDENTIALS_MODE;
        return CLIENT_CREDENTIALS_MODES.has(clientCredentialsSelect.value)
            ? clientCredentialsSelect.value
            : DEFAULT_CLIENT_CREDENTIALS_MODE;
    }

    function persistClientCredentialsModePreference() {
        try {
            localStorage.setItem(CLIENT_CREDENTIALS_MODE_STORAGE_KEY, getSelectedClientCredentialsMode());
        } catch (err) {
            showToast('Could not persist client credentials preference', 'warning');
        }
    }

    function syncClientCredentialsControlVisibility() {
        if (!clientCredentialsSelect) return;
        var control = clientCredentialsSelect.closest('.client-credentials-control');
        if (!control) return;
        control.hidden = getSelectedExecutionMode() !== 'client';
        if (executionModeSelect) {
            var desktopModeOption = executionModeSelect.querySelector('option[value=\"desktop-native\"]');
            if (desktopModeOption) desktopModeOption.disabled = !isDesktopNativeAvailable();
        }
    }

    function initExecutionModeControl() {
        if (executionModeSelect) {
            executionModeSelect.value = getStoredExecutionMode();
            executionModeSelect.addEventListener('change', function() {
                try {
                    localStorage.setItem(EXECUTION_MODE_STORAGE_KEY, getSelectedExecutionMode());
                } catch (err) {
                    showToast('Could not persist execution mode preference', 'warning');
                }
                syncClientCredentialsControlVisibility();
            });
        }

        if (clientCredentialsSelect) {
            clientCredentialsSelect.value = getStoredClientCredentialsMode();
            clientCredentialsSelect.addEventListener('change', persistClientCredentialsModePreference);
        }

        syncClientCredentialsControlVisibility();
    }

    function isForbiddenClientHeaderName(headerName) {
        var lowerName = String(headerName || '').trim().toLowerCase();
        if (!lowerName) return true;
        if (FORBIDDEN_CLIENT_HEADERS.has(lowerName)) return true;
        return FORBIDDEN_CLIENT_HEADER_PREFIXES.some(function(prefix) {
            return lowerName.indexOf(prefix) === 0;
        });
    }

    function buildClientFetchHeaders(headers, contentType) {
        var fetchHeaders = new Headers();
        var skippedHeaders = [];
        var isMultipartFormData = contentType === 'multipart/form-data';

        Object.keys(headers || {}).forEach(function(name) {
            var value = headers[name];
            var normalizedName = String(name || '').trim().toLowerCase();
            if (isForbiddenClientHeaderName(name) || (isMultipartFormData && normalizedName === 'content-type')) {
                skippedHeaders.push(name);
                return;
            }
            if (value !== undefined && value !== null && String(value) !== '') {
                try {
                    fetchHeaders.set(name, value);
                } catch (err) {
                    skippedHeaders.push(name);
                }
            }
        });

        if (contentType && !isMultipartFormData && !fetchHeaders.has('Content-Type')) {
            fetchHeaders.set('Content-Type', contentType);
        }

        return { headers: fetchHeaders, skippedHeaders: skippedHeaders };
    }

    function headersToObject(headers) {
        var result = {};
        headers.forEach(function(value, key) {
            result[key] = value;
        });
        return result;
    }

    function getUrlOrigin(url) {
        try {
            return new URL(url, window.location.href).origin;
        } catch (err) {
            return 'Invalid URL';
        }
    }

    function inferFailureCategory(executionMode, url, err) {
        if (getUrlOrigin(url) === 'Invalid URL') return 'client-config-error';

        if (executionMode === 'client') {
            var targetUrl;
            try {
                targetUrl = new URL(url, window.location.href);
            } catch (parseErr) {
                targetUrl = null;
            }

            if (targetUrl && window.location.protocol === 'https:' && targetUrl.protocol === 'http:') {
                return 'mixed-content';
            }
            if (targetUrl && targetUrl.origin !== window.location.origin) {
                return 'browser-cors';
            }
            return 'likely-browser-restriction';
        }

        if (err && err.name === 'AbortError') return 'Backend proxy timeout or cancellation';
        return 'PostBoy backend proxy or upstream network failure';
    }

    function createClientFetchError(err, diagnostics) {
        var message = [
            'Direct client-side request failed: ' + (err && err.message ? err.message : 'Browser blocked the request.'),
            '',
            'Browser execution is subject to browser security rules. The request may be blocked by CORS, forbidden/request-controlled headers, cookie or credentials policy, mixed-content rules, redirects, Private Network Access, or other browser restrictions.',
            '',
            "Try switching the execution mode to Server proxy if you intentionally want PostBoy's server to make this request."
        ].join('\n');
        var fetchError = new Error(message);
        fetchError.cause = err;
        fetchError.postboyDiagnostics = diagnostics || {};
        return fetchError;
    }

    function buildDiagnosticsText(diagnostics) {
        diagnostics = diagnostics || {};
        var lines = ['Diagnostics:'];
        if (diagnostics.executionMode) lines.push('- Execution mode: ' + diagnostics.executionMode);
        if (diagnostics.urlOrigin) lines.push('- Requested URL origin: ' + diagnostics.urlOrigin);
        if (diagnostics.method) lines.push('- Method: ' + diagnostics.method);
        if (diagnostics.credentialsMode) lines.push('- Credentials mode: ' + diagnostics.credentialsMode);
        if (Array.isArray(diagnostics.skippedHeaders)) {
            lines.push('- Skipped browser-controlled headers: ' + (diagnostics.skippedHeaders.length ? diagnostics.skippedHeaders.join(', ') : 'None'));
        }
        if (diagnostics.failureCategory) lines.push('- Likely failure category: ' + diagnostics.failureCategory);
        return lines.join('\n');
    }

    function formatResponseHeadersWithDiagnostics(headers, diagnostics) {
        var headerText = stringifyHeadersForDisplay(headers);
        if (!diagnostics || !Array.isArray(diagnostics.skippedHeaders) || !diagnostics.skippedHeaders.length) {
            return headerText;
        }
        return (headerText ? headerText + '\n\n' : '') + buildDiagnosticsText(diagnostics);
    }

    async function sendClientRequest(payload) {
        var start = performance.now();
        var diagnostics = {
            executionMode: 'client',
            transport: 'nginx',
            urlOrigin: getUrlOrigin(payload.url),
            method: payload.method
        };

        try {
            var proxied = await fetch('/client-proxy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(buildServerProxyPayload(payload))
            });
            var data = await proxied.json();
            return {
                status: data.status,
                statusText: data.statusText || '',
                headers: data.headers || {},
                body: data.body,
                time: typeof data.time === 'number' ? data.time : Math.round(performance.now() - start),
                diagnostics: diagnostics
            };
        } catch (err) {
            diagnostics.failureCategory = 'nginx-client-proxy-failure';
            throw createClientFetchError(err, diagnostics);
        }
    }

    function buildServerProxyPayload(payload) {
        var proxyPayload = Object.assign({}, payload);
        if (payload.contentType === 'multipart/form-data') {
            delete proxyPayload.body;
            proxyPayload.formData = Array.isArray(payload.formData) ? payload.formData : [];
        }
        return proxyPayload;
    }

    async function sendDesktopNativeRequest(payload) {
        var query = {};
        try {
            var parsed = new URL(payload.url);
            parsed.searchParams.forEach(function(v, k) { query[k] = v; });
        } catch (_err) {}

        var result = await executeDesktopNativeRequest({
            method: payload.method,
            url: payload.url,
            headers: payload.headers || {},
            query: query,
            body: payload.body,
            timeoutMs: 30000,
            maxRedirects: 5,
            followRedirects: true
        });

        if (!result.ok) {
            var err = new Error(result.error && result.error.message ? result.error.message : 'Desktop native request failed');
            err.postboyDiagnostics = { executionMode: 'desktop-native', failureCategory: 'desktop-native-error' };
            throw err;
        }

        var parsedBody = result.body;
        try { parsedBody = JSON.parse(result.body); } catch (_err) {}
        return {
            status: result.status,
            statusText: result.statusText || '',
            headers: result.headers || {},
            body: parsedBody,
            time: result.durationMs,
            diagnostics: { executionMode: 'desktop-native' }
        };
    }

    async function executeRequest(payload, executionMode) {
        if (executionMode === 'client') return sendClientRequest(payload);
        if (executionMode === 'desktop-native') return sendDesktopNativeRequest(payload);
        return apiClient.sendProxyRequest(buildServerProxyPayload(payload));
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

        var state = gatherRequestState();
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
                body = replaceEnvVars(bodyContentCodeMirror ? bodyContentCodeMirror.getValue() : bodyContent.value);
                contentType = 'application/json';
            } else if (bodyType === 'text') {
                body = replaceEnvVars(bodyContentCodeMirror ? bodyContentCodeMirror.getValue() : bodyContent.value);
                contentType = 'text/plain';
            } else if (bodyType === 'xml') {
                body = replaceEnvVars(bodyContentCodeMirror ? bodyContentCodeMirror.getValue() : bodyContent.value);
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
                var fd = new FormData();
                var formData = [];
                formDataRows.querySelectorAll('.form-data-row').forEach(function(r) {
                    var k = replaceEnvVars(r.children[0].value.trim());
                    var v = replaceEnvVars(r.children[1].value);
                    if (k) {
                        fd.append(k, v);
                        formData.push({ key: k, value: v });
                    }
                });
                body = fd;
                contentType = 'multipart/form-data';
            }
        }

        var payload = { url: url, method: method, headers: headers, body: body, contentType: contentType, formData: formData || [] };
        var executionMode = getSelectedExecutionMode();

        showLoading(true);
        var start = performance.now();

        var requestSucceeded = false;
        try {
            var data = await executeRequest(payload, executionMode);

            var elapsed = Math.round(performance.now() - start);

            var sc = data.status;
            applyStatusBadge(sc, data.statusText || '');
            responseTime.textContent = elapsed + ' ms';
            responseTime.setAttribute('aria-label', 'Response time ' + elapsed + ' milliseconds');

            var raw = typeof data.body === 'object' ? JSON.stringify(data.body) : String(data.body || '');
            var sizeText = formatBytes(new Blob([raw]).size);
            responseSize.textContent = sizeText;
            responseSize.setAttribute('aria-label', 'Response size ' + sizeText);

            var responseHeadersValue = data.headers || {};
            responseHeaders.textContent = formatResponseHeadersWithDiagnostics(responseHeadersValue, data.diagnostics);

            displayResponse(data.body, responseHeadersValue);

            storeResponseOnActiveTab({
                response_status: sc,
                response_status_text: data.statusText || '',
                response_headers: formatResponseHeadersWithDiagnostics(responseHeadersValue, data.diagnostics),
                response_body: data.body,
                response_time_ms: elapsed,
                response_size: sizeText
            });

            addHistory(method, urlInput.value.trim(), sc);
            openResponseSheetForMobile();
            requestSucceeded = true;
        } catch (err) {
            var errorElapsed = Math.round(performance.now() - start);
            var errorDiagnostics = Object.assign({
                executionMode: executionMode,
                urlOrigin: getUrlOrigin(payload.url),
                method: method,
                skippedHeaders: []
            }, err.postboyDiagnostics || {});
            if (!errorDiagnostics.failureCategory) {
                errorDiagnostics.failureCategory = inferFailureCategory(executionMode, payload.url, err);
            }

            var errorBody = 'Error: ' + err.message;
            if (executionMode === 'server') {
                errorBody += '\n\nMake sure the Django/PostBoy backend is running and reachable, then check the backend logs for proxy or upstream network errors.';
            }
            var diagnosticsText = buildDiagnosticsText(errorDiagnostics);
            errorBody += '\n\n' + diagnosticsText;
            var issueVariant = getIssueVariant(errorDiagnostics.failureCategory);
            var issueDescriptor = getIssueDescriptor(issueVariant);
            applyStatusBadge('ERR', 'Error');
            responseTime.textContent = errorElapsed + ' ms';
            responseTime.setAttribute('aria-label', 'Response time ' + errorElapsed + ' milliseconds');
            responseSize.textContent = formatBytes(new Blob([errorBody]).size);
            responseSize.setAttribute('aria-label', 'Response size ' + responseSize.textContent);
            responseHeaders.textContent = diagnosticsText;
            renderResponseIssue(responseBody, {
                variant: issueVariant,
                icon: issueDescriptor.icon,
                title: issueDescriptor.title,
                message: err.message,
                likelyCause: getLikelyCauseText(errorDiagnostics),
                suggestedFix: getSuggestedFixText(errorDiagnostics, executionMode),
                detailsText: errorBody,
                cta: isRecoverableClientModeFailure(executionMode, errorDiagnostics)
                    ? { action: 'switch-to-server-proxy-retry', label: 'Switch to Server proxy and retry' }
                    : null
            });
            storeResponseOnActiveTab({
                response_status: null,
                response_status_text: 'Error',
                response_headers: responseHeaders.textContent,
                response_body: errorBody,
                response_time_ms: errorElapsed,
                response_size: responseSize.textContent
            });
        }

        showLoading(false);
        return requestSucceeded;
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
    const exampleCurlBtn = document.getElementById('exampleCurlBtn');
    const importPreview = document.getElementById('importPreview');
    const importPreviewMethod = document.getElementById('importPreviewMethod');
    const importPreviewUrl = document.getElementById('importPreviewUrl');
    const importPreviewHeaderCount = document.getElementById('importPreviewHeaderCount');
    const importPreviewBodyType = document.getElementById('importPreviewBodyType');
    const importPreviewHeaders = document.getElementById('importPreviewHeaders');
    const importPreviewBody = document.getElementById('importPreviewBody');
    const importReplaceWarning = document.getElementById('importReplaceWarning');
    const importBackBtn = document.getElementById('importBackBtn');
    const importApplyBtn = document.getElementById('importApplyBtn');

    let importedFileContent = null;
    let currentImportTab = 'text';
    let pendingCurlImport = null;
    const EXAMPLE_CURL_COMMAND = "curl -X POST https://api.example.com/users -H 'Content-Type: application/json' -H 'Authorization: Bearer demo-token' -d '{\"name\":\"Ada Lovelace\",\"role\":\"admin\"}'";

    function switchImportTab(tabName) {
        document.querySelectorAll('.import-tab').forEach(function(t) {
            t.classList.toggle('active', t.dataset.importTab === tabName);
        });
        document.querySelectorAll('.import-panel').forEach(function(p) {
            p.classList.remove('active');
        });

        currentImportTab = tabName;
        var activePanel = document.getElementById('import-' + currentImportTab + '-panel');
        if (activePanel) activePanel.classList.add('active');
        clearCurlImportPreview();
    }

    // Import tab switching
    document.querySelectorAll('.import-tab').forEach(function(tab) {
        tab.addEventListener('click', function() {
            switchImportTab(tab.dataset.importTab);
        });
    });

    if (exampleCurlBtn) {
        exampleCurlBtn.addEventListener('click', function() {
            switchImportTab('text');
            removeImportMessages();
            importInput.value = EXAMPLE_CURL_COMMAND;
            importInput.focus();
        });
    }

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
        pendingCurlImport = null;
        selectedFileName.textContent = '';
        if (importFileInput) importFileInput.value = '';
        importProgress.style.display = 'none';
        clearCurlImportPreview();
        // Remove any error/success messages
        var errors = importModal.querySelectorAll('.import-errors, .import-success, .import-warnings');
        errors.forEach(function(el) { el.remove(); });
    }

    // File upload handling
    browseFileBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        importFileInput.click();
    });

    importFileInput.addEventListener('change', function(e) {
        handleFileSelect(e.target.files[0]);
    });

    function keepDropEventInDropZone(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Drag and drop handling
    fileDropZone.addEventListener('dragenter', function(e) {
        keepDropEventInDropZone(e);
        fileDropZone.classList.add('drag-over');
    });

    fileDropZone.addEventListener('dragover', function(e) {
        keepDropEventInDropZone(e);
        fileDropZone.classList.add('drag-over');
    });

    fileDropZone.addEventListener('dragleave', function(e) {
        keepDropEventInDropZone(e);
        if (fileDropZone.contains(e.relatedTarget)) {
            return;
        }
        fileDropZone.classList.remove('drag-over');
    });

    fileDropZone.addEventListener('drop', function(e) {
        keepDropEventInDropZone(e);
        fileDropZone.classList.remove('drag-over');

        var files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });

    function handleFileSelect(file) {
        if (!file) return;

        removeImportMessages();
        clearCurlImportPreview();
        importedFileContent = null;
        selectedFileName.textContent = '';

        // Validate file type
        if (!file.name.endsWith('.json') && file.type !== 'application/json') {
            var fileTypeMessage = 'Please select a Postman collection JSON file (.json).';
            showImportError(fileTypeMessage);
            showToast(fileTypeMessage, 'error');
            return;
        }

        var fileLabel = '📄 ' + file.name + ' (' + formatByteCount(file.size) + ')';
        selectedFileName.textContent = fileLabel;

        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                importedFileContent = e.target.result;
                // Validate it's valid JSON
                JSON.parse(importedFileContent);
                showToast('File loaded: ' + file.name, 'success');
            } catch (err) {
                var invalidJsonMessage = 'Invalid Postman collection JSON: ' + err.message;
                showImportError(invalidJsonMessage);
                showToast(invalidJsonMessage, 'error');
                importedFileContent = null;
                selectedFileName.textContent = '';
            }
        };
        reader.onerror = function() {
            var readErrorMessage = 'Error reading Postman collection JSON file.';
            showImportError(readErrorMessage);
            showToast(readErrorMessage, 'error');
            importedFileContent = null;
            selectedFileName.textContent = '';
        };
        reader.readAsText(file);
    }

    // Paste cURL directly into URL input.
    urlInput.addEventListener('paste', function() {
        setTimeout(function() {
            var v = urlInput.value.trim();
            if (/^curl\s/i.test(v)) {
                importCurl(v);
            }
        }, 50);
    });

    function removeImportMessages() {
        var prevMessages = importModal.querySelectorAll('.import-errors, .import-success, .import-warnings');
        prevMessages.forEach(function(el) { el.remove(); });
    }

    function clearCurlImportPreview() {
        pendingCurlImport = null;
        if (importPreview) importPreview.style.display = 'none';
        if (importPreviewMethod) importPreviewMethod.textContent = '—';
        if (importPreviewUrl) importPreviewUrl.textContent = '—';
        if (importPreviewHeaderCount) importPreviewHeaderCount.textContent = '0';
        if (importPreviewBodyType) importPreviewBodyType.textContent = 'none';
        if (importPreviewHeaders) importPreviewHeaders.innerHTML = '';
        if (importPreviewBody) importPreviewBody.textContent = 'No body detected.';
        if (importReplaceWarning) importReplaceWarning.style.display = 'none';
        if (importBackBtn) importBackBtn.style.display = 'none';
        if (importApplyBtn) importApplyBtn.style.display = 'none';
        if (importConfirmBtn) importConfirmBtn.style.display = '';
        document.querySelectorAll('.import-panel').forEach(function(panel) {
            panel.classList.toggle('import-panel-previewing', false);
        });
    }

    function getActiveTab() {
        return openTabs.find(function(t) { return t.id === activeTabId; }) || null;
    }

    function editorHasReplacementValues() {
        var state = gatherRequestState();
        var hasHeaders = Array.isArray(state.headers) && state.headers.length > 0;
        var hasBody = state.body_type !== 'none' && (
            (state.body_content && state.body_content.trim()) ||
            (Array.isArray(state.form_data) && state.form_data.length > 0)
        );
        return !!(
            (state.url && state.url.trim()) ||
            state.method !== 'GET' ||
            hasHeaders ||
            hasBody ||
            state.auth_type !== 'none'
        );
    }

    function importWillReplaceUnsavedValues() {
        var tab = getActiveTab();
        if (tab && tab.unsaved) return true;
        if (!tab || !tab.requestId) return editorHasReplacementValues();
        return false;
    }

    function formatImportPreviewBody(parsed) {
        if (parsed.body_type === 'form-data' || parsed.body_type === 'form-urlencoded') {
            if (!parsed.form_data || !parsed.form_data.length) return parsed.body_content || 'No body detected.';
            return parsed.form_data.map(function(field) {
                return (field.key || '') + '=' + (field.value || '');
            }).join('\n');
        }
        return parsed.body_content || 'No body detected.';
    }

    function showCurlImportPreview(payload) {
        var parsed = normalizeParsedImportPayload(payload);
        if (!parsed.url || !String(parsed.url).trim()) {
            throw new Error('The cURL command must include a URL before it can be imported.');
        }

        pendingCurlImport = {
            parsed: parsed,
            warnings: Array.isArray(payload && payload.warnings) ? payload.warnings : []
        };

        importPreviewMethod.textContent = parsed.method || 'GET';
        importPreviewUrl.textContent = parsed.url || '—';
        importPreviewHeaderCount.textContent = String(parsed.headers.length) + (parsed.headers.length === 1 ? ' header' : ' headers');
        importPreviewBodyType.textContent = parsed.body_type || 'none';

        importPreviewHeaders.innerHTML = '';
        if (parsed.headers.length) {
            parsed.headers.forEach(function(header) {
                var item = document.createElement('li');
                item.textContent = (header.key || '') + ': ' + (header.value || '');
                importPreviewHeaders.appendChild(item);
            });
        } else {
            var emptyItem = document.createElement('li');
            emptyItem.className = 'import-preview-empty';
            emptyItem.textContent = 'No headers detected.';
            importPreviewHeaders.appendChild(emptyItem);
        }

        var bodyPreview = formatImportPreviewBody(parsed);
        importPreviewBody.textContent = bodyPreview.length > 1200 ? bodyPreview.substring(0, 1200) + '\n…' : bodyPreview;

        var replaceWarning = importWillReplaceUnsavedValues();
        importReplaceWarning.style.display = replaceWarning ? '' : 'none';
        importPreview.style.display = 'block';
        importConfirmBtn.style.display = 'none';
        importBackBtn.style.display = '';
        importApplyBtn.style.display = '';
        document.querySelectorAll('.import-panel').forEach(function(panel) {
            panel.classList.toggle('import-panel-previewing', true);
        });

        if (pendingCurlImport.warnings.length) showImportWarning(pendingCurlImport.warnings);
    }

    function backToCurlImportEditor() {
        clearCurlImportPreview();
        removeImportMessages();
    }

    function applyPendingCurlImport() {
        if (!pendingCurlImport) {
            showImportError('Parse a cURL command before applying the import.');
            return;
        }
        if (importWillReplaceUnsavedValues() && !window.confirm('Applying this cURL import will replace current unsaved editor values. Continue?')) {
            return;
        }

        applyParsedImportToEditor(pendingCurlImport.parsed);
        showToast('cURL imported into editor', pendingCurlImport.warnings.length ? 'warning' : 'success');
        importModal.classList.remove('active');
        resetImportModal();
    }

    if (importBackBtn) importBackBtn.addEventListener('click', backToCurlImportEditor);
    if (importApplyBtn) importApplyBtn.addEventListener('click', applyPendingCurlImport);

    // Import confirmation handler - ENHANCED
    importConfirmBtn.addEventListener('click', async function() {
        var raw = '';
        var isFileImport = false;

        removeImportMessages();

        if (currentImportTab === 'file') {
            if (!importedFileContent) {
                var noFileMessage = 'Please select a Postman collection JSON file first.';
                showImportError(noFileMessage);
                showToast(noFileMessage, 'error');
                return;
            }
            raw = importedFileContent;
            isFileImport = true;
        } else {
            raw = importInput.value.trim();
            if (!raw) {
                var noTextMessage = 'Please paste a Postman collection JSON or cURL command to import.';
                showImportError(noTextMessage);
                showToast(noTextMessage, 'error');
                return;
            }
        }

        // Show loading
        importProgress.style.display = 'flex';
        importConfirmBtn.disabled = true;

        // Remove previous preview state
        clearCurlImportPreview();

        try {
            if (raw.charAt(0) === '{' || raw.charAt(0) === '[') {
                // Postman collection JSON — send to server for DB import
                var data;
                try {
                    data = JSON.parse(raw);
                } catch (parseErr) {
                    throw new Error('Invalid Postman collection JSON format: ' + parseErr.message);
                }

                // Validate Postman format
                if (!data.info && !Array.isArray(data) && !data.item) {
                    throw new Error('This Postman collection JSON does not appear to be a valid Postman collection.');
                }

                await apiClient.importData({ type: 'postman', data: data });
                showImportSuccess('Postman collection imported successfully!');
                loadCollections();
                // Close modal after short delay
                setTimeout(function() {
                    importModal.classList.remove('active');
                    resetImportModal();
                }, 1500);
            } else if (/^curl\s/i.test(raw)) {
                // cURL — parse on server and preview before applying to editor
                try {
                    var parsed = await apiClient.importData({ type: 'curl', data: raw });
                    showCurlImportPreview(parsed);
                    showImportSuccess('Review the cURL import preview, then choose Apply import or Back/Edit.');
                } catch (e) {
                    if (hasStructuredImportErrors(e)) {
                        showImportError(getImportErrorMessages(e));
                        return;
                    }

                    // Fallback: parse locally when the server parser is unavailable.
                    console.warn('Server cURL parse failed, using local parser:', e);
                    previewCurlLocal(raw, { showModalWarning: true });
                }
            } else {
                showImportError('Unrecognized format. Please paste a valid Postman collection JSON or cURL command.');
            }
        } catch (err) {
            console.error('Import error:', err);
            showImportError(err.message || 'Import failed');
        } finally {
            importProgress.style.display = 'none';
            importConfirmBtn.disabled = false;
        }
    });

    function addImportMessage(messageDiv) {
        var actionButtons = importModal.querySelector('.import-action-buttons');
        if (actionButtons && actionButtons.parentNode) {
            actionButtons.parentNode.insertBefore(messageDiv, actionButtons);
        } else {
            importConfirmBtn.parentNode.insertBefore(messageDiv, importConfirmBtn);
        }
    }

    function showImportError(message) {
        importModal.querySelectorAll('.import-errors').forEach(function(el) { el.remove(); });
        var messages = Array.isArray(message) ? message : [message];
        var errorDiv = document.createElement('div');
        errorDiv.className = 'import-errors';
        errorDiv.innerHTML = '<h4>⚠️ Import Error</h4>' + formatImportMessages(messages);
        addImportMessage(errorDiv);
    }

    function showImportWarning(message) {
        var messages = Array.isArray(message) ? message : [message];
        var warningDiv = document.createElement('div');
        warningDiv.className = 'import-warnings';
        warningDiv.innerHTML = '<h4>⚠️ Import Warning</h4>' + formatImportMessages(messages);
        addImportMessage(warningDiv);
    }

    function formatImportMessages(messages) {
        if (messages.length > 1) {
            return '<ul>' + messages.map(function(message) {
                return '<li>' + escHtml(importIssueMessage(message)) + '</li>';
            }).join('') + '</ul>';
        }
        return '<p>' + escHtml(importIssueMessage(messages[0])) + '</p>';
    }

    function importIssueMessage(issue) {
        if (!issue) return 'Import failed';
        if (typeof issue === 'string') return issue;
        return issue.message || issue.error || 'Import failed';
    }

    function hasStructuredImportErrors(err) {
        return !!(err && err.payload && Array.isArray(err.payload.errors) && err.payload.errors.length);
    }

    function getImportErrorMessages(err) {
        if (hasStructuredImportErrors(err)) return err.payload.errors;
        return [(err && err.message) || 'Import failed'];
    }

    function showImportSuccess(message) {
        var successDiv = document.createElement('div');
        successDiv.className = 'import-success';
        successDiv.innerHTML = '<h4>✅ Success</h4><p>' + escHtml(message) + '</p>';
        addImportMessage(successDiv);
    }

    async function importCurl(cmd) {
        try {
            var parsed = await apiClient.importData({ type: 'curl', data: cmd });
            applyParsedImportToEditor(parsed);
            if (parsed.warnings && parsed.warnings.length) {
                showToast(importIssueMessage(parsed.warnings[0]), 'warning');
            } else {
                showToast('cURL command parsed successfully', 'success');
            }
        } catch (e) {
            if (hasStructuredImportErrors(e)) {
                showToast(importIssueMessage(e.payload.errors[0]), 'error');
                return;
            }
            console.warn('Server cURL parse failed, using local parser:', e);
            importCurlLocal(cmd, { showToastWarning: true });
        }
    }

    function previewCurlLocal(cmd, options) {
        options = options || {};
        try {
            var parsed = parseCurlFallback(cmd);
            parsed.warnings = ['Using the local fallback cURL parser. Import accuracy may be limited.'];
            showCurlImportPreview(parsed);
            showImportSuccess('Review the cURL import preview, then choose Apply import or Back/Edit.');
        } catch (err) {
            console.error('cURL parse error:', err);
            if (options.showModalWarning) showImportError(err.message || 'Failed to parse cURL command');
            showToast('Failed to parse cURL command', 'error');
        }
    }

    function importCurlLocal(cmd, options) {
        options = options || {};
        try {
            var parsed = parseCurlFallback(cmd);
            if (!parsed.url || !String(parsed.url).trim()) {
                throw new Error('The cURL command must include a URL before it can be imported.');
            }
            applyParsedImportToEditor(parsed);
            var warning = 'Using the local fallback cURL parser. Import accuracy may be limited.';
            if (options.showModalWarning) {
                showImportWarning(warning);
                showImportSuccess('cURL imported into editor. Review the warning details before continuing.');
            }
            showToast(options.showToastWarning ? warning : 'cURL command parsed locally', options.showToastWarning ? 'warning' : 'success');
        } catch (err) {
            console.error('cURL parse error:', err);
            if (options.showModalWarning) showImportError(err.message || 'Failed to parse cURL command');
            showToast('Failed to parse cURL command', 'error');
        }
    }

    // ═══════════════════════════════════════════════════════
    //  EXPORT cURL
    // ═══════════════════════════════════════════════════════

    function buildCurlCommand() {
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
                var b = (bodyContentCodeMirror ? bodyContentCodeMirror.getValue() : bodyContent.value).trim();
                if (b) parts.push("-d '" + b.replace(/'/g, "\\'") + "'");
            } else if (bodyType === 'form-urlencoded' || bodyType === 'form-data') {
                var fdParts = [];
                formDataRows.querySelectorAll('.form-data-row').forEach(function(r) {
                    var fk = r.children[0].value.trim();
                    var fv = r.children[1].value;
                    if (fk) {
                        if (bodyType === 'form-data') {
                            parts.push("-F '" + (fk + '=' + fv).replace(/'/g, "\\'") + "'");
                        } else {
                            fdParts.push(encodeURIComponent(fk) + '=' + encodeURIComponent(fv));
                        }
                    }
                });
                if (bodyType === 'form-urlencoded' && fdParts.length) parts.push("-d '" + fdParts.join('&') + "'");
            }
        }

        return parts.join(' \\' + '\n  ');
    }

    function updateSidebarCurlOutput() {
        if (!sidebarCurlOutput) return;
        var url = (urlInput && urlInput.value ? urlInput.value : '').trim();
        if (!url) {
            sidebarCurlOutput.value = '';
            return;
        }
        sidebarCurlOutput.value = buildCurlCommand();
    }

    function scheduleSidebarCurlUpdate(delayMs) {
        if (!sidebarCurlOutput) return;
        var wait = typeof delayMs === 'number' ? delayMs : 150;
        if (sidebarCurlUpdateTimer) window.clearTimeout(sidebarCurlUpdateTimer);
        sidebarCurlUpdateTimer = window.setTimeout(function() {
            sidebarCurlUpdateTimer = null;
            updateSidebarCurlOutput();
        }, wait);
    }

    if (exportCurlBtn) {
        exportCurlBtn.addEventListener('click', function() {
            updateSidebarCurlOutput();
            exportOutput.value = (urlInput.value || '').trim() ? buildCurlCommand() : '';
            if (sidebarCurlOutput) sidebarCurlOutput.value = exportOutput.value;
            exportModal.classList.add('active');
        });
    }

    if (generateSidebarCurlBtn) {
        generateSidebarCurlBtn.addEventListener('click', function() {
            updateSidebarCurlOutput();
            showToast('cURL output generated', 'success');
        });
    }

    if (copySidebarCurlBtn) {
        copySidebarCurlBtn.addEventListener('click', function() {
            updateSidebarCurlOutput();
            sidebarCurlOutput.select();
            document.execCommand('copy');
            showToast('Copied to clipboard', 'success');
        });
    }

    if (exportModalClose) exportModalClose.addEventListener('click', function() { exportModal.classList.remove('active'); });
    if (copyExportBtn) {
        copyExportBtn.addEventListener('click', function() {
            exportOutput.select();
            document.execCommand('copy');
            showToast('Copied to clipboard', 'success');
        });
    }

    function closeSnapshotNameModal(result) {
        if (!snapshotNameModal || !pendingSnapshotNameResolver) return;
        var resolver = pendingSnapshotNameResolver;
        pendingSnapshotNameResolver = null;
        snapshotNameModal.classList.remove('active');
        resolver(result);
    }

    function promptSnapshotName(defaultName, modalTitle) {
        if (!snapshotNameModal || !snapshotNameInput || !snapshotNameModalTitle) {
            var promptedName = window.prompt('Snapshot name', defaultName);
            if (promptedName === null) return Promise.resolve(null);
            return Promise.resolve(promptedName.trim());
        }
        snapshotNameModalTitle.textContent = modalTitle || 'Snapshot name';
        snapshotNameInput.value = defaultName || '';
        snapshotNameModal.classList.add('active');
        setTimeout(function() {
            snapshotNameInput.focus();
            snapshotNameInput.select();
        }, 0);
        return new Promise(function(resolve) {
            pendingSnapshotNameResolver = resolve;
        });
    }

    if (snapshotNameSaveBtn) {
        snapshotNameSaveBtn.addEventListener('click', function() {
            closeSnapshotNameModal((snapshotNameInput.value || '').trim());
        });
    }
    if (snapshotNameCancelBtn) snapshotNameCancelBtn.addEventListener('click', function() { closeSnapshotNameModal(null); });
    if (snapshotNameModalClose) snapshotNameModalClose.addEventListener('click', function() { closeSnapshotNameModal(null); });
    if (snapshotNameModal) {
        snapshotNameModal.addEventListener('click', function(e) {
            if (e.target === snapshotNameModal) closeSnapshotNameModal(null);
        });
    }
    if (snapshotNameInput) {
        snapshotNameInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                closeSnapshotNameModal((snapshotNameInput.value || '').trim());
            } else if (e.key === 'Escape') {
                e.preventDefault();
                closeSnapshotNameModal(null);
            }
        });
    }

    // ═══════════════════════════════════════════════════════
    //  RESPONSE DISPLAY
    // ═══════════════════════════════════════════════════════

    copyResponseBtn.addEventListener('click', function() {
        var text = responseBody.dataset.rawBody || responseBody.textContent;
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function() {
                showToast('Response copied', 'success');
            }).catch(function() {
                showToast('Copy failed', 'error');
            });
        }
    });

    function displayResponse(body, headers) {
        renderResponseBody(responseBody, body, headers);
    }

    function syntaxHighlight(json) {
        return highlightJson(json);
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


    function getStatusDisplay(code, statusText) {
        if (code === 'ERR') return { icon: '⛔', label: 'Error', css: 's5xx' };
        var css = getStatusClass(code);
        if (css === 's2xx') return { icon: '✅', label: 'Success', css: css };
        if (css === 's3xx') return { icon: '↪', label: 'Redirect', css: css };
        if (css === 's4xx') return { icon: '⚠️', label: 'Client Error', css: css };
        if (css === 's5xx') return { icon: '⛔', label: 'Server Error', css: css };
        if (code != null && code !== '') return { icon: 'ℹ️', label: statusText || 'Unknown', css: '' };
        return { icon: '❔', label: 'Unknown', css: '' };
    }

    function applyStatusBadge(code, statusText) {
        var hasCode = code != null && code !== '';
        var numericCode = hasCode ? String(code) : '---';
        var display = getStatusDisplay(code, statusText);
        statusCode.innerHTML = '<span class="status-badge-prefix">' + display.icon + ' ' + display.label + '</span><span aria-hidden="true"> · </span>' + numericCode;
        statusCode.dataset.statusText = statusText || '';
        statusCode.className = display.css ? 'status-badge ' + display.css : 'status-badge';
        statusCode.setAttribute('aria-label', 'Response status ' + numericCode + ' ' + display.label);
    }
    function formatBytes(bytes) {
        return formatByteCount(bytes);
    }

    function getIssueVariant(failureCategory) {
        if (failureCategory === 'upstream-http-error') return 'warning';
        if (failureCategory === 'client-config-error') return 'info';
        return 'error';
    }

    function getIssueDescriptor(variant) {
        if (variant === 'warning') return { icon: '⚠️', title: 'Upstream service returned an HTTP error' };
        if (variant === 'info') return { icon: 'ℹ️', title: 'Request setup issue detected' };
        return { icon: '⛔', title: 'Request execution failed' };
    }

    function getLikelyCauseText(diagnostics) {
        var category = diagnostics && diagnostics.failureCategory;
        if (category === 'server-unreachable') return 'The backend is unavailable or cannot reach the target host.';
        if (category === 'browser-cors') return 'The browser blocked this request because of CORS restrictions.';
        if (category === 'network-failure') return 'A network interruption prevented the request from completing.';
        if (category === 'mixed-content') return 'The browser blocked an insecure (HTTP) request from a secure (HTTPS) context.';
        if (category === 'likely-browser-restriction') return 'The browser blocked the request due to client-side network/security restrictions.';
        if (category === 'upstream-http-error') return 'The destination API responded with an HTTP error status.';
        if (category === 'client-config-error') return 'The URL, headers, auth, or request body appears misconfigured.';
        return 'An execution or connectivity issue interrupted the request.';
    }

    function getSuggestedFixText(diagnostics, executionMode) {
        var category = diagnostics && diagnostics.failureCategory;
        if (category === 'browser-cors') return 'Use server mode or allow this origin on the destination API.';
        if (category === 'server-unreachable') return 'Start or restart the backend service and verify target connectivity.';
        if (category === 'client-config-error') return 'Review URL formatting, auth values, headers, and payload fields.';
        if (category === 'upstream-http-error') return 'Inspect API error details and adjust credentials or request data.';
        if (executionMode === 'server') return 'Check backend logs for proxy/upstream failures, then retry.';
        return 'Retry the request after reviewing the diagnostics in Details.';
    }

    function escHtml(str) {
        return escapeHtml(str);
    }

});
