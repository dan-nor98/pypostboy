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
  const paletteTriggerRef = useRef(null);


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
            <div className="panel-tabs" role="tablist" aria-label="Request configuration tabs">
              <button id="request-config-tab-params" role="tab" type="button" aria-selected="true" aria-controls="request-config-panel-params" className="active">Params</button><button id="request-config-tab-authorization" role="tab" type="button" aria-selected="false" aria-controls="request-config-panel-authorization" tabIndex={-1}>Authorization</button><button id="request-config-tab-headers" role="tab" type="button" aria-selected="false" aria-controls="request-config-panel-headers" tabIndex={-1}>Headers</button><button id="request-config-tab-body" role="tab" type="button" aria-selected="false" aria-controls="request-config-panel-body" tabIndex={-1}>Body</button><button id="request-config-tab-scripts" role="tab" type="button" aria-selected="false" aria-controls="request-config-panel-scripts" tabIndex={-1}>Scripts</button><button id="request-config-tab-tests" role="tab" type="button" aria-selected="false" aria-controls="request-config-panel-tests" tabIndex={-1}>Tests</button>
              {collectionsError && <span className="inline-error">{collectionsError}</span>}
            </div>
          <div className="request-grid" id="request-config-panel-params" role="tabpanel" aria-labelledby="request-config-tab-params">
            <section>
              <div className="section-head"><span>Query Parameters</span><button>Bulk Edit</button></div>
              {requests.length ? <EditableGrid rows={params} type="parameter" /> : <div className="empty-state">No requests yet. Create or import a request to begin.</div>}
              <CodeEditor
                value={requestBody}
                onChange={(nextBody) => setDraftBodies((drafts) => ({...drafts, [activeRequest.id]: nextBody}))}
                wordWrap
                label="Request JSON body editor"
              />
            </section>
            <aside className="inspector">
              <h3>Request</h3>
              <p className="mono variable">{activeRequest.name}</p>
              <p>{editableRequest.method} {editableRequest.url || 'No URL configured'}</p>
              <h3>Headers</h3>
              {(activeRequest.headers || []).length ? <p>{activeRequest.headers.length} configured headers</p> : <p className="hint">No headers configured.</p>}
            </aside>
          </div>
            {['authorization', 'headers', 'body', 'scripts', 'tests'].map((tab) => (
              <div key={tab} id={`request-config-panel-${tab}`} role="tabpanel" aria-labelledby={`request-config-tab-${tab}`} hidden />
            ))}
          </div>
          <div className="divider" />
          <ResponseViewer response={proxyResult} loading={sending} error={proxyError} />
        </section>
      </main>

      <StatusBar />
      {palette && <CommandPalette onClose={closePalette} />}
      {proxyError && <div className="toast error" role="status">{proxyError}</div>}
    </div>
  );
}

const rootElement = document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(<App />);
}
