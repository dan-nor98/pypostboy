import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ChevronDown, Search, Settings} from 'lucide-react';
import {
  ActivityBar,
  Button,
  CodeEditor,
  CommandPalette,
  EditableGrid,
  IconButton,
  ImportCurlDialog,
  RequestTabs,
  requestPanelId,
  requestTabId,
  RequestToolbar,
  ResponseViewer,
  Sidebar,
  StatusBar,
} from './components';
import {apiClient} from './api/client';
import {params} from './data/demoWorkspace';
import './styles.css';

const defaultRequest = {
  method: 'GET',
  url: '',
  name: 'Untitled Request',
  headers: [],
  body_content: '',
  body_raw_type: 'application/json',
};

function flattenRequests(collections) {
  return collections.flatMap((collection) => [
    ...(collection.requests || []),
    ...flattenRequests(collection.children || []),
  ]);
}

function updateRequestInCollections(collections, requestId, nextRequest) {
  return collections.map((collection) => ({
    ...collection,
    requests: (collection.requests || []).map((request) => (request.id === requestId ? {...request, ...nextRequest} : request)),
    children: updateRequestInCollections(collection.children || [], requestId, nextRequest),
  }));
}

function headersArrayToObject(headers = []) {
  return headers.reduce((result, header) => {
    if (Array.isArray(header)) {
      const [enabled, key, value] = header.length > 2 ? header : ['✓', header[0], header[1]];
      if (enabled && key) result[key] = value;
      return result;
    }
    if (header?.enabled !== false && header?.key) result[header.key] = header.value || '';
    return result;
  }, {});
}

export function App() {
  const [palette, setPalette] = useState(false);
  const [importCurlOpen, setImportCurlOpen] = useState(false);
  const [theme, setTheme] = useState('dark');
  const [sending, setSending] = useState(false);
  const [collections, setCollections] = useState([]);
  const [collectionsLoading, setCollectionsLoading] = useState(true);
  const [collectionsError, setCollectionsError] = useState('');
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [proxyResult, setProxyResult] = useState(null);
  const [proxyError, setProxyError] = useState('');
  const [draftBodies, setDraftBodies] = useState({});
  const [requestDrafts, setRequestDrafts] = useState({});
  const [savingRequest, setSavingRequest] = useState(false);
  const [activeConfigTab, setActiveConfigTab] = useState('params');
  const configTabRefs = useRef({});
  const paletteTriggerRef = useRef(null);

  const refreshCollections = useCallback(async (preferredRequestId = null) => {
    setCollectionsLoading(true);
    setCollectionsError('');
    try {
      const data = await apiClient.listCollections();
      setCollections(data);
      const nextRequestId = preferredRequestId || activeRequestId || flattenRequests(data)[0]?.id || null;
      setActiveRequestId(nextRequestId);
      return data;
    } catch (error) {
      setCollectionsError(error.message);
      return null;
    } finally {
      setCollectionsLoading(false);
    }
  }, [activeRequestId]);

  const handleImportedRequestCreated = useCallback(async (createdRequest) => {
    await refreshCollections(createdRequest?.id || null);
  }, [refreshCollections]);

  const closePalette = useCallback(() => {
    setPalette(false);
    requestAnimationFrame(() => paletteTriggerRef.current?.focus());
  }, []);

  const openPalette = useCallback(() => {
    paletteTriggerRef.current = document.activeElement;
    setPalette(true);
  }, []);

  const togglePalette = useCallback(() => {
    if (palette) {
      closePalette();
    } else {
      openPalette();
    }
  }, [closePalette, openPalette, palette]);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCollections() {
      setCollectionsLoading(true);
      setCollectionsError('');
      try {
        const data = await apiClient.listCollections();
        if (!cancelled) {
          setCollections(data);
          setActiveRequestId((current) => current || flattenRequests(data)[0]?.id || null);
        }
      } catch (error) {
        if (!cancelled) setCollectionsError(error.message);
      } finally {
        if (!cancelled) setCollectionsLoading(false);
      }
    }
    loadCollections();
    return () => { cancelled = true; };
  }, []);

  const requests = useMemo(() => flattenRequests(collections), [collections]);
  const activeRequest = requests.find((request) => request.id === activeRequestId) || requests[0] || defaultRequest;
  const activeRequestDraft = requestDrafts[activeRequest.id] || {};
  const editableRequest = {
    ...activeRequest,
    method: activeRequestDraft.method ?? activeRequest.method ?? 'GET',
    url: activeRequestDraft.url ?? activeRequest.url ?? '',
  };
  const requestBody = draftBodies[activeRequest.id] ?? activeRequest.body_content ?? activeRequest.body_raw ?? '';
  const requestConfigTabs = useMemo(() => [
    {id: 'params', label: 'Params'},
    {id: 'authorization', label: 'Authorization'},
    {id: 'headers', label: 'Headers'},
    {id: 'body', label: 'Body'},
    {id: 'scripts', label: 'Scripts'},
    {id: 'tests', label: 'Tests'},
  ], []);

  const selectConfigTab = useCallback((tabId, shouldFocus = false) => {
    setActiveConfigTab(tabId);
    if (shouldFocus) {
      requestAnimationFrame(() => configTabRefs.current[tabId]?.focus());
    }
  }, []);

  const handleConfigTabKeyDown = useCallback((event) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;

    event.preventDefault();
    const currentIndex = requestConfigTabs.findIndex((tab) => tab.id === activeConfigTab);
    const offset = event.key === 'ArrowRight' ? 1 : -1;
    const nextIndex = (currentIndex + offset + requestConfigTabs.length) % requestConfigTabs.length;
    selectConfigTab(requestConfigTabs[nextIndex].id, true);
  }, [activeConfigTab, requestConfigTabs, selectConfigTab]);

  const sendRequest = useCallback(async () => {
    if (!editableRequest.url) {
      setProxyError('Select a request with a URL before sending.');
      return;
    }

    setSending(true);
    setProxyError('');
    setProxyResult(null);
    try {
      const result = await apiClient.proxyRequest({
        method: editableRequest.method || 'GET',
        url: editableRequest.url,
        headers: headersArrayToObject(activeRequest.headers),
        body: requestBody,
        contentType: activeRequest.body_raw_type || 'application/json',
      });
      setProxyResult(result);
    } catch (error) {
      setProxyError(error.message);
    } finally {
      setSending(false);
    }
  }, [activeRequest, editableRequest, requestBody]);


  const updateRequestDraft = useCallback((field, value) => {
    setRequestDrafts((drafts) => ({
      ...drafts,
      [activeRequest.id]: {
        ...drafts[activeRequest.id],
        [field]: value,
      },
    }));
  }, [activeRequest.id]);

  const saveRequest = useCallback(async () => {
    if (!activeRequest.id || !editableRequest.url) return;

    setSavingRequest(true);
    setProxyError('');
    try {
      const payload = {
        ...activeRequest,
        method: editableRequest.method || 'GET',
        url: editableRequest.url,
        body_content: requestBody,
      };
      const savedRequest = await apiClient.updateRequest(activeRequest.id, payload);
      const nextRequest = savedRequest || payload;
      setCollections((currentCollections) => updateRequestInCollections(currentCollections, activeRequest.id, nextRequest));
      setRequestDrafts((drafts) => {
        const {[activeRequest.id]: _savedDraft, ...remainingDrafts} = drafts;
        return remainingDrafts;
      });
      setDraftBodies((drafts) => {
        const {[activeRequest.id]: _savedBody, ...remainingDrafts} = drafts;
        return remainingDrafts;
      });
    } catch (error) {
      setProxyError(error.message);
    } finally {
      setSavingRequest(false);
    }
  }, [activeRequest, editableRequest, requestBody]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;

    const handleKeyDown = (event) => {
      const meta = event.metaKey || event.ctrlKey;

      if (meta && event.key === 'Enter') {
        event.preventDefault();
        sendRequest();
      }

      if (meta && event.shiftKey && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        togglePalette();
      }

      if (meta && event.key === ',') {
        event.preventDefault();
        toggleTheme();
      }
    };

    addEventListener('keydown', handleKeyDown);
    return () => removeEventListener('keydown', handleKeyDown);
  }, [sendRequest, togglePalette, toggleTheme]);


  return (
    <div className="app-shell">
      <header className="header">
        <strong className="brand">PostBoy</strong>
        <button className="selector">Workspace: Local API <ChevronDown size={13} /></button>
        <button className="selector">Environment: Local <ChevronDown size={13} /></button>
        <div className="global-search"><Search size={14} /><input placeholder="Search requests, URLs, headers (Ctrl+Shift+F)" /></div>
        <Button kind="ghost" onClick={openPalette}>Command Palette <kbd>Ctrl⇧P</kbd></Button>
        <IconButton
          label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme Ctrl+,`}
          aria-pressed={theme === 'light'}
          onClick={toggleTheme}
        >
          <Settings size={16} />
        </IconButton>
      </header>

      <main className="workspace">
        <ActivityBar />
        <Sidebar
          collections={collections}
          loading={collectionsLoading}
          error={collectionsError}
          activeRequestId={activeRequest.id}
          onSelectRequest={setActiveRequestId}
          onImportCurl={() => setImportCurlOpen(true)}
        />
        <section className="main">
          <RequestTabs requests={requests} activeRequestId={activeRequest.id} onSelectRequest={setActiveRequestId} loading={collectionsLoading} error={collectionsError} />
          <div
            id={requestPanelId(activeRequest.id)}
            role="tabpanel"
            aria-labelledby={requestTabId(activeRequest.id)}
            className="request-panel"
          >
            <RequestToolbar
              sending={sending}
              onSend={sendRequest}
              request={editableRequest}
              disabled={!editableRequest.url}
              onMethodChange={(method) => updateRequestDraft('method', method)}
              onUrlChange={(url) => updateRequestDraft('url', url)}
              onSave={saveRequest}
              saving={savingRequest}
              saveDisabled={!activeRequest.id || !editableRequest.url}
            />
            <div className="panel-tabs" role="tablist" aria-label="Request configuration tabs" onKeyDown={handleConfigTabKeyDown}>
              {requestConfigTabs.map((tab) => {
                const selected = activeConfigTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`request-config-tab-${tab.id}`}
                    ref={(element) => { configTabRefs.current[tab.id] = element; }}
                    role="tab"
                    type="button"
                    aria-selected={selected}
                    aria-controls={`request-config-panel-${tab.id}`}
                    tabIndex={selected ? 0 : -1}
                    className={selected ? 'active' : undefined}
                    onClick={() => selectConfigTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                );
              })}
              {collectionsError && <span className="inline-error">{collectionsError}</span>}
            </div>
            <div
              className="request-grid"
              id="request-config-panel-params"
              role="tabpanel"
              aria-labelledby="request-config-tab-params"
              hidden={activeConfigTab !== 'params'}
            >
              <section>
                <div className="section-head"><span>Query Parameters</span><button>Bulk Edit</button></div>
                {requests.length ? <EditableGrid rows={params} type="parameter" /> : <div className="empty-state">No requests yet. Create or import a request to begin.</div>}
              </section>
              <aside className="inspector">
                <h3>Request</h3>
                <p className="mono variable">{activeRequest.name}</p>
                <p>{editableRequest.method} {editableRequest.url || 'No URL configured'}</p>
                <h3>Headers</h3>
                {(activeRequest.headers || []).length ? <p>{activeRequest.headers.length} configured headers</p> : <p className="hint">No headers configured.</p>}
              </aside>
            </div>
            <div
              className="request-grid"
              id="request-config-panel-body"
              role="tabpanel"
              aria-labelledby="request-config-tab-body"
              hidden={activeConfigTab !== 'body'}
            >
              <section>
                <div className="section-head"><span>Request Body</span></div>
                <CodeEditor
                  value={requestBody}
                  onChange={(nextBody) => setDraftBodies((drafts) => ({...drafts, [activeRequest.id]: nextBody}))}
                  wordWrap
                  label="Request JSON body editor"
                />
              </section>
              <aside className="inspector">
                <h3>Body</h3>
                <p className="hint">Editing {activeRequest.body_raw_type || 'application/json'} content for this request.</p>
              </aside>
            </div>
            {requestConfigTabs
              .filter((tab) => !['params', 'body'].includes(tab.id))
              .map((tab) => (
                <div
                  key={tab.id}
                  id={`request-config-panel-${tab.id}`}
                  role="tabpanel"
                  aria-labelledby={`request-config-tab-${tab.id}`}
                  hidden={activeConfigTab !== tab.id}
                />
              ))}
          </div>
          <div className="divider" />
          <ResponseViewer response={proxyResult} loading={sending} error={proxyError} />
        </section>
      </main>

      <StatusBar />
      {palette && <CommandPalette onClose={closePalette} onImportCurl={() => { closePalette(); setImportCurlOpen(true); }} />}
      {importCurlOpen && <ImportCurlDialog collections={collections} onClose={() => setImportCurlOpen(false)} onCreated={handleImportedRequestCreated} />}
      {proxyError && <div className="toast error" role="status">{proxyError}</div>}
    </div>
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(<App />);
}
